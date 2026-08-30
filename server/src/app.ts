import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { civilizationRoutes } from './routes/civilizations.js';
import { actionRoutes } from './routes/actions.js';
import { contactRoutes } from './routes/contacts.js';
import { threadRoutes } from './routes/threads.js';
import { combatRoutes } from './routes/combat.js';
import { shopRoutes } from './routes/shop.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { lateGameRoutes } from './routes/lateGame.js';
import { adminRoutes } from './routes/admin.js';
import { debugRoutes } from './routes/debug.js';
import { dbInitRoutes } from './routes/dbInit.js';
import { universeRoutes } from './routes/universe.js';
import { isAppError } from './utils/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'production',
    // Trust proxy headers on Vercel
    trustProxy: true,
  });

  // Production: CLIENT_ORIGIN (comma-separated allowed). Dev: any origin.
  // Vercel same-origin SPA can omit CORS when API is under /api on same host.
  const rawOrigin = process.env.CLIENT_ORIGIN;
  const origin =
    process.env.NODE_ENV === 'production'
      ? rawOrigin
        ? rawOrigin.split(',').map((s) => s.trim()).filter(Boolean)
        : true
      : true;

  await app.register(cors, {
    origin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
    timeWindow: '1 minute',
  });

  await app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // Zod / fastify validation style
    const err = error as { validation?: unknown; statusCode?: number; message?: string };
    if (err.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Некорректные данные запроса',
        },
      });
    }

    app.log.error(error);
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    return reply.status(status).send({
      error: {
        code: status === 429 ? 'RATE_LIMIT' : 'INTERNAL_ERROR',
        message:
          status === 429
            ? 'Слишком много запросов. Подождите немного.'
            : 'Внутренняя ошибка сервера',
      },
    });
  });

  app.get('/api/health', async () => ({
    ok: true,
    service: 'dark-forest-server',
    stage: 9,
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(civilizationRoutes);
  await app.register(actionRoutes);
  await app.register(contactRoutes);
  await app.register(threadRoutes);
  await app.register(combatRoutes);
  await app.register(shopRoutes);
  await app.register(leaderboardRoutes);
  await app.register(lateGameRoutes);
  await app.register(adminRoutes);
  await app.register(debugRoutes);
  await app.register(dbInitRoutes);
  await app.register(universeRoutes);

  return app;
}

/** Cached Fastify instance for serverless warm invocations. */
let appPromise: Promise<Awaited<ReturnType<typeof buildApp>>> | null = null;

export function getApp() {
  if (!appPromise) {
    appPromise = buildApp().then(async (app) => {
      await app.ready();
      return app;
    });
  }
  return appPromise;
}
