import {
  GALAXY_TRAVEL_LEVEL,
  MAX_ACTIVE_PHYSICS_LAWS,
  PHYSICS_LAB_LEVEL,
  PHYSICS_LAWS_BY_ID,
  PHYSICS_REVOKE_REFUND,
  galaxyTravelCost,
  galaxyTravelDurationSec,
  generateSeed,
  generateWorld,
  parsePhysicsLaws,
  type GameState,
  type PhysicsLawId,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { focusesFromCiv } from './stateService.js';
import { getUserCivilizationState, invalidateStateCache } from './gameService.js';

export async function listPhysicsLaws(userId: string) {
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return {
    level: state.civilization.level,
    unlocked: state.civilization.level >= PHYSICS_LAB_LEVEL,
    maxActive: MAX_ACTIVE_PHYSICS_LAWS,
    active: state.civilization.physicsLaws,
    catalog: state.physicsCatalog,
    state,
  };
}

export async function enactPhysicsLaw(
  userId: string,
  lawId: string
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();
  const def = PHYSICS_LAWS_BY_ID[lawId];
  if (!def) throw new AppError('LAW_NOT_FOUND', 'Неизвестный закон физики', 404);

  await prisma.$transaction(async (tx) => {
    const civ = await tx.civilization.findUnique({
      where: { userId },
      include: { resources: true },
    });
    if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    if (civ.level < PHYSICS_LAB_LEVEL) {
      throw new AppError(
        'LEVEL_TOO_LOW',
        `Конструктор реальности доступен с уровня ${PHYSICS_LAB_LEVEL}`,
        400
      );
    }
    const active = parsePhysicsLaws(civ.physicsLaws);
    if (active.includes(lawId as PhysicsLawId)) {
      throw new AppError('LAW_ACTIVE', 'Закон уже активен', 400);
    }
    if (active.length >= MAX_ACTIVE_PHYSICS_LAWS) {
      throw new AppError(
        'LAW_SLOTS_FULL',
        `Можно держать не более ${MAX_ACTIVE_PHYSICS_LAWS} законов`,
        400
      );
    }
    const r = civ.resources;
    if (
      r.darkEnergy < def.cost.darkEnergy ||
      r.darkMatter < def.cost.darkMatter ||
      r.antimatter < def.cost.antimatter
    ) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для принятия закона', 400);
    }
    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        darkEnergy: r.darkEnergy - def.cost.darkEnergy,
        darkMatter: r.darkMatter - def.cost.darkMatter,
        antimatter: r.antimatter - def.cost.antimatter,
      },
    });
    const next = [...active, lawId as PhysicsLawId];
    await tx.civilization.update({
      where: { id: civ.id },
      data: { physicsLaws: JSON.stringify(next) },
    });
    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'physics',
        title: `Закон принят: ${def.nameRu}`,
        message: `Локальная физика изменена. Стоимость: ТЭ ${def.cost.darkEnergy}, ТМ ${def.cost.darkMatter}, АМ ${def.cost.antimatter}.`,
      },
    });
  });

  invalidateStateCache(userId);
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return {
    state,
    report: {
      type: 'physics_enact',
      title: 'Закон физики',
      message: `«${def.nameRu}» введён в локальную метрику.`,
    },
  };
}

export async function revokePhysicsLaw(
  userId: string,
  lawId: string
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();
  const def = PHYSICS_LAWS_BY_ID[lawId];
  if (!def) throw new AppError('LAW_NOT_FOUND', 'Неизвестный закон физики', 404);

  await prisma.$transaction(async (tx) => {
    const civ = await tx.civilization.findUnique({
      where: { userId },
      include: { resources: true },
    });
    if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    const active = parsePhysicsLaws(civ.physicsLaws);
    if (!active.includes(lawId as PhysicsLawId)) {
      throw new AppError('LAW_NOT_ACTIVE', 'Закон не активен', 400);
    }
    const next = active.filter((x) => x !== lawId);
    await tx.civilization.update({
      where: { id: civ.id },
      data: { physicsLaws: JSON.stringify(next) },
    });
    // 10% refund
    const refundDe = Math.floor(def.cost.darkEnergy * PHYSICS_REVOKE_REFUND);
    const refundDm = Math.floor(def.cost.darkMatter * PHYSICS_REVOKE_REFUND);
    const refundAm = Math.floor(def.cost.antimatter * PHYSICS_REVOKE_REFUND);
    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        darkEnergy: Math.min(
          civ.resources.darkEnergyCapacity,
          civ.resources.darkEnergy + refundDe
        ),
        darkMatter: Math.min(
          civ.resources.darkMatterCapacity,
          civ.resources.darkMatter + refundDm
        ),
        antimatter: Math.min(
          civ.resources.antimatterCapacity,
          civ.resources.antimatter + refundAm
        ),
      },
    });
    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'physics',
        title: `Закон отменён: ${def.nameRu}`,
        message: `Метрика восстановлена. Возврат ~${Math.round(PHYSICS_REVOKE_REFUND * 100)}% стоимости.`,
      },
    });
  });

  invalidateStateCache(userId);
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return {
    state,
    report: {
      type: 'physics_revoke',
      title: 'Закон отменён',
      message: `«${def.nameRu}» снят. Частичный возврат ресурсов.`,
    },
  };
}

