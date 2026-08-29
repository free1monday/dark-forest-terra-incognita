import type { FastifyInstance } from 'fastify';
import {
  debugArtifactSchema,
  debugLevelSchema,
  grantResourcesSchema,
} from '../schemas/index.js';
import {
  debugForceLevelUp,
  debugGrantArtifact,
  debugGrantResources,
  debugIncreaseExposure,
  debugOpen4D,
  debugRandomContact,
  debugResetCivilization,
  debugSetLevel,
  debugSimulateDetectionOnUs,
  getUserCivilizationState,
} from '../services/gameService.js';
import {
  debugDeliverAll,
  debugResetDiplomacyMetrics,
} from '../services/diplomacyService.js';
import {
  debugGrantCombatResources,
  debugResolveAllCombat,
} from '../services/combatService.js';
import { debugAddCredits } from '../services/shopService.js';
import { computeAndStoreProsperity } from '../services/prosperityService.js';
import { debugForceGalaxyTravelComplete } from '../services/lateGameService.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';

export async function debugRoutes(app: FastifyInstance) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  app.post('/api/debug/grant-resources', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const parsed = grantResourcesSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Некорректные данные', 400);
    }
    const data = parsed.data;
    const empty =
      data.highEnergy === undefined &&
      data.fermions === undefined &&
      data.antimatter === undefined &&
      data.darkEnergy === undefined &&
      data.darkMatter === undefined;

    const grants = empty
      ? {
          highEnergy: 5000,
          antimatter: 500,
          darkEnergy: 500,
          darkMatter: 500,
          fermions: 500,
        }
      : {
          highEnergy: data.highEnergy,
          antimatter: data.antimatter,
          darkEnergy: data.darkEnergy,
          darkMatter: data.darkMatter,
          fermions: data.fermions,
        };

    const state = await debugGrantResources(request.user.sub, grants);
    return {
      state,
      report: {
        type: 'debug_grant',
        message: `DEBUG: начислены ресурсы ${JSON.stringify(grants)}`,
      },
    };
  });

  app.post('/api/debug/level-up', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugForceLevelUp(request.user.sub);
    return {
      state,
      report: { type: 'debug_level_up', message: 'DEBUG: уровень повышен на сервере' },
    };
  });

  app.post('/api/debug/set-level', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const parsed = debugLevelSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Укажите level 1–100', 400);
    }
    const state = await debugSetLevel(request.user.sub, parsed.data.level);
    return {
      state,
      report: { type: 'debug_set_level', message: `DEBUG: уровень = ${parsed.data.level}` },
    };
  });

  app.post('/api/debug/grant-artifact', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const parsed = debugArtifactSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Некорректные данные', 400);
    }
    const state = await debugGrantArtifact(request.user.sub, parsed.data.artifactKey);
    return {
      state,
      report: { type: 'debug_artifact', message: 'DEBUG: артефакт выдан' },
    };
  });

  app.post('/api/debug/open-4d', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugOpen4D(request.user.sub);
    return {
      state,
      report: { type: 'debug_4d', message: 'DEBUG: 4D-разлом открыт' },
    };
  });

  app.post('/api/debug/reset', {
    preHandler: [app.authenticate],
  }, async (request) => {
    await debugResetCivilization(request.user.sub);
    return {
      ok: true,
      report: {
        type: 'debug_reset',
        message: 'DEBUG: цивилизация удалена. Создайте новую.',
      },
    };
  });

  app.post('/api/debug/random-contact', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugRandomContact(request.user.sub);
    return {
      state,
      report: { type: 'debug_contact', message: 'DEBUG: случайный контакт создан' },
    };
  });

  app.post('/api/debug/bump-exposure', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugIncreaseExposure(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_exposure',
        message: `DEBUG: signalExposure = ${state.signalExposure}`,
      },
    };
  });

  app.post('/api/debug/simulate-detected', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugSimulateDetectionOnUs(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_detected',
        message: 'DEBUG: симуляция обнаружения вашей цивилизации',
      },
    };
  });

  app.post('/api/debug/diplomacy-deliver-all', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugDeliverAll(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_diplo_deliver',
        message: 'DEBUG: все IN_TRANSIT сообщения доставлены + catch-up',
      },
    };
  });

  app.post('/api/debug/diplomacy-reset-metrics', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const body = (request.body ?? {}) as { threadId?: string };
    const state = await debugResetDiplomacyMetrics(request.user.sub, body.threadId);
    return {
      state,
      report: {
        type: 'debug_diplo_reset',
        message: 'DEBUG: trust=50, tension=0, status=active',
      },
    };
  });

  app.post('/api/debug/diplomacy-resources', {
    preHandler: [app.authenticate],
  }, async (request) => {
    // Expand capacities first so grants are not silently capped
    const { prisma } = await import('../utils/prisma.js');
    const civ = await prisma.civilization.findUnique({
      where: { userId: request.user.sub },
      include: { resources: true },
    });
    if (civ?.resources) {
      await prisma.resourceState.update({
        where: { civilizationId: civ.id },
        data: {
          highEnergyCapacity: Math.max(civ.resources.highEnergyCapacity, 50000),
          antimatterCapacity: Math.max(civ.resources.antimatterCapacity, 2000),
          darkMatterCapacity: Math.max(civ.resources.darkMatterCapacity, 2000),
          darkEnergyCapacity: Math.max(civ.resources.darkEnergyCapacity, 2000),
          fermionsCapacity: Math.max(civ.resources.fermionsCapacity, 500),
        },
      });
    }
    const state = await debugGrantResources(request.user.sub, {
      highEnergy: 20000,
      antimatter: 500,
      darkMatter: 200,
      darkEnergy: 200,
      fermions: 100,
    });
    return {
      state,
      report: {
        type: 'debug_diplo_resources',
        message: 'DEBUG: ёмкости расширены + выданы ресурсы для дипломатии',
      },
    };
  });

  app.post('/api/debug/combat-resolve-all', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugResolveAllCombat(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_combat_resolve',
        message: 'DEBUG: все боевые операции форсированы к resolve',
      },
    };
  });

  app.post('/api/debug/combat-resources', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugGrantCombatResources(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_combat_resources',
        message: 'DEBUG: боевые ресурсы + уровень ≥20',
      },
    };
  });

  app.post('/api/debug/add-credits', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const body = (request.body ?? {}) as { amount?: number };
    const amount = body.amount ?? 1000;
    const res = await debugAddCredits(request.user.sub, amount);
    return {
      state: res.state,
      user: res.user,
      report: {
        type: 'debug_credits',
        message: `DEBUG: +${Math.floor(amount)} эфирных кредитов (баланс ${res.user.premiumCredits})`,
      },
    };
  });

  app.post('/api/debug/recalculate-prosperity', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const civ = await prisma.civilization.findUnique({
      where: { userId: request.user.sub },
      include: {
        resources: true,
        buildings: true,
        artifacts: true,
        contactsObserved: { select: { isDestroyed: true, status: true } },
      },
    });
    if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    const score = await prisma.$transaction(async (tx) => computeAndStoreProsperity(tx, civ));
    const state = await getUserCivilizationState(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_prosperity',
        message: `DEBUG: prosperityScore = ${score}`,
      },
    };
  });

  app.post('/api/debug/grant-dark-energy', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const body = (request.body ?? {}) as { amount?: number };
    const amount = Math.max(0, Math.min(5_000_000, Math.floor(body.amount ?? 50_000)));
    const civ = await prisma.civilization.findUnique({
      where: { userId: request.user.sub },
      include: { resources: true },
    });
    if (!civ?.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    await prisma.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        darkEnergyCapacity: Math.max(civ.resources.darkEnergyCapacity, amount + civ.resources.darkEnergy),
        darkEnergy: civ.resources.darkEnergy + amount,
        darkMatterCapacity: Math.max(civ.resources.darkMatterCapacity, 100_000),
        antimatterCapacity: Math.max(civ.resources.antimatterCapacity, 100_000),
        fermionsCapacity: Math.max(civ.resources.fermionsCapacity, 500_000),
        darkMatter: Math.max(civ.resources.darkMatter, 20_000),
        antimatter: Math.max(civ.resources.antimatter, 10_000),
        fermions: Math.max(civ.resources.fermions, 100_000),
        highEnergyCapacity: Math.max(civ.resources.highEnergyCapacity, 5_000_000),
        highEnergy: Math.max(civ.resources.highEnergy, 500_000),
      },
    });
    const state = await getUserCivilizationState(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_dark_energy',
        message: `DEBUG: +${amount} ТЭ (+ late-game ресурсы)`,
      },
    };
  });

  app.post('/api/debug/complete-galaxy-travel', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await debugForceGalaxyTravelComplete(request.user.sub);
    return {
      state,
      report: {
        type: 'debug_travel',
        message: 'DEBUG: межгалактический переход завершён',
      },
    };
  });

  app.get('/api/debug/state', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const state = await getUserCivilizationState(request.user.sub);
    return { state };
  });

  app.post('/api/debug/grant-admin', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data: { isAdmin: true },
    });
    return {
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin, premiumCredits: user.premiumCredits },
      report: { type: 'debug_admin', message: 'DEBUG: isAdmin = true' },
    };
  });
}

