import type { FastifyInstance } from 'fastify';
import { getLeaderboard } from '../services/leaderboardService.js';

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get('/api/leaderboard', { preHandler: [app.authenticate] }, async (request) => {
    return getLeaderboard(request.user.sub);
  });
}
