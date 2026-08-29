/**
 * Vercel Serverless Function entry (must stay in git as api/index.ts).
 * vercel.json → functions["api/index.ts"]
 *
 * Forwards Node req/res into the cached Fastify instance.
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
  app.server.emit(
    'request',
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse
  );
}
