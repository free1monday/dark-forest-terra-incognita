import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AttackType } from '@shared';
import {
  cancelCombatAction,
  startCombatAction,
} from '../services/combatService.js';
import { AppError } from '../utils/errors.js';

const startSchema = z.object({
  attackType: z.enum([
    'RECON_SCAN',
    'LIMITED_STRIKE',
    'DARK_STRIKE',
    'GRAVITATIONAL_STRIKE',
    'DECEPTION_SIGNAL',
    'COMM_JAMMING',
    'EVACUATION',
    'CAPITAL_RELOCATION',
  ]),
  contactId: z.string().min(1).optional(),
  targetCoordinates: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
});

export async function combatRoutes(app: FastifyInstance) {
  const limit = {
    config: { rateLimit: { max: 40, timeWindow: '1 minute' } },
    preHandler: [app.authenticate],
  };

  app.post('/api/civilizations/current/combat/start', limit, async (request) => {
    const parsed = startSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Некорректные параметры атаки', 400);
    }
    return startCombatAction(request.user.sub, {
      attackType: parsed.data.attackType as AttackType,
      contactId: parsed.data.contactId,
      targetCoordinates: parsed.data.targetCoordinates,
    });
  });

  app.post('/api/civilizations/current/combat/:actionId/cancel', limit, async (request) => {
    const { actionId } = request.params as { actionId: string };
    return cancelCombatAction(request.user.sub, actionId);
  });
}
