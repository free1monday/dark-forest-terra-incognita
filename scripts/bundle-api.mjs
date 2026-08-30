/**
 * Bundle Fastify API + shared → api/handler.cjs (CJS).
 * Vercel entry remains api/index.ts (no api/index.js — avoids path conflict).
 * Prisma stays external; engines via includeFiles: server/**
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(root, 'api/handler.cjs');
const prismaClient = path.join(root, 'server/node_modules/@prisma/client');

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
  external: ['@prisma/client', '.prisma/client', 'prisma', 'fsevents'],
  alias: {
    '@shared': path.join(root, 'shared/src/index.ts'),
  },
  resolveExtensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
  logLevel: 'info',
  plugins: [
    {
      name: 'prisma-from-server',
      setup(build) {
        build.onResolve({ filter: /^@prisma\/client$/ }, () => ({
          path: prismaClient,
          external: true,
        }));
      },
    },
  ],
  banner: {
    js: [
      '/* Dark Forest API bundle — scripts/bundle-api.mjs — do not edit */',
      "process.env.NODE_PATH=[require('path').join(__dirname,'../server/node_modules'),require('path').join(__dirname,'../node_modules'),process.env.NODE_PATH].filter(Boolean).join(':');",
      "require('module').Module._initPaths();",
    ].join('\n'),
  },
});

let code = fs.readFileSync(outfile, 'utf8');
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

const stat = fs.statSync(outfile);
console.log(`Bundled ${outfile} (${(stat.size / 1024).toFixed(1)} KB)`);
