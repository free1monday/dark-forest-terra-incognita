import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  enactPhysicsLaw,
  listPhysicsLaws,
  revokePhysicsLaw,
  startGalaxyTravel,
} from '../services/lateGameService.js';
import { AppError } from '../utils/errors.js';

const lawSchema = z.object({
  lawId: z.string().min(1).max(64),
});

export async function lateGameRoutes(app: FastifyInstance) {
  const limit = {
    config: { rateLimit: { max: 40, timeWindow: '1 minute' } },
    preHandler: [app.authenticate],
  };

  app.get('/api/civilizations/current/physics-laws', limit, async (request) => {
    return listPhysicsLaws(request.user.sub);
  });

  app.post('/api/civilizations/current/physics-laws/enact', limit, async (request) => {
    const parsed = lawSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Укажите lawId', 400);
    return enactPhysicsLaw(request.user.sub, parsed.data.lawId);
  });

  app.post('/api/civilizations/current/physics-laws/revoke', limit, async (request) => {
    const parsed = lawSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Укажите lawId', 400);
    return revokePhysicsLaw(request.user.sub, parsed.data.lawId);
  });

  app.post('/api/civilizations/current/travel-galaxy', limit, async (request) => {
    return startGalaxyTravel(request.user.sub);
  });
}
