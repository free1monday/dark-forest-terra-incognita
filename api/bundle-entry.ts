/**
 * Esbuild entry — full Fastify app inlined into api/handler.cjs.
 * Not a Vercel function file (name must not be index.*).
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
