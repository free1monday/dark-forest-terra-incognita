import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getThread,
  initiateThread,
  sendDiplomacyCard,
} from '../services/diplomacyService.js';
import { AppError } from '../utils/errors.js';
import type { DiplomacyCardType } from '@shared';

const sendSchema = z.object({
  cardType: z.enum([
    'GREETING',
    'DATA_EXCHANGE',
    'NEUTRALITY_PACT',
    'ULTIMATUM',
    'THREAT',
    'CEASE_COMM',
  ]),
  useEncryption: z.boolean().optional().default(false),
});

export async function threadRoutes(app: FastifyInstance) {
  app.post(
    '/api/civilizations/current/threads/:contactId/initiate',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { contactId } = request.params as { contactId: string };
      const result = await initiateThread(request.user.sub, contactId);
      return {
        thread: result.thread,
        state: result.state,
        report: {
          type: 'diplomacy_initiate',
          title: 'Канал открыт',
          message: 'Дипломатический кабинет инициализирован.',
        },
      };
    }
  );

  app.get(
    '/api/civilizations/current/threads/:threadId',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { threadId } = request.params as { threadId: string };
      const result = await getThread(request.user.sub, threadId);
      return { thread: result.thread, state: result.state };
    }
  );

  app.post(
    '/api/civilizations/current/threads/:threadId/send',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { threadId } = request.params as { threadId: string };
      const parsed = sendSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new AppError('VALIDATION_ERROR', 'Некорректные данные карточки', 400);
      }
      const result = await sendDiplomacyCard(
        request.user.sub,
        threadId,
        parsed.data.cardType as DiplomacyCardType,
        parsed.data.useEncryption
      );
      return {
        thread: result.thread,
        state: result.state,
        report: result.report,
      };
    }
  );
}
