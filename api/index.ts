/**
 * Vercel Serverless Function entry (source for esbuild → api/index.js).
 *
 * On Vercel, `npm run vercel-build` runs `scripts/bundle-api.mjs`, which emits
 * a self-contained `api/index.js` (server + shared inlined). vercel.json
 * points `functions` at that artifact and `includeFiles: "server/**"` so
 * Prisma engines / schema / CLI are present under /var/task/server.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getApp } from '../server/src/app';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  // Fastify low-level: forward the raw Node HTTP pair into the server
  app.server.emit(
    'request',
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse
  );
}
