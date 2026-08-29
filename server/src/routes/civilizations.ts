import type { FastifyInstance } from 'fastify';
import { createCivilizationSchema } from '../schemas/index.js';
import {
  createCivilization,
  getUserCivilizationState,
} from '../services/gameService.js';
import { AppError } from '../utils/errors.js';

export async function civilizationRoutes(app: FastifyInstance) {
  app.post('/api/civilizations', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const parsed = createCivilizationSchema.safeParse(request.body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Некорректные данные';
      throw new AppError('VALIDATION_ERROR', msg, 400);
    }
    const state = await createCivilization(request.user.sub, parsed.data);
    return {
      state,
      report: {
        type: 'civilization_created',
        title: 'Цивилизация основана',
        message: `Цивилизация «${parsed.data.name.trim()}» зарегистрирована на сервере.`,
      },
    };
  });

  app.get('/api/civilizations/current/state', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await getUserCivilizationState(request.user.sub);
    if (!state) {
      throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    }
    return { state };
  });
}
