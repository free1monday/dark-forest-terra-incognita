/**
 * After `prisma generate`, ensure root node_modules/.prisma/client exists.
 * Monorepo installs often generate into server/node_modules/.prisma.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = path.join(root, 'server/prisma/schema.prisma');

function hasEngine(dir) {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => f.startsWith('libquery_engine'));
}

// Generate using whichever prisma is available
execSync(`npx prisma generate --schema="${schema}"`, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

const rootPrisma = path.join(root, 'node_modules/.prisma/client');
const serverPrisma = path.join(root, 'server/node_modules/.prisma/client');

if (!hasEngine(rootPrisma) && hasEngine(serverPrisma)) {
  fs.mkdirSync(path.dirname(rootPrisma), { recursive: true });
  fs.rmSync(rootPrisma, { recursive: true, force: true });
  fs.cpSync(serverPrisma, rootPrisma, { recursive: true });
  console.log('Copied generated client → node_modules/.prisma/client');
}

if (!hasEngine(rootPrisma)) {
  console.error('FATAL: no Prisma query engine under node_modules/.prisma/client');
  process.exit(1);
}

console.log(
  'Prisma engines:',
  fs.readdirSync(rootPrisma).filter((f) => f.includes('libquery') || f === 'schema.prisma')
);
