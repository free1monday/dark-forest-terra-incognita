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
import { isAppError } from './utils/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // In development allow any browser origin (preview hosts). Production uses CLIENT_ORIGIN.
  const origin =
    process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_ORIGIN || false
      : true;

  await app.register(cors, {
    origin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 200,
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

  return app;
}
