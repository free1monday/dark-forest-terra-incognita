import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema } from '../schemas/index.js';
import { loginUser, publicUser, registerUser } from '../services/authService.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../utils/prisma.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Некорректные данные';
      throw new AppError('VALIDATION_ERROR', msg, 400);
    }
    const user = await registerUser(parsed.data);
    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return { token, user: publicUser(user) };
  });

  app.post('/api/auth/login', {
    config: {
      rateLimit: { max: 20, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Некорректные данные';
      throw new AppError('VALIDATION_ERROR', msg, 400);
    }
    const user = await loginUser(parsed.data);
    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return { token, user: publicUser(user) };
  });

  app.get('/api/auth/me', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Пользователь не найден', 401);
    }
    const civ = await prisma.civilization.findUnique({
      where: { userId },
      select: { id: true, name: true, level: true },
    });
    return {
      user: publicUser(user),
      civilization: civ
        ? { id: civ.id, name: civ.name, level: civ.level }
        : null,
    };
  });
}
