/**
 * Vercel Serverless Function entry — only api/index.ts (no api/index.js).
 *
 * Runtime loads api/handler.cjs produced by `vercel-build` → bundle-api.mjs.
 * includeFiles packs handler.cjs + server/** into the function.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const config = {
  api: {
    bodyParser: false,
  },
};

type HandlerFn = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

function loadHandler(): HandlerFn {
  // createRequire needs a real path under the project; package.json always exists
  const require = createRequire(join(process.cwd(), 'package.json'));
  const candidates = [
    join(process.cwd(), 'api', 'handler.cjs'),
    join(process.cwd(), 'handler.cjs'),
  ];

  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const mod = require(p) as HandlerFn | { default?: HandlerFn };
    const fn = typeof mod === 'function' ? mod : mod?.default;
    if (typeof fn === 'function') return fn;
  }

  throw new Error(
    'api/handler.cjs missing — run vercel-build (scripts/bundle-api.mjs) before deploy'
  );
}

let cached: HandlerFn | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!cached) cached = loadHandler();
    return await cached(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: { code: 'API_BUNDLE_LOAD_FAILED', message },
        })
      );
    }
  }
}
