import type { Contact, Prisma } from '@prisma/client';
import {
  calculateSignalExposure,
  estimateStructuresForUi,
  generateContactParameters,
  generateTargetStructures,
  getBuildingLevel,
  type ExpeditionTypeId,
  type GameContact,
  type TargetStructures,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  buildingsToState,
  physicsOf,
  productionBonusesFrom,
  type CivFull,
} from './stateService.js';

/** Deterministic noise in [-1, 1] from seed parts. */
function noiseFromSeed(seed: string, nonce: number, channel: number): number {
  let h = 2166136261 ^ channel;
  const s = `${seed}:${nonce}:${channel}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2000) / 1000 - 1;
}

type ContactWithThread = Contact & {
  thread?: { id: string; trust: number; tension: number; status: string } | null;
  target?: { name: string } | null;
};

function parseStructures(raw: string | null | undefined): TargetStructures | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TargetStructures;
  } catch {
    return null;
  }
}

export function contactToGame(c: ContactWithThread, targetName?: string | null): GameContact {
  let botName: string | null = null;
  if (c.targetBotData) {
    try {
      const bot = JSON.parse(c.targetBotData) as { name?: string };
      botName = bot.name ?? null;
    } catch {
      botName = null;
    }
  }
  const conf = c.confidence;
  const structures = parseStructures(c.targetStructures);
  const reconLevel = c.reconLevel ?? 0;
  // Only show estimate after some recon or high confidence
  const showEstimate = reconLevel > 0 || conf >= 0.55;
  return {
    id: c.id,
    distance: c.distance,
    distanceNoise: c.distanceNoise,
    levelMin: c.levelMin,
    levelMax: c.levelMax,
    confidence: conf,
    signalType: c.signalType,
    coordinates: {
      x: Math.round(c.coordinatesX * 10) / 10,
      y: Math.round(c.coordinatesY * 10) / 10,
      z: Math.round(c.coordinatesZ * 10) / 10,
    },
    coordinatesAccuracy: c.coordinatesAccuracy,
    galaxyName: c.galaxyName,
    sectorName: c.sectorName,
    systemName: c.systemName,
    status: c.isDestroyed ? 'destroyed' : c.status,
    firstDetectedAt: c.firstDetectedAt.toISOString(),
    lastUpdated: c.lastUpdated.toISOString(),
    displayName: targetName || botName || 'Терра Инкогнита',
    isRealPlayer: !!c.targetCivilizationId && !c.isFalsePositive,
    fuzzy: conf < 0.5,
    threadId: c.thread?.id ?? null,
    trust: c.thread != null ? c.thread.trust : null,
    tension: c.thread != null ? c.thread.tension : null,
    threadStatus: c.thread?.status ?? null,
    isDestroyed: !!c.isDestroyed,
    defenseStatus: c.defenseStatus ?? null,
    structureEstimate: showEstimate ? estimateStructuresForUi(structures, conf) : null,
    reconLevel,
  };
}

export async function recomputeAndStoreSignalExposure(
  tx: Prisma.TransactionClient,
  civ: CivFull
): Promise<number> {
  const buildingStates = buildingsToState(civ.buildings);
  const bonuses = productionBonusesFrom(civ);
  const totalProd =
    (civ.resources
      ? // rough rate from bonuses passive + he estimate not needed; use mined proxy
        0
      : 0) +
    (bonuses.passive.highEnergy ?? 0) +
    (bonuses.passive.antimatter ?? 0) +
    (bonuses.passive.darkEnergy ?? 0) +
    (bonuses.passive.darkMatter ?? 0) +
    (bonuses.passive.fermions ?? 0);

  // Approximate HE production from collider levels
  const collider = getBuildingLevel(buildingStates, 'high_energy_collider');
  const heApprox = collider * 0.5 * (1 + civ.level * 0.02);
  const phys = physicsOf(civ as { physicsLaws?: string | null });
  const exposure = calculateSignalExposure({
    civLevel: civ.level,
    totalProductionPerSec: totalProd + heApprox,
    expeditionCount: civ.successfulExpeditions,
    darkSensorLevel: getBuildingLevel(buildingStates, 'dark_sensor'),
    physicsExposureMul: phys.signalExposureMul,
  });

  await tx.civilization.update({
    where: { id: civ.id },
    data: { signalExposure: exposure },
  });
  return exposure;
}

export async function createContactFromExpedition(
  tx: Prisma.TransactionClient,
  civ: CivFull,
  expeditionType: ExpeditionTypeId,
  expeditionId: string,
  nonce: number,
  effectiveRadar: number
): Promise<{ contact: Contact; reportTitle: string; reportBody: string }> {

  const params = generateContactParameters({
    seed: civ.seed,
    nonce,
    expeditionType,
    observerLevel: civ.level,
    observerCoords: {
      x: civ.coordinatesX,
      y: civ.coordinatesY,
      z: civ.coordinatesZ,
    },
    effectiveRadar,
    expeditionId,
  });

  let targetCivilizationId: string | null = null;
  let targetBotData: string | null = JSON.stringify(params.bot);

  if (params.preferRealPlayer && !params.isFalsePositive) {
    const others = await tx.civilization.findMany({
      where: { id: { not: civ.id } },
      select: { id: true, name: true, level: true, secrecy: true },
      take: 20,
    });
    if (others.length > 0) {
      // Deterministic pick from list using nonce
      const idx = Math.abs(nonce) % others.length;
      const pick = others[idx]!;
      targetCivilizationId = pick.id;
      targetBotData = null;
      // Adjust level range toward real level if known
      const real = pick.level;
      params.levelMin = Math.max(1, real - Math.max(2, Math.floor((1 - params.levelAccuracy) * 10)));
      params.levelMax = Math.min(100, real + Math.max(2, Math.floor((1 - params.levelAccuracy) * 10)));
    }
  }

  // True coords near reported with noise scaled by accuracy (battleship fog)
  const spread = Math.max(8, params.distanceNoise * 0.25 * (1 - params.coordinatesAccuracy));
  const trueX = params.coordinatesX + (params.bot.coordinates.x % 7) - 3 + noiseFromSeed(civ.seed, nonce, 1) * spread;
  const trueY = params.coordinatesY + (params.bot.coordinates.y % 7) - 3 + noiseFromSeed(civ.seed, nonce, 2) * spread;
  const trueZ = params.coordinatesZ + (params.bot.coordinates.z % 5) - 2 + noiseFromSeed(civ.seed, nonce, 3) * spread * 0.3;
  const structures = generateTargetStructures(civ.seed, `pre_${nonce}_${expeditionId}`, params.bot.level);

  const contact = await tx.contact.create({
    data: {
      observerCivilizationId: civ.id,
      targetCivilizationId,
      targetBotData,
      distance: params.distance,
      distanceAccuracy: params.distanceAccuracy,
      distanceNoise: params.distanceNoise,
      levelMin: params.levelMin,
      levelMax: params.levelMax,
      levelAccuracy: params.levelAccuracy,
      confidence: params.confidence,
      signalType: params.signalType,
      coordinatesX: params.coordinatesX,
      coordinatesY: params.coordinatesY,
      coordinatesZ: params.coordinatesZ,
      coordinatesAccuracy: params.coordinatesAccuracy,
      galaxyName: params.galaxyName,
      sectorName: params.sectorName,
      systemName: params.systemName,
      isFalsePositive: params.isFalsePositive,
      status: 'detected',
      sourceExpeditionId: expeditionId,
      targetStructures: JSON.stringify(structures),
      trueCoordinatesX: trueX,
      trueCoordinatesY: trueY,
      trueCoordinatesZ: trueZ,
      defenseStatus: 'intact',
      isDestroyed: false,
      reconLevel: 0,
    },
  });

  return {
    contact,
    reportTitle: params.reportTitle,
    reportBody: params.reportBody,
  };
}

export async function listContactsForUser(
  userId: string,
  status?: string
): Promise<GameContact[]> {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const contacts = await prisma.contact.findMany({
    where: {
      observerCivilizationId: civ.id,
      ...(status ? { status } : {}),
    },
    orderBy: { firstDetectedAt: 'desc' },
    include: {
      target: { select: { name: true } },
      thread: { select: { id: true, trust: true, tension: true, status: true } },
    },
  });

  return contacts.map((c) => contactToGame(c, c.target?.name));
}

export async function getContactForUser(
  userId: string,
  contactId: string
): Promise<GameContact & { raw?: never }> {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, observerCivilizationId: civ.id },
    include: {
      target: { select: { name: true } },
      thread: { select: { id: true, trust: true, tension: true, status: true } },
    },
  });
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 'Контакт не найден', 404);

  return contactToGame(contact, contact.target?.name);
}

export async function debugCreateRandomContact(userId: string): Promise<{
  contact: GameContact;
  stateHint: string;
}> {

  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: {
      resources: true,
      buildings: true,
      artifacts: true,
      discoveredAnomalies: true,
      expeditions: { where: { status: 'active' }, take: 1 },
      journal: { take: 1 },
    },
  });
  if (!civ || !civ.resources) {
    throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  }

  const full = civ as unknown as CivFull;
  const nonce = civ.expeditionNonce + 1000 + Math.floor(Math.random() * 10000);

  const result = await prisma.$transaction(async (tx) => {
    const created = await createContactFromExpedition(
      tx,
      full,
      'deepExpedition',
      `debug_${Date.now()}`,
      nonce,
      60
    );
    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'signal',
        title: created.reportTitle,
        message: created.reportBody + '\n[DEBUG]',
        payload: JSON.stringify({ contactId: created.contact.id, debug: true }),
      },
    });
    await recomputeAndStoreSignalExposure(tx, full);
    return created;
  });

  const withTarget = await prisma.contact.findUnique({
    where: { id: result.contact.id },
    include: { target: { select: { name: true } } },
  });

  return {
    contact: contactToGame(withTarget!, withTarget?.target?.name),
    stateHint: 'contact_created',
  };
}

export async function debugBumpSignalExposure(userId: string, delta = 0.25): Promise<number> {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  const next = Math.round((civ.signalExposure + delta) * 1000) / 1000;
  await prisma.civilization.update({
    where: { id: civ.id },
    data: { signalExposure: next },
  });
  return next;
}