export async function startGalaxyTravel(
  userId: string
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();
  await prisma.$transaction(async (tx) => {
    const civ = await tx.civilization.findUnique({
      where: { userId },
      include: { resources: true },
    });
    if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    if (civ.level < GALAXY_TRAVEL_LEVEL) {
      throw new AppError(
        'LEVEL_TOO_LOW',
        `Межгалактический переход с уровня ${GALAXY_TRAVEL_LEVEL}`,
        400
      );
    }
    if (civ.isInterstellarTraveling) {
      throw new AppError('ALREADY_TRAVELING', 'Переход уже выполняется', 400);
    }
    const cost = galaxyTravelCost(civ.level);
    const r = civ.resources;
    if (
      r.fermions < cost.fermions ||
      r.darkEnergy < cost.darkEnergy ||
      r.highEnergy < cost.highEnergy
    ) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для перехода', 400);
    }
    const dur = galaxyTravelDurationSec(civ.level);
    const finishes = new Date(Date.now() + dur * 1000);
    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        fermions: r.fermions - cost.fermions,
        darkEnergy: r.darkEnergy - cost.darkEnergy,
        highEnergy: r.highEnergy - cost.highEnergy,
      },
    });
    await tx.civilization.update({
      where: { id: civ.id },
      data: {
        isInterstellarTraveling: true,
        galaxyTravelFinishesAt: finishes,
      },
    });
    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'travel',
        title: 'Межгалактический переход начат',
        message: `Подготовка гипертуннеля. ETA ~${dur} с. Контакты будут потеряны. Списано: ФМ ${cost.fermions}, ТЭ ${cost.darkEnergy}, ВЭ ${cost.highEnergy}.`,
      },
    });
  });

  invalidateStateCache(userId);
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return {
    state,
    report: {
      type: 'galaxy_travel_start',
      title: 'Переход',
      message: 'Межгалактический переход в фазе подготовки.',
    },
  };
}

/** Complete travel if due — call inside catch-up transaction. */
export async function completeGalaxyTravelIfDue(
  tx: import('@prisma/client').Prisma.TransactionClient,
  civId: string
): Promise<boolean> {
  const civ = await tx.civilization.findUnique({
    where: { id: civId },
    include: { resources: true },
  });
  if (!civ || !civ.isInterstellarTraveling || !civ.galaxyTravelFinishesAt) return false;
  if (civ.galaxyTravelFinishesAt.getTime() > Date.now()) return false;

  const focuses = focusesFromCiv(civ);
  const nonce = (civ.galaxyTravelNonce ?? 0) + 1;
  const newSeed = generateSeed(`${civ.seed}::galaxy:${nonce}`);
  const world = generateWorld(newSeed, focuses);

  await tx.civilization.update({
    where: { id: civ.id },
    data: {
      seed: newSeed,
      galaxyName: world.galaxyName,
      sectorName: world.sectorName,
      systemName: world.systemName,
      coordinatesX: world.coordinates.x,
      coordinatesY: world.coordinates.y,
      coordinatesZ: world.coordinates.z,
      starType: world.starType,
      mainPlanetName: world.mainPlanetName,
      mainPlanetType: world.mainPlanetType,
      habitability: world.habitability,
      anomalyType: world.anomalyType,
      radarQuality: world.radarQuality,
      backgroundRadiation: world.backgroundRadiation,
      vacuumStability: world.vacuumStability,
      darkMatterDensity: world.darkMatterDensity,
      eventProbability: world.eventProbability,
      greatStructureName: world.greatStructureName,
      signalExposure: 1.0,
      isInterstellarTraveling: false,
      galaxyTravelFinishesAt: null,
      galaxyTravelNonce: nonce,
    },
  });

  // Wipe contacts (and cascade threads/messages)
  await tx.contact.deleteMany({ where: { observerCivilizationId: civ.id } });

  await tx.journalEvent.create({
    data: {
      civilizationId: civ.id,
      type: 'travel',
      title: 'Прибытие в новую галактику',
      message: `Мир пересобран. Галактика: ${world.galaxyName}, сектор: ${world.sectorName}, система: ${world.systemName}. Архив контактов обнулён. signalExposure сброшен.`,
    },
  });
  return true;
}

export async function debugForceGalaxyTravelComplete(userId: string): Promise<GameState> {
  invalidateStateCache();

  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  await prisma.$transaction(async (tx) => {
    if (civ.isInterstellarTraveling) {
      await tx.civilization.update({
        where: { id: civ.id },
        data: { galaxyTravelFinishesAt: new Date(Date.now() - 1000) },
      });
    } else {
      // force start finished immediately for debug without cost
      await tx.civilization.update({
        where: { id: civ.id },
        data: {
          isInterstellarTraveling: true,
          galaxyTravelFinishesAt: new Date(Date.now() - 1000),
        },
      });
    }
    await completeGalaxyTravelIfDue(tx, civ.id);
  });
  invalidateStateCache(userId);
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return state;
}
