import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';

const execFileAsync = promisify(execFile);

function assertInitSecret(secret: unknown) {
  const expected = process.env.INIT_DB_SECRET;
  if (!expected || expected.length < 16) {
    throw new AppError(
      'INIT_DISABLED',
      'INIT_DB_SECRET не задан на сервере (минимум 16 символов)',
      503
    );
  }
  if (typeof secret !== 'string' || secret !== expected) {
    throw new AppError('FORBIDDEN', 'Неверный secret', 403);
  }
}

function exists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/** Writable dirs for Vercel sandbox (no real $HOME like /home/sbx_user*). */
function sandboxEnv(): NodeJS.ProcessEnv {
  const tmp = process.env.TMPDIR || process.env.TEMP || os.tmpdir() || '/tmp';
  return {
    ...process.env,
    HOME: tmp,
    USERPROFILE: tmp,
    TMPDIR: tmp,
    TEMP: tmp,
    TMP: tmp,
    npm_config_cache: path.join(tmp, 'npm-cache'),
    npm_config_prefix: tmp,
    PRISMA_CLI_QUERY_ENGINE_TYPE: process.env.PRISMA_CLI_QUERY_ENGINE_TYPE ?? 'library',
    // Never phone home / download engines in serverless
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1',
  };
}

function resolveSchemaPath(cwd: string): string | null {
  const candidates = [
    path.join(cwd, 'server', 'prisma', 'schema.prisma'),
    path.join(cwd, 'prisma', 'schema.prisma'),
    path.join(cwd, '..', 'server', 'prisma', 'schema.prisma'),
    path.join(cwd, 'api', '..', 'server', 'prisma', 'schema.prisma'),
  ];
  for (const c of candidates) {
    if (exists(c)) return c;
  }
  return null;
}

/**
 * Locate LOCAL Prisma CLI only — never npx (no network / no $HOME on Vercel).
 * Prefer `node …/prisma/build/index.js` over shell shims.
 */
function resolveLocalPrisma(cwd: string): {
  cmd: string;
  baseArgs: string[];
  found: string[];
} {
  const found: string[] = [];
  const searchRoots = [
    cwd,
    path.join(cwd, 'server'),
    path.join(cwd, '..'),
    path.dirname(cwd),
  ];

  const tryPairs: Array<{ label: string; cmd: string; baseArgs: string[] }> = [];

  for (const root of searchRoots) {
    const cliJs = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
    const bin = path.join(root, 'node_modules', '.bin', 'prisma');
    if (exists(cliJs)) {
      found.push(cliJs);
      tryPairs.push({
        label: cliJs,
        cmd: process.execPath,
        baseArgs: [cliJs],
      });
    }
    if (exists(bin)) {
      found.push(bin);
      tryPairs.push({
        label: bin,
        cmd: bin,
        baseArgs: [],
      });
    }
  }

  if (tryPairs.length === 0) {
    throw new AppError(
      'PRISMA_CLI_MISSING',
      'Локальный Prisma CLI не найден в node_modules (npx отключён на Vercel). Проверьте includeFiles / dependencies.',
      500
    );
  }

  const first = tryPairs[0];
  return { cmd: first.cmd, baseArgs: first.baseArgs, found };
}

async function runPrisma(args: string[]) {
  const cwd = process.cwd();
  const schema = resolveSchemaPath(cwd);
  if (!schema) {
    return {
      ok: false as const,
      cwd,
      message: 'schema.prisma not found under server/prisma or prisma/',
      foundCli: [] as string[],
    };
  }

  let resolved: ReturnType<typeof resolveLocalPrisma>;
  try {
    resolved = resolveLocalPrisma(cwd);
  } catch (e: unknown) {
    return {
      ok: false as const,
      cwd,
      schema,
      message: e instanceof Error ? e.message : 'prisma cli resolve failed',
      foundCli: [] as string[],
    };
  }

  const cmdArgs = [...resolved.baseArgs, ...args, '--schema', schema];
  const env = sandboxEnv();
  const workDir = path.dirname(schema); // server/prisma → run from server/

  try {
    const { stdout, stderr } = await execFileAsync(resolved.cmd, cmdArgs, {
      cwd: path.dirname(workDir),
      env,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      ok: true as const,
      cmd: [resolved.cmd, ...cmdArgs].join(' '),
      cwd,
      workDir: path.dirname(workDir),
      schema,
      foundCli: resolved.found,
      stdout: String(stdout ?? '').slice(0, 8000),
      stderr: String(stderr ?? '').slice(0, 4000),
    };
  } catch (e: unknown) {
    const err = e as {
      message?: string;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      code?: number;
    };
    return {
      ok: false as const,
      cmd: [resolved.cmd, ...cmdArgs].join(' '),
      cwd,
      workDir: path.dirname(workDir),
      schema,
      foundCli: resolved.found,
      code: err.code,
      message: err.message ?? 'prisma failed',
      stdout: String(err.stdout ?? '').slice(0, 8000),
      stderr: String(err.stderr ?? '').slice(0, 8000),
    };
  }
}

async function listTables(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    return rows.map((r) => r.tablename);
  } catch {
    return [];
  }
}

/** Clear failed/partial Prisma migration history so P3009 cannot block bootstrap. */
async function dropPrismaMigrationsTable(): Promise<{ ok: boolean; message: string }> {
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;`);
    return { ok: true, message: 'Dropped _prisma_migrations (if existed)' };
  } catch (e: unknown) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'drop _prisma_migrations failed',
    };
  }
}

export async function dbInitRoutes(app: FastifyInstance) {
  const limit = {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  };

  /**
   * First-time / recovery bootstrap for Vercel Postgres.
   * Uses local `prisma db push` only (never npx).
   */
  app.get('/api/init-db', limit, async (request) => {
    const q = request.query as { secret?: string };
    assertInitSecret(q.secret);

    const before = await listTables();
    const clearMigrations = await dropPrismaMigrationsTable();
    const push = await runPrisma(['db', 'push', '--accept-data-loss', '--skip-generate']);
    const after = await listTables();

    return {
      action: 'init-db',
      clearMigrations,
      push,
      tablesBefore: before,
      tablesAfter: after,
      tableCount: after.length,
      time: new Date().toISOString(),
    };
  });

  app.get('/api/drop-init', limit, async (request) => {
    const q = request.query as { secret?: string };
    assertInitSecret(q.secret);

    const before = await listTables();

    let wipe: { ok: boolean; message: string } = { ok: false, message: '' };
    try {
      await prisma.$executeRawUnsafe(`
        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO public;
        GRANT ALL ON SCHEMA public TO CURRENT_USER;
      `);
      wipe = { ok: true, message: 'Dropped and recreated schema public' };
    } catch (e: unknown) {
      wipe = {
        ok: false,
        message: e instanceof Error ? e.message : 'wipe failed',
      };
    }

    const clearMigrations = await dropPrismaMigrationsTable();
    const push = await runPrisma(['db', 'push', '--accept-data-loss', '--skip-generate']);
    const after = await listTables();

    return {
      action: 'drop-init',
      wipe,
      clearMigrations,
      push,
      tablesBefore: before,
      tablesAfter: after,
      tableCount: after.length,
      time: new Date().toISOString(),
    };
  });
}
