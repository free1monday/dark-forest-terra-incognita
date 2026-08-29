import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  assertAdmin,
  getAdminStats,
  getCivilizationAdmin,
  listCivilizations,
  listUsers,
  modifyCivilization,
} from '../services/adminService.js';
import { AppError } from '../utils/errors.js';

function requireProdAdminHeader(request: FastifyRequest) {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new AppError('FORBIDDEN', 'Админ-панель отключена', 403);
  const hdr = request.headers['x-admin-secret'];
  if (hdr !== secret) {
    throw new AppError('FORBIDDEN', 'Неверный ADMIN_SECRET', 403);
  }
}

const modifySchema = z.object({
  level: z.number().int().min(1).max(100).optional(),
  highEnergy: z.number().int().min(0).max(1_000_000_000).optional(),
  antimatter: z.number().int().min(0).max(1_000_000_000).optional(),
  darkEnergy: z.number().int().min(0).max(1_000_000_000).optional(),
  darkMatter: z.number().int().min(0).max(1_000_000_000).optional(),
  fermions: z.number().int().min(0).max(1_000_000_000).optional(),
  premiumCredits: z.number().int().min(0).max(10_000_000).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  const guard = {
    preHandler: [
      app.authenticate,
      async (request: FastifyRequest) => {
        requireProdAdminHeader(request);
        await assertAdmin(request.user.sub);
      },
    ],
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  };

  app.get('/api/admin/users', guard, async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    return listUsers(Number(q.limit ?? 100), Number(q.offset ?? 0));
  });

  app.get('/api/admin/civilizations', guard, async (request) => {
    const q = request.query as { q?: string; limit?: string; offset?: string };
    return listCivilizations({
      q: q.q,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
  });

  app.get('/api/admin/civilizations/:id', guard, async (request) => {
    const { id } = request.params as { id: string };
    return getCivilizationAdmin(id);
  });

  app.post('/api/admin/civilizations/:id/modify', guard, async (request) => {
    const { id } = request.params as { id: string };
    const parsed = modifySchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Некорректные данные', 400);
    return modifyCivilization(id, parsed.data);
  });

  app.get('/api/admin/stats', guard, async () => getAdminStats());
}
