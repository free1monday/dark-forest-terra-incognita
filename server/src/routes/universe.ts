import type { FastifyInstance } from 'fastify';
import { AppError, isAppError } from '../utils/errors.js';
import {
  getHomeSolarSystem,
  getPlanetById,
  getSolarSystemById,
  getUniverseMapForUser,
} from '../services/universeService.js';
import { colonizePlanet, changePoliticalRegime } from '../services/gameService.js';
import type { MapLevel } from '@shared';

function userId(req: { user?: { sub?: string } }): string {
  const id = req.user?.sub;
  if (!id) throw new AppError('UNAUTHORIZED', 'Требуется авторизация', 401);
  return id;
}

export async function universeRoutes(app: FastifyInstance) {
  app.get('/api/universe/map', { onRequest: [app.authenticate] }, async (request) => {
    try {
      const q = request.query as {
        level?: string;
        superclusterId?: string;
        galaxyId?: string;
      };
      const level = q.level != null ? (Number(q.level) as MapLevel) : 0;
      const map = await getUniverseMapForUser(userId(request as never), {
        level: Number.isFinite(level) ? level : 0,
        superclusterId: q.superclusterId,
        galaxyId: q.galaxyId,
      });
      return { map };
    } catch (e) {
      if (isAppError(e)) throw e;
      throw e;
    }
  });

  app.get('/api/universe/solar-system/home', { onRequest: [app.authenticate] }, async (request) => {
    const system = await getHomeSolarSystem(userId(request as never));
    return { system };
  });

  app.get(
    '/api/universe/solar-system/:id',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const system = await getSolarSystemById(userId(request as never), id);
      return { system };
    }
  );

  app.get('/api/universe/planet/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return getPlanetById(userId(request as never), id);
  });

  app.post(
    '/api/civilizations/current/colonize-planet',
    { onRequest: [app.authenticate] },
    async (request) => {
      const body = request.body as { planetId?: string };
      if (!body?.planetId) {
        throw new AppError('VALIDATION', 'planetId обязателен', 400);
      }
      const state = await colonizePlanet(userId(request as never), body.planetId);
      return {
        state,
        report: {
          type: 'colonize',
          title: 'Колонизация',
          message: 'Колония основана.',
        },
      };
    }
  );

  app.post(
    '/api/civilizations/current/change-regime',
    { onRequest: [app.authenticate] },
    async (request) => {
      const body = request.body as { regime?: string };
      if (!body?.regime) {
        throw new AppError('VALIDATION', 'regime обязателен', 400);
      }
      const state = await changePoliticalRegime(userId(request as never), body.regime);
      return {
        state,
        report: {
          type: 'regime',
          title: 'Политика',
          message: `Режим: ${body.regime}`,
        },
      };
    }
  );
}
