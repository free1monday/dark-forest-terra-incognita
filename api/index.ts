/**
 * Vercel Serverless Function entry (source).
 * On deploy, `scripts/bundle-api.mjs` emits `api/index.js` (CJS bundle).
 * Vercel prefers the .js artifact when present.
 *
 * Runtime: Node IncomingMessage/ServerResponse → Fastify.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getApp } from '../server/src/app.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: IncomingMessage & { body?: unknown; query?: unknown },
  res: ServerResponse
) {
  const app = await getApp();
  app.server.emit('request', req, res);
}
