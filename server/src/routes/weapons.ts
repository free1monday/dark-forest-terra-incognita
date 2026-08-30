import type { FastifyInstance } from 'fastify';
import { AppError } from '../utils/errors.js';
import {
  buildWeapon,
  debugFinishWeapons,
  listWeapons,
  useWeapon,
} from '../services/weaponService.js';

function uid(req: { user?: { sub?: string } }): string {
  const id = req.user?.sub;
  if (!id) throw new AppError('UNAUTHORIZED', 'Требуется авторизация', 401);
  return id;
}

export async function weaponRoutes(app: FastifyInstance) {
  app.get('/api/weapons', { onRequest: [app.authenticate] }, async (request) => {
    return listWeapons(uid(request as never));
  });

  app.post('/api/weapons/build', { onRequest: [app.authenticate] }, async (request) => {
    const body = request.body as { type?: string };
    if (!body?.type) throw new AppError('VALIDATION', 'type обязателен', 400);
    return buildWeapon(uid(request as never), body.type);
  });

  app.post('/api/weapons/:id/use', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { contactId?: string };
    return useWeapon(uid(request as never), id, { contactId: body.contactId });
  });

  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/debug/weapons-finish', { onRequest: [app.authenticate] }, async (request) => {
      return debugFinishWeapons(uid(request as never));
    });
  }
}
