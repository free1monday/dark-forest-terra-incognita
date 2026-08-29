import type { FastifyInstance } from 'fastify';
import type { BuildingId, ExpeditionTypeId } from '@shared';
import { exploreSchema, upgradeBuildingSchema } from '../schemas/index.js';
import {
  levelUpCivilization,
  startExpedition,
  startTerraIncognita,
  upgradeBuilding,
} from '../services/gameService.js';
import { AppError } from '../utils/errors.js';

export async function actionRoutes(app: FastifyInstance) {
  const actionLimit = {
    config: {
      rateLimit: { max: 60, timeWindow: '1 minute' },
    },
    preHandler: [app.authenticate],
  };

  app.post(
    '/api/civilizations/current/actions/upgrade-building',
    actionLimit,
    async (request) => {
      const parsed = upgradeBuildingSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError('VALIDATION_ERROR', 'Некорректный тип постройки', 400);
      }
      return upgradeBuilding(request.user.sub, parsed.data.buildingType as BuildingId);
    }
  );

  app.post(
    '/api/civilizations/current/actions/level-up',
    actionLimit,
    async (request) => {
      return levelUpCivilization(request.user.sub);
    }
  );

  /** Stage 3 primary expedition endpoint */
  app.post(
    '/api/civilizations/current/actions/explore',
    actionLimit,
    async (request) => {
      const parsed = exploreSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError('VALIDATION_ERROR', 'Укажите expeditionType', 400);
      }
      return startExpedition(
        request.user.sub,
        parsed.data.expeditionType as ExpeditionTypeId
      );
    }
  );

  /** Stage 2 compatibility: localScan */
  app.post(
    '/api/civilizations/current/actions/explore-terra-incognita',
    actionLimit,
    async (request) => {
      return startTerraIncognita(request.user.sub);
    }
  );
}
