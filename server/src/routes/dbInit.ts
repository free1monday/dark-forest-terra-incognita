import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

function resolvePrismaPaths() {
  const cwd = process.cwd();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(cwd, 'server'),
    cwd,
    path.join(cwd, '..', 'server'),
    path.resolve(here, '../..'),
    path.resolve(here, '../../..', 'server'),
  ];

  let serverRoot = candidates[0];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'prisma', 'schema.prisma'))) {
      serverRoot = c;
      break;
    }
  }

  const schema = path.join(serverRoot, 'prisma', 'schema.prisma');
  const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const binPrisma = path.join(serverRoot, 'node_modules', '.bin', 'prisma');
  const rootBin = path.join(cwd, 'node_modules', '.bin', 'prisma');
  return { serverRoot, schema, prismaCli, binPrisma, rootBin };
}

async function runPrisma(args: string[]) {
  const { serverRoot, schema, prismaCli, binPrisma, rootBin } = resolvePrismaPaths();
  const env = { ...process.env };

  let cmd: string;
  let cmdArgs: string[];

  if (fs.existsSync(binPrisma)) {
    cmd = binPrisma;
    cmdArgs = [...args, '--schema', schema];
  } else if (fs.existsSync(rootBin)) {
    cmd = rootBin;
    cmdArgs = [...args, '--schema', schema];
  } else if (fs.existsSync(prismaCli)) {
    cmd = process.execPath;
    cmdArgs = [prismaCli, ...args, '--schema', schema];
  } else {
    cmd = 'npx';
    cmdArgs = ['--yes', 'prisma@5.22.0', ...args, '--schema', schema];
  }

  try {
    const { stdout, stderr } = await execFileAsync(cmd, cmdArgs, {
      cwd: serverRoot,
      env,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      ok: true as const,
      cmd: [cmd, ...cmdArgs].join(' '),
      serverRoot,
      schema,
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
      cmd: [cmd, ...cmdArgs].join(' '),
      serverRoot,
      schema,
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
   * Uses `prisma db push` (no migration history) after clearing failed `_prisma_migrations`.
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
