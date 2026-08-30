/**
 * Bundle Fastify API + shared → api/handler.cjs (CJS).
 * Vercel entry remains api/index.ts (no api/index.js — avoids path conflict).
 *
 * @prisma/client is EXTERNAL and resolved from ROOT node_modules
 * (installed via root package.json for Vercel serverless).
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(root, 'api/handler.cjs');
const require = createRequire(path.join(root, 'package.json'));

// Prefer root @prisma/client (Vercel layout); fall back to server install for local monorepo
function resolvePrismaClientDir() {
  const candidates = [
    path.join(root, 'node_modules/@prisma/client'),
    path.join(root, 'server/node_modules/@prisma/client'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    return path.dirname(require.resolve('@prisma/client/package.json'));
  } catch {
    return path.join(root, 'node_modules/@prisma/client');
  }
}

const prismaClientDir = resolvePrismaClientDir();
console.log('esbuild external @prisma/client →', prismaClientDir);

// Remove stale conflicting artifact if present
for (const stale of ['api/index.js', 'api/index.js.map']) {
  const p = path.join(root, stale);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, 'api/bundle-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  sourcemap: false,
  mainFields: ['main', 'module'],
  // Do NOT rewrite @prisma/client to an absolute server path — that breaks on Vercel.
  // Leave bare package name so Node resolves from /var/task/node_modules.
  external: [
    '@prisma/client',
    '.prisma/client',
    'prisma',
    'fsevents',
  ],
  alias: {
    '@shared': path.join(root, 'shared/src/index.ts'),
  },
  resolveExtensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
  logLevel: 'info',
  banner: {
    js: [
      '/* Dark Forest API bundle — scripts/bundle-api.mjs — do not edit */',
      // Root node_modules first (Vercel), then server (local monorepo)
      "process.env.NODE_PATH=[require('path').join(__dirname,'../node_modules'),require('path').join(__dirname,'../server/node_modules'),process.env.NODE_PATH].filter(Boolean).join(':');",
      "require('module').Module._initPaths();",
    ].join('\n'),
  },
});

let code = fs.readFileSync(outfile, 'utf8');

// Guard: never leave absolute monorepo paths to server/node_modules/@prisma
if (code.includes('server/node_modules/@prisma')) {
  console.warn('WARNING: bundle still references server/node_modules/@prisma — rewriting to bare package');
  code = code.replace(/require\(["'][^"']*server\/node_modules\/@prisma\/client["']\)/g, 'require("@prisma/client")');
  code = code.replace(/from ["'][^"']*server\/node_modules\/@prisma\/client["']/g, 'from "@prisma/client"');
}

if (!/module\.exports\s*=\s*Object\.assign\(\s*handler/.test(code)) {
  code +=
    '\n' +
    [
      'exports.default = handler;',
      'exports.config = typeof config !== "undefined" ? config : { api: { bodyParser: false } };',
      'module.exports = Object.assign(handler, { default: handler, config: exports.config });',
    ].join('\n') +
    '\n';
}
fs.writeFileSync(outfile, code);

// Sanity: must require bare @prisma/client
const bare = /require\(["']@prisma\/client["']\)/.test(code);
const absServer = /server\/node_modules\/@prisma/.test(code);
console.log(`Bundled ${outfile} (${(fs.statSync(outfile).size / 1024).toFixed(1)} KB)`);
console.log('bare @prisma/client require:', bare, '| abs server path left:', absServer);
if (!bare) {
  console.error('FATAL: bundle does not require("@prisma/client")');
  process.exit(1);
}
if (absServer) {
  console.error('FATAL: bundle still has absolute server prisma path');
  process.exit(1);
}
