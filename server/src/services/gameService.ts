import type { Prisma } from '@prisma/client';
import {
  ANOMALY_CATALOG,
  ARTIFACT_SLOT_LIMIT,
  ARTIFACTS_BY_KEY,
  ARTIFACT_CATALOG,
  BASE_CAPACITY,
  BUILDING_ORDER,
  BUILDINGS,
  JOURNAL_MAX,
  OFFLINE_CAP_MS,
  STARTING_HIGH_ENERGY,
  applyProductionTick,
  buildingUpgradeCost,
  canLevelUp,
  canStartExpeditionType,
  canUpgradeBuilding,
  civilizationLevelCostDarkEnergy,
  civilizationLevelCostHe,
  effectiveRadar,
  expeditionCost,
  expeditionDurationSec,
  generateSeed,
  generateWorld,
  getBuildingLevel,
  highEnergyCapacity,
  prosperityScore,
  resolveExpeditionV2,
  resourceCapacities,
  shopBonusesFromResourceState,
  type BuildingId,
  type BuildingState,
  type CivilizationFocuses,
  type CivilizationState,
  type DiscoveredAnomalyType,
  type ExpeditionTypeId,
  type GameState,
  type ResourceState,
  generateSolarSystem,
  STARTING_POPULATION,
  SPECIES_IDS,
  defaultGovernment,
  isSpeciesId,
  isPoliticalRegimeId,
  type SpeciesId,
  type PoliticalRegimeId,
  populationDelta,
  COLONIZE_COST_HE,
  COLONIZE_COST_FERMIONS,
  COLONIZE_MIN_CIV_LEVEL,
  canColonizePlanet,
  REGIME_CHANGE_COST_HE,
  REGIME_CHANGE_COST_FERMIONS,
  PARLIAMENT_MIN_LEVEL,
  type PlanetTypeId,
  type AtmosphereId,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  anomalyTypesOf,
  artifactKeysOf,
  buildingsToState,
  focusesFromCiv,
  productionBonusesFrom,
  physicsOf,
  toGameState,
  worldFromCiv,
  type CivFull,
} from './stateService.js';
import {
  createContactFromExpedition,
  debugBumpSignalExposure,
  debugCreateRandomContact,
  recomputeAndStoreSignalExposure,
} from './contactService.js';
import { catchUpCombatForCiv } from './combatService.js';
import { completeGalaxyTravelIfDue } from './lateGameService.js';
import { computeAndStoreProsperity } from './prosperityService.js';
import type { CreateCivilizationInput } from '../schemas/index.js';

function capsFor(
  buildings: BuildingState[],
  level: number,
  resources?: {
    capacityBonusHe?: number;
    capacityBonusFermions?: number;
    capacityBonusAll?: number;
    highEnergyCapacity?: number;
    antimatterCapacity?: number;
    darkEnergyCapacity?: number;
    darkMatterCapacity?: number;
    fermionsCapacity?: number;
  } | null
) {
  const base = resourceCapacities(
    buildings,
    level,
    resources ? shopBonusesFromResourceState(resources) : {}
  );
  if (!resources) return base;
  // Preserve debug/late-game expanded capacities across production ticks
  return {
    highEnergy: Math.max(base.highEnergy, resources.highEnergyCapacity ?? 0),
    antimatter: Math.max(base.antimatter, resources.antimatterCapacity ?? 0),
    darkEnergy: Math.max(base.darkEnergy, resources.darkEnergyCapacity ?? 0),
    darkMatter: Math.max(base.darkMatter, resources.darkMatterCapacity ?? 0),
    fermions: Math.max(base.fermions, resources.fermionsCapacity ?? 0),
  };
}

const civInclude = {
  resources: true,
  buildings: true,
  expeditions: {
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
  journal: {
    orderBy: { createdAt: 'desc' as const },
    take: JOURNAL_MAX,
  },
  artifacts: {
    orderBy: { createdAt: 'desc' as const },
  },
  discoveredAnomalies: {
    orderBy: { createdAt: 'desc' as const },
  },
  contactsObserved: {
    orderBy: { firstDetectedAt: 'desc' as const },
    take: 50,
    include: {
      target: { select: { name: true } },
      thread: { select: { id: true, trust: true, tension: true, status: true } },
    },
  },
  combatActionsAttack: {
    orderBy: { createdAt: 'desc' as const },
    take: 30,
  },
  combatReportsAttack: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
} satisfies Prisma.CivilizationInclude;

export async function loadCivForUser(userId: string): Promise<CivFull | null> {
  return prisma.civilization.findUnique({
    where: { userId },
    include: civInclude,
  }) as Promise<CivFull | null>;
}

function resourcesFromDb(r: NonNullable<CivFull['resources']>): ResourceState {
  return {
    highEnergy: r.highEnergy,
    antimatter: r.antimatter,
    darkEnergy: r.darkEnergy,
    darkMatter: r.darkMatter,
    fermions: r.fermions,
    highEnergyCapacity: r.highEnergyCapacity,
    antimatterCapacity: r.antimatterCapacity,
    darkEnergyCapacity: r.darkEnergyCapacity,
    darkMatterCapacity: r.darkMatterCapacity,
    fermionsCapacity: r.fermionsCapacity,
  };
}

function toCivState(civ: CivFull): CivilizationState {
  return {
    id: civ.id,
    name: civ.name,
    seed: civ.seed,
    level: civ.level,
    prosperityScore: civ.prosperityScore,
    focuses: focusesFromCiv(civ),
    world: worldFromCiv(civ),
    createdAt: civ.createdAt.toISOString(),
  };
}

function addJournal(
  tx: Prisma.TransactionClient,
  civilizationId: string,
  type: string,
  title: string,
  message: string,
  payload?: unknown
) {
  return tx.journalEvent.create({
    data: {
      civilizationId,
      type,
      title,
      message,
      payload: payload === undefined ? null : JSON.stringify(payload),
    },
  });
}

function reloadInclude() {
  return {
    resources: true,
    buildings: true,
    expeditions: {
      where: { status: 'active' as const },
      orderBy: { createdAt: 'desc' as const },
    },
    journal: {
      orderBy: { createdAt: 'desc' as const },
      take: JOURNAL_MAX,
    },
    artifacts: { orderBy: { createdAt: 'desc' as const } },
    discoveredAnomalies: { orderBy: { createdAt: 'desc' as const } },
    contactsObserved: {
      orderBy: { firstDetectedAt: 'desc' as const },
      take: 50,
      include: {
        target: { select: { name: true as const } },
        thread: { select: { id: true, trust: true, tension: true, status: true } },
      },
    },
    combatActionsAttack: {
      orderBy: { createdAt: 'desc' as const },
      take: 30,
    },
    combatReportsAttack: {
      orderBy: { createdAt: 'desc' as const },
      take: 20,
    },
  };
}

export async function catchUpInTx(
  tx: Prisma.TransactionClient,
  civId: string,
  now = new Date()
): Promise<CivFull> {
  let civ = (await tx.civilization.findUnique({
    where: { id: civId },
    include: reloadInclude(),
  })) as CivFull | null;

  if (!civ || !civ.resources) {
    throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  }

  for (const exp of civ.expeditions) {
    if (exp.status === 'active' && exp.finishesAt.getTime() <= now.getTime()) {
      await completeExpeditionInTx(tx, civ, exp.id);
      civ = (await tx.civilization.findUnique({
        where: { id: civId },
        include: reloadInclude(),
      })) as CivFull;
    }
  }

  if (!civ.resources) {
    throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
  }

  const elapsedMs = Math.max(0, now.getTime() - civ.lastTickAt.getTime());
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  const seconds = Math.floor(cappedMs / 1000);

  if (seconds > 0) {
    const buildingStates = buildingsToState(civ.buildings);
    const civState = toCivState(civ);
    const res = resourcesFromDb(civ.resources);
    const bonuses = productionBonusesFrom(civ);
    const tick = applyProductionTick(
      res,
      buildingStates,
      civState,
      seconds,
      civ.highEnergyMilliRem,
      bonuses
    );

    const newMined = civ.totalHighEnergyMined + tick.minedHe;
    const prosperity = prosperityScore(
      civ.level,
      buildingStates,
      civ.successfulExpeditions,
      newMined
    );
    const caps = capsFor(buildingStates, civ.level, civ.resources);

    await tx.resourceState.update({
      where: { civilizationId: civId },
      data: {
        highEnergy: tick.resources.highEnergy,
        antimatter: tick.resources.antimatter,
        darkEnergy: tick.resources.darkEnergy,
        darkMatter: tick.resources.darkMatter,
        fermions: tick.resources.fermions,
        highEnergyCapacity: caps.highEnergy,
        antimatterCapacity: caps.antimatter,
        darkEnergyCapacity: caps.darkEnergy,
        darkMatterCapacity: caps.darkMatter,
        fermionsCapacity: caps.fermions,
      },
    });

    const advanced = new Date(civ.lastTickAt.getTime() + seconds * 1000);
    const nextTickAt = elapsedMs > OFFLINE_CAP_MS ? now : advanced;

    await tx.civilization.update({
      where: { id: civId },
      data: {
        lastTickAt: nextTickAt,
        highEnergyMilliRem: tick.highEnergyMilliRemainder,
        totalHighEnergyMined: newMined,
        prosperityScore: prosperity,
        population: BigInt(
          Math.max(
            0,
            Number((civ as { population?: bigint | number }).population ?? STARTING_POPULATION) +
              populationDelta({
                population: Number((civ as { population?: bigint | number }).population ?? STARTING_POPULATION),
                colonies: Number((civ as { colonies?: number }).colonies ?? 1),
                civLevel: civ.level,
                highEnergy: tick.resources.highEnergy,
                highEnergyCapacity: caps.highEnergy,
                species: ((civ as { species?: string }).species ?? 'HUMAN') as SpeciesId,
                regime: ((civ as { politicalRegime?: string }).politicalRegime ??
                  'DEMOCRACY') as PoliticalRegimeId,
                infrastructureScore: buildingStates.reduce((s, b) => s + b.level, 0),
                seconds,
              })
          )
        ),
      },
    });
  }

  // Stage 6: resolve pending combat prep/transit
  civ = (await tx.civilization.findUnique({
    where: { id: civId },
    include: reloadInclude(),
  })) as CivFull;
  if (civ) {
    await catchUpCombatForCiv(tx, civ);
  }

  // Stage 8: finish intergalactic travel if due
  await completeGalaxyTravelIfDue(tx, civId);

  civ = (await tx.civilization.findUnique({
    where: { id: civId },
    include: reloadInclude(),
  })) as CivFull;
  if (civ) {
    await computeAndStoreProsperity(tx, {
      ...civ,
      contactsObserved: civ.contactsObserved?.map((c) => ({
        isDestroyed: !!(c as { isDestroyed?: boolean }).isDestroyed,
        status: (c as { status: string }).status,
      })),
    });
  }

  return (await tx.civilization.findUnique({
    where: { id: civId },
    include: reloadInclude(),
  })) as CivFull;
}

async function completeExpeditionInTx(
  tx: Prisma.TransactionClient,
  civ: CivFull,
  expeditionId: string
): Promise<void> {
  if (!civ.resources) {
    throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
  }

  const exp = await tx.expedition.findFirst({
    where: { id: expeditionId, civilizationId: civ.id, status: 'active' },
  });
  if (!exp) return;

  const nonce = civ.expeditionNonce + 1;
  const buildingStates = buildingsToState(civ.buildings);
  const keys = artifactKeysOf(civ.artifacts ?? []);
  const aTypes = anomalyTypesOf(civ.discoveredAnomalies ?? []);
  const expeditionType = (exp.expeditionType || exp.type || 'localScan') as ExpeditionTypeId;

  const result = resolveExpeditionV2({
    civSeed: civ.seed,
    nonce,
    expeditionType,
    civLevel: civ.level,
    focuses: focusesFromCiv(civ),
    buildings: buildingStates,
    baseRadar: civ.radarQuality,
    artifactKeys: keys,
    anomalyTypes: aTypes,
    expeditionId: exp.id,
  });

  let he = civ.resources.highEnergy;
  let am = civ.resources.antimatter;
  let de = civ.resources.darkEnergy;
  let dm = civ.resources.darkMatter;
  let fm = civ.resources.fermions;

  const add = (cur: number, n?: number) => cur + Math.max(0, Math.floor(n ?? 0));
  const sub = (cur: number, n?: number) => Math.max(0, cur - Math.max(0, Math.floor(n ?? 0)));

  he = add(he, result.resourcesGained.highEnergy);
  am = add(am, result.resourcesGained.antimatter);
  de = add(de, result.resourcesGained.darkEnergy);
  dm = add(dm, result.resourcesGained.darkMatter);
  fm = add(fm, result.resourcesGained.fermions);

  he = sub(he, result.resourcesLost.highEnergy);
  am = sub(am, result.resourcesLost.antimatter);
  de = sub(de, result.resourcesLost.darkEnergy);
  dm = sub(dm, result.resourcesLost.darkMatter);
  fm = sub(fm, result.resourcesLost.fermions);

  let level = civ.level;
  if (result.civLevelsGained && result.civLevelsGained > 0) {
    level = Math.min(100, level + result.civLevelsGained);
  }

  if (result.buildingLevelsGained && result.buildingLevelsGained > 0) {
    for (const b of civ.buildings) {
      if (
        b.buildingType === 'high_energy_collider' ||
        b.buildingType === 'research_node' ||
        b.buildingType === 'dark_sensor'
      ) {
        await tx.building.update({
          where: { id: b.id },
          data: { level: b.level + result.buildingLevelsGained },
        });
      }
    }
  }

  const refreshedBuildings = (await tx.building.findMany({
    where: { civilizationId: civ.id },
  })) as BuildingState[] extends never ? never : typeof civ.buildings;
  const bStates = buildingsToState(refreshedBuildings);
  const caps = capsFor(bStates, level, civ.resources);
  he = Math.min(he, caps.highEnergy);
  am = Math.min(am, caps.antimatter);
  de = Math.min(de, caps.darkEnergy);
  dm = Math.min(dm, caps.darkMatter);
  fm = Math.min(fm, caps.fermions);

  await tx.resourceState.update({
    where: { civilizationId: civ.id },
    data: {
      highEnergy: he,
      antimatter: am,
      darkEnergy: de,
      darkMatter: dm,
      fermions: fm,
      highEnergyCapacity: caps.highEnergy,
      antimatterCapacity: caps.antimatter,
      darkEnergyCapacity: caps.darkEnergy,
      darkMatterCapacity: caps.darkMatter,
      fermionsCapacity: caps.fermions,
    },
  });

  if (result.artifactKey) {
    const def = ARTIFACTS_BY_KEY[result.artifactKey];
    if (def) {
      const count = await tx.artifact.count({ where: { civilizationId: civ.id } });
      if (count < ARTIFACT_SLOT_LIMIT) {
        await tx.artifact.create({
          data: {
            civilizationId: civ.id,
            artifactKey: def.key,
            name: def.nameRu,
            rarity: def.rarity,
            effects: JSON.stringify(def.effects),
            sourceExpeditionId: exp.id,
          },
        });
      }
    }
  }

  if (result.anomalyType) {
    const aDef = ANOMALY_CATALOG[result.anomalyType as DiscoveredAnomalyType];
    if (aDef) {
      await tx.discoveredAnomaly.create({
        data: {
          civilizationId: civ.id,
          anomalyType: aDef.type,
          name: aDef.nameRu,
          description: aDef.descriptionRu,
          effects: JSON.stringify({
            radarBonus: aDef.radarBonus,
            passiveHePerSec: aDef.passiveHePerSec,
            passiveAntimatterPerSec: aDef.passiveAntimatterPerSec,
            passiveDarkEnergyPerSec: aDef.passiveDarkEnergyPerSec,
            passiveDarkMatterPerSec: aDef.passiveDarkMatterPerSec,
            passiveFermionsPerSec: aDef.passiveFermionsPerSec,
            expeditionDurationMul: aDef.expeditionDurationMul,
            trapRiskMul: aDef.trapRiskMul,
            danger: aDef.danger,
          }),
          sectorSeed: result.sectorCode,
        },
      });
    }
  }

  const successfulExpeditions = civ.successfulExpeditions + 1;
  const gainedHe = Math.floor(result.resourcesGained.highEnergy ?? 0);
  const totalMined = civ.totalHighEnergyMined + gainedHe;
  const prosperity = prosperityScore(level, bStates, successfulExpeditions, totalMined);

  const grants4d = !!result.grants4DAccess;

  let contactId: string | undefined;
  let contactReport: { title: string; body: string } | null = null;

  if (result.createContact && expeditionType !== 'localScan') {
    const effRadar = effectiveRadar({
      baseRadar: civ.radarQuality,
      buildings: bStates,
      artifactKeys: keys,
      anomalyTypes: aTypes,
    });
    const created = await createContactFromExpedition(
      tx,
      { ...civ, level, successfulExpeditions } as CivFull,
      expeditionType,
      exp.id,
      nonce,
      effRadar
    );
    contactId = created.contact.id;
    contactReport = { title: created.reportTitle, body: created.reportBody };
  }

  await tx.civilization.update({
    where: { id: civ.id },
    data: {
      expeditionNonce: nonce,
      successfulExpeditions,
      totalHighEnergyMined: totalMined,
      prosperityScore: prosperity,
      level,
      ...(grants4d ? { has4DRiftAccess: true } : {}),
    },
  });

  // Refresh signal exposure after expedition activity
  const civForExposure = (await tx.civilization.findUnique({
    where: { id: civ.id },
    include: reloadInclude(),
  })) as CivFull;
  await recomputeAndStoreSignalExposure(tx, civForExposure);

  await tx.expedition.update({
    where: { id: exp.id },
    data: {
      status: 'completed',
      result: JSON.stringify(result),
      outcomeType: result.outcomeType,
      rewardData: JSON.stringify({
        resourcesGained: result.resourcesGained,
        resourcesLost: result.resourcesLost,
        artifactKey: result.artifactKey,
        anomalyType: result.anomalyType,
        contactId,
      }),
    },
  });

  const journalType =
    result.journalStyle === 'artifact'
      ? 'artifact'
      : result.journalStyle === 'trap'
        ? 'trap'
        : result.journalStyle === 'rift'
          ? 'rift'
          : result.journalStyle === 'signal' || result.createContact
            ? 'signal'
            : result.journalStyle === 'boost'
              ? 'boost'
              : result.journalStyle === 'paradox'
                ? 'paradox'
                : 'expedition';

  if (contactReport) {
    await addJournal(tx, civ.id, 'signal', contactReport.title, contactReport.body, {
      outcomeType: 'signalDetected',
      expeditionType,
      contactId,
    });
  } else {
    await addJournal(tx, civ.id, journalType, result.title, result.body, {
      outcomeType: result.outcomeType,
      expeditionType,
    });
  }
}


/** Stage 9 — brief in-memory state cache (1.5s) to absorb client poll storms. */
const stateCache = new Map<string, { at: number; state: GameState }>();
const STATE_CACHE_MS = 1500;

export function invalidateStateCache(userId?: string) {
  if (userId) stateCache.delete(userId);
  else stateCache.clear();
}

export async function getUserCivilizationState(userId: string): Promise<GameState | null> {
  const hit = stateCache.get(userId);
  if (hit && Date.now() - hit.at < STATE_CACHE_MS) return hit.state;

  const existing = await loadCivForUser(userId);
  if (!existing) return null;
  const [civ, user] = await Promise.all([
    prisma.$transaction(async (tx) => catchUpInTx(tx, existing.id)),
    prisma.user.findUnique({ where: { id: userId }, select: { premiumCredits: true } }),
  ]);
  const state = toGameState(civ);
  state.premiumCredits = user?.premiumCredits ?? 0;
  stateCache.set(userId, { at: Date.now(), state });
  return state;
}

export async function createCivilization(
  userId: string,
  input: CreateCivilizationInput
): Promise<GameState> {
  invalidateStateCache();

  const existing = await prisma.civilization.findUnique({ where: { userId } });
  if (existing) {
    throw new AppError('CIV_EXISTS', 'У вас уже есть цивилизация', 409);
  }

  const focuses: CivilizationFocuses = { ...input.constants };
  const seed = generateSeed(input.name);
  const world = generateWorld(seed, focuses);
  const now = new Date();

  const speciesRaw = (input as { species?: string }).species;
  const species: SpeciesId = isSpeciesId(speciesRaw)
    ? speciesRaw
    : SPECIES_IDS[Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % SPECIES_IDS.length]!;
  const regimeRaw = (input as { politicalRegime?: string }).politicalRegime;
  const politicalRegime: PoliticalRegimeId = isPoliticalRegimeId(regimeRaw)
    ? regimeRaw
    : 'DEMOCRACY';
  const governmentForm: string =
    typeof (input as { governmentForm?: string }).governmentForm === 'string' &&
    (input as { governmentForm?: string }).governmentForm
      ? String((input as { governmentForm: string }).governmentForm)
      : defaultGovernment(species);
  const sol = generateSolarSystem(seed, world.systemName);


  const buildingData = BUILDING_ORDER.map((buildingType) => ({
    buildingType,
    level: buildingType === 'high_energy_collider' ? 1 : 0,
  }));

  const buildingStates: BuildingState[] = buildingData.map((b) => ({
    buildingType: b.buildingType as BuildingId,
    level: b.level,
  }));
  const caps = capsFor(buildingStates, 1, null);

  const civ = await prisma.$transaction(async (tx) => {
    const created = await tx.civilization.create({
      data: {
        userId,
        name: input.name.trim(),
        seed,
        level: 1,
        prosperityScore: prosperityScore(1, buildingStates, 0, 0),
        greatStructureName: world.greatStructureName,
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
        scienceFocus: focuses.scienceFocus,
        expansionFocus: focuses.expansionFocus,
        secrecy: focuses.secrecy,
        aggression: focuses.aggression,
        diplomacyFocus: focuses.diplomacyFocus,
        riskLevel: focuses.riskLevel,
        lastTickAt: now,
        has4DRiftAccess: false,
        species,
        politicalRegime,
        governmentForm,
        population: BigInt(STARTING_POPULATION),
        colonies: 1,
        resources: {
          create: {
            highEnergy: STARTING_HIGH_ENERGY,
            antimatter: 0,
            darkEnergy: 0,
            darkMatter: 0,
            fermions: 0,
            highEnergyCapacity: caps.highEnergy,
            antimatterCapacity: caps.antimatter,
            darkEnergyCapacity: caps.darkEnergy,
            darkMatterCapacity: caps.darkMatter,
            fermionsCapacity: caps.fermions,
          },
        },
        buildings: { create: buildingData },
      },
    });

    const system = await tx.solarSystem.create({
      data: {
        seed: sol.seed,
        name: sol.name,
        starClass: sol.star.class,
        starTemperature: sol.star.temperature,
        starLuminosity: sol.star.luminosity,
        starMass: sol.star.mass,
        starAgeGyr: sol.star.ageGyr,
        starColor: sol.star.color,
        ownerCivilizationId: created.id,
        planets: {
          create: sol.planets.map((pl) => ({
            planetKey: pl.key,
            indexInSystem: pl.index,
            name: pl.isHomeworld ? world.mainPlanetName : pl.name,
            type: pl.type,
            atmosphere: pl.atmosphere,
            gravity: pl.gravity,
            moons: pl.moons,
            cosmicDust: pl.cosmicDust,
            radiation: pl.radiation,
            temperatureDay: pl.temperatureDay,
            temperatureNight: pl.temperatureNight,
            resourcesJson: JSON.stringify(pl.resources),
            orbitRadius: pl.orbitRadius,
            hue: pl.hue,
            isHomeworld: pl.isHomeworld,
            colonized: pl.isHomeworld,
            ownerCivilizationId: pl.isHomeworld ? created.id : null,
          })),
        },
      },
      include: { planets: true },
    });
    const homeDb = system.planets.find((x) => x.isHomeworld) ?? system.planets[0]!;
    await tx.civilization.update({
      where: { id: created.id },
      data: {
        homeSolarSystemId: system.id,
        homePlanetId: homeDb.id,
        mainPlanetName: homeDb.name,
        mainPlanetType: homeDb.type,
        systemName: system.name,
      },
    });

    await addJournal(
      tx,
      created.id,
      'system',
      'Цивилизация основана',
      `Сид: ${seed}. Раса: ${species}. Режим: ${politicalRegime}. ` +
        `Локация: ${world.galaxyName} / ${world.sectorName} / ${system.name}. ` +
        `Великая структура: ${world.greatStructureName}. ` +
        `Население: ${STARTING_POPULATION}. Родной мир: ${homeDb.name}. ` +
        `Радар: ${world.radarQuality}. Статус окрестностей: Терра Инкогнита.`
    );
    await addJournal(
      tx,
      created.id,
      'system',
      'Протокол наблюдения',
      'Вселенная детерминирована, вероятностна и не случайна. ' +
        'Рекомендация: минимизируйте сильные сигналы. Источник истины: сервер. Этап 3: экспедиции.'
    );

    return catchUpInTx(tx, created.id, now);
  });

  return toGameState(civ);
}

export async function upgradeBuilding(
  userId: string,
  buildingType: BuildingId
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();

  if (!(buildingType in BUILDINGS)) {
    throw new AppError('INVALID_BUILDING', 'Неизвестный тип постройки', 400);
  }

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    if (!civ.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);

    const buildingStates = buildingsToState(civ.buildings);
    const res = resourcesFromDb(civ.resources);
    const check = canUpgradeBuilding(buildingType, buildingStates, res, civ.level);
    if (!check.ok) {
      throw new AppError('UPGRADE_DENIED', check.reason ?? 'Улучшение невозможно', 400);
    }

    const level = getBuildingLevel(buildingStates, buildingType);
    const cost = buildingUpgradeCost(buildingType, level);
    const newLevel = level + 1;
    const nextHe = civ.resources.highEnergy - cost;
    if (nextHe < 0) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно высоких энергий', 400);
    }

    const nextBuildings = buildingStates.map((b) =>
      b.buildingType === buildingType ? { ...b, level: newLevel } : b
    );
    const caps = capsFor(nextBuildings, civ.level, civ.resources);

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: nextHe,
        highEnergyCapacity: caps.highEnergy,
        antimatterCapacity: caps.antimatter,
        darkEnergyCapacity: caps.darkEnergy,
        darkMatterCapacity: caps.darkMatter,
        fermionsCapacity: caps.fermions,
      },
    });

    await tx.building.upsert({
      where: {
        civilizationId_buildingType: { civilizationId: civ.id, buildingType },
      },
      create: { civilizationId: civ.id, buildingType, level: newLevel },
      update: { level: newLevel },
    });

    const prosperity = prosperityScore(
      civ.level,
      nextBuildings,
      civ.successfulExpeditions,
      civ.totalHighEnergyMined
    );
    await tx.civilization.update({
      where: { id: civ.id },
      data: { prosperityScore: prosperity },
    });

    const names: Record<string, string> = {
      high_energy_collider: 'Коллайдер высоких энергий',
      research_node: 'Исследовательский узел',
      probe_factory: 'Зондовый завод',
      fermion_synthesizer: 'Фермионный синтезатор',
      dark_sensor: 'Тёмный сенсор',
      dark_energy_siphon: 'Сифон вакуума',
    };
    const title = `Улучшение: ${names[buildingType] ?? buildingType}`;
    const message = `Объект повышен до уровня ${newLevel}. Списано высоких энергий: ${cost}.`;
    await addJournal(tx, civ.id, 'upgrade', title, message);

    const fresh = await catchUpInTx(tx, civ.id);
    return {
      state: toGameState(fresh),
      report: { type: 'upgrade_building', title, message },
    };
  });
}

export async function levelUpCivilization(
  userId: string
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    if (!civ.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);

    const res = resourcesFromDb(civ.resources);
    const check = canLevelUp(civ.level, res);
    if (!check.ok) {
      throw new AppError('LEVEL_UP_DENIED', check.reason ?? 'Повышение невозможно', 400);
    }

    const newLevel = civ.level + 1;
    const nextHe = civ.resources.highEnergy - check.costHe;
    const nextDe = civ.resources.darkEnergy - check.costDe;
    if (nextHe < 0 || nextDe < 0) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов', 400);
    }

    const buildingStates = buildingsToState(civ.buildings);
    const caps = capsFor(buildingStates, newLevel, civ.resources);

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: nextHe,
        darkEnergy: nextDe,
        highEnergyCapacity: caps.highEnergy,
        antimatterCapacity: caps.antimatter,
        darkEnergyCapacity: caps.darkEnergy,
        darkMatterCapacity: caps.darkMatter,
        fermionsCapacity: caps.fermions,
      },
    });

    const prosperity = prosperityScore(
      newLevel,
      buildingStates,
      civ.successfulExpeditions,
      civ.totalHighEnergyMined
    );

    await tx.civilization.update({
      where: { id: civ.id },
      data: { level: newLevel, prosperityScore: prosperity },
    });

    const title = `Уровень цивилизации: ${newLevel}`;
    const message =
      `Списано ВЭ: ${check.costHe}` +
      (check.costDe > 0 ? `, ТЭ: ${check.costDe}` : '') +
      `. Процветание: ${prosperity}.`;
    await addJournal(tx, civ.id, 'level_up', title, message);

    const fresh = await catchUpInTx(tx, civ.id);
    return {
      state: toGameState(fresh),
      report: { type: 'level_up', title, message },
    };
  });
}

const VALID_EXPEDITION_TYPES: ExpeditionTypeId[] = [
  'localScan',
  'probeSurvey',
  'deepExpedition',
  'rift4D',
];

export async function startExpedition(
  userId: string,
  expeditionType: ExpeditionTypeId
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();

  if (!VALID_EXPEDITION_TYPES.includes(expeditionType)) {
    throw new AppError('INVALID_EXPEDITION', 'Неизвестный тип экспедиции', 400);
  }

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    if (!civ.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);

    const active = civ.expeditions.find((e) => e.status === 'active');
    if (active) {
      throw new AppError(
        'EXPEDITION_ACTIVE',
        'Экспедиция уже активна. Дождитесь возвращения зонда.',
        409
      );
    }

    const buildingStates = buildingsToState(civ.buildings);
    const keys = artifactKeysOf(civ.artifacts ?? []);
    const aTypes = anomalyTypesOf(civ.discoveredAnomalies ?? []);
    const unlock = canStartExpeditionType(
      expeditionType,
      civ.level,
      buildingStates,
      civ.has4DRiftAccess,
      keys
    );
    if (!unlock.ok) {
      throw new AppError('EXPEDITION_LOCKED', unlock.reasons.join('; '), 400);
    }

    const cost = expeditionCost(expeditionType, civ.level, keys);
    const r = civ.resources;
    if (
      r.highEnergy < cost.highEnergy ||
      r.antimatter < cost.antimatter ||
      r.darkEnergy < cost.darkEnergy ||
      r.darkMatter < cost.darkMatter ||
      r.fermions < cost.fermions
    ) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для экспедиции', 400);
    }

    const effRadar = effectiveRadar({
      baseRadar: civ.radarQuality,
      buildings: buildingStates,
      artifactKeys: keys,
      anomalyTypes: aTypes,
    });

    const phys = physicsOf(civ);
    const duration = expeditionDurationSec(
      expeditionType,
      civ.level,
      effRadar,
      keys,
      aTypes,
      civ.seed,
      civ.expeditionNonce + 1,
      phys.expeditionDurationMul
    );

    const now = new Date();
    const finishesAt = new Date(now.getTime() + duration * 1000);
    const expSeed = `${civ.seed}::${expeditionType}::${civ.expeditionNonce + 1}`;

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: r.highEnergy - cost.highEnergy,
        antimatter: r.antimatter - cost.antimatter,
        darkEnergy: r.darkEnergy - cost.darkEnergy,
        darkMatter: r.darkMatter - cost.darkMatter,
        fermions: r.fermions - cost.fermions,
      },
    });

    await tx.expedition.create({
      data: {
        civilizationId: civ.id,
        type: expeditionType,
        expeditionType,
        status: 'active',
        startedAt: now,
        finishesAt,
        seed: expSeed,
      },
    });

    const typeName =
      expeditionType === 'localScan'
        ? 'Локальное сканирование'
        : expeditionType === 'probeSurvey'
          ? 'Зондовая разведка'
          : expeditionType === 'deepExpedition'
            ? 'Глубокая экспедиция'
            : 'Экспедиция в 4D-разлом';

    const title = `Зонд запущен: ${typeName}`;
    const message =
      `Цель: Терра Инкогнита. Тип: ${expeditionType}. ` +
      `Стоимость: ВЭ ${cost.highEnergy}` +
      (cost.antimatter ? `, АМ ${cost.antimatter}` : '') +
      (cost.darkEnergy ? `, ТЭ ${cost.darkEnergy}` : '') +
      (cost.darkMatter ? `, ТМ ${cost.darkMatter}` : '') +
      (cost.fermions ? `, ФМ ${cost.fermions}` : '') +
      `. ETA: ${duration} с. Эфф. радар: ${effRadar}.`;

    await addJournal(tx, civ.id, 'expedition', title, message);

    const fresh = await catchUpInTx(tx, civ.id, now);
    return {
      state: toGameState(fresh),
      report: { type: 'expedition_start', title, message },
    };
  });
}

/** @deprecated Stage 2 alias — maps to localScan */
export async function startTerraIncognita(userId: string) {
  return startExpedition(userId, 'localScan');
}

export async function debugGrantResources(
  userId: string,
  grants: Partial<
    Record<'highEnergy' | 'antimatter' | 'darkEnergy' | 'darkMatter' | 'fermions', number>
  >
): Promise<GameState> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    if (!civ.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);

    const buildingStates = buildingsToState(civ.buildings);
    const baseCaps = capsFor(buildingStates, civ.level, civ.resources);
    // Preserve any debug-expanded capacities; auto-expand for large late-game grants
    const addHe = Math.floor(grants.highEnergy ?? 0);
    const addAm = Math.floor(grants.antimatter ?? 0);
    const addDe = Math.floor(grants.darkEnergy ?? 0);
    const addDm = Math.floor(grants.darkMatter ?? 0);
    const addFm = Math.floor(grants.fermions ?? 0);
    const caps = {
      highEnergy: Math.max(
        baseCaps.highEnergy,
        civ.resources.highEnergyCapacity,
        civ.resources.highEnergy + addHe
      ),
      antimatter: Math.max(
        baseCaps.antimatter,
        civ.resources.antimatterCapacity,
        civ.resources.antimatter + addAm
      ),
      darkEnergy: Math.max(
        baseCaps.darkEnergy,
        civ.resources.darkEnergyCapacity,
        civ.resources.darkEnergy + addDe
      ),
      darkMatter: Math.max(
        baseCaps.darkMatter,
        civ.resources.darkMatterCapacity,
        civ.resources.darkMatter + addDm
      ),
      fermions: Math.max(
        baseCaps.fermions,
        civ.resources.fermionsCapacity,
        civ.resources.fermions + addFm
      ),
    };

    const next = {
      highEnergy: Math.min(caps.highEnergy, civ.resources.highEnergy + addHe),
      antimatter: Math.min(caps.antimatter, civ.resources.antimatter + addAm),
      darkEnergy: Math.min(caps.darkEnergy, civ.resources.darkEnergy + addDe),
      darkMatter: Math.min(caps.darkMatter, civ.resources.darkMatter + addDm),
      fermions: Math.min(caps.fermions, civ.resources.fermions + addFm),
      highEnergyCapacity: caps.highEnergy,
      antimatterCapacity: caps.antimatter,
      darkEnergyCapacity: caps.darkEnergy,
      darkMatterCapacity: caps.darkMatter,
      fermionsCapacity: caps.fermions,
    };

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: next,
    });

    await addJournal(
      tx,
      civ.id,
      'debug',
      'DEBUG: ресурсы',
      `Начислено (сервер): ${JSON.stringify(grants)}`
    );

    return toGameState(await catchUpInTx(tx, civ.id));
  });
}

export async function debugForceLevelUp(userId: string): Promise<GameState> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  await prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    if (!civ.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
    if (civ.level >= 100) {
      throw new AppError('MAX_LEVEL', 'Максимальный уровень', 400);
    }

    const costHe = civilizationLevelCostHe(civ.level);
    const costDe = civilizationLevelCostDarkEnergy(civ.level);
    const caps = capsFor(buildingsToState(civ.buildings), civ.level, civ.resources);

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: Math.max(civ.resources.highEnergy, Math.min(caps.highEnergy, costHe)),
        darkEnergy: Math.max(civ.resources.darkEnergy, costDe),
      },
    });
  });

  const r = await levelUpCivilization(userId);
  return r.state;
}

export async function debugResetCivilization(userId: string): Promise<void> {
  invalidateStateCache();

  await prisma.civilization.deleteMany({ where: { userId } });
}

export async function debugGrantArtifact(
  userId: string,
  artifactKey?: string
): Promise<GameState> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    const count = await tx.artifact.count({ where: { civilizationId: civ.id } });
    if (count >= ARTIFACT_SLOT_LIMIT) {
      throw new AppError('ARTIFACT_LIMIT', 'Лимит артефактов (20)', 400);
    }
    const def =
      (artifactKey ? ARTIFACTS_BY_KEY[artifactKey] : null) ??
      ARTIFACT_CATALOG[Math.floor(Math.random() * ARTIFACT_CATALOG.length)]!;

    await tx.artifact.create({
      data: {
        civilizationId: civ.id,
        artifactKey: def.key,
        name: def.nameRu,
        rarity: def.rarity,
        effects: JSON.stringify(def.effects),
      },
    });
    await addJournal(tx, civ.id, 'debug', 'DEBUG: артефакт', `Выдан: ${def.nameRu} (${def.rarity})`);
    return toGameState(await catchUpInTx(tx, civ.id));
  });
}

export async function debugOpen4D(userId: string): Promise<GameState> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    await tx.civilization.update({
      where: { id: civ.id },
      data: { has4DRiftAccess: true },
    });
    await tx.discoveredAnomaly.create({
      data: {
        civilizationId: civ.id,
        anomalyType: 'rift_4d',
        name: ANOMALY_CATALOG.rift_4d.nameRu,
        description: ANOMALY_CATALOG.rift_4d.descriptionRu,
        effects: JSON.stringify({ debug: true }),
        sectorSeed: 'DEBUG-4D',
      },
    });
    await addJournal(
      tx,
      civ.id,
      'rift',
      'DEBUG: 4D-разлом',
      'Доступ к 4D-разлому принудительно открыт.'
    );
    return toGameState(await catchUpInTx(tx, civ.id));
  });
}

export async function debugSetLevel(userId: string, level: number): Promise<GameState> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  const lvl = Math.max(1, Math.min(100, Math.floor(level)));

  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    await tx.civilization.update({ where: { id: civ.id }, data: { level: lvl } });
    await addJournal(tx, civ.id, 'debug', 'DEBUG: уровень', `Уровень установлен: ${lvl}`);
    return toGameState(await catchUpInTx(tx, civ.id));
  });
}

export async function debugRandomContact(userId: string): Promise<GameState> {
  invalidateStateCache();

  await debugCreateRandomContact(userId);
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return state;
}

export async function debugIncreaseExposure(userId: string): Promise<GameState> {
  invalidateStateCache();

  await debugBumpSignalExposure(userId, 0.35);
  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    await addJournal(
      tx,
      civ.id,
      'debug',
      'DEBUG: заметность',
      `signalExposure увеличен. Текущее значение будет в состоянии.`
    );
    return toGameState(await catchUpInTx(tx, civ.id));
  });
}

/** Simulate "we were detected" journal entry (no real foreign observer in MVP). */
export async function debugSimulateDetectionOnUs(userId: string): Promise<GameState> {
  invalidateStateCache();

  const base = await loadCivForUser(userId);
  if (!base) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return prisma.$transaction(async (tx) => {
    const civ = await catchUpInTx(tx, base.id);
    await addJournal(
      tx,
      civ.id,
      'signal',
      'ПРЕДУПРЕЖДЕНИЕ: возможное обнаружение',
      `Пассивные сенсоры зафиксировали зондирующий импульс неизвестного происхождения. ` +
        `Ваша текущая заметность (signalExposure): ${civ.signalExposure.toFixed(3)}. ` +
        `Рекомендация: повысить скрытность / снизить светимость экспедиций. [DEBUG SIM]`
    );
    // bump exposure slightly as if we answered
    await tx.civilization.update({
      where: { id: civ.id },
      data: { signalExposure: Math.round((civ.signalExposure + 0.1) * 1000) / 1000 },
    });
    return toGameState(await catchUpInTx(tx, civ.id));
  });
}

// silence unused BASE_CAPACITY import if any
void BASE_CAPACITY;
void highEnergyCapacity;


export async function colonizePlanet(userId: string, planetId: string): Promise<GameState> {
  invalidateStateCache();
  const now = new Date();

  const civ = await prisma.$transaction(async (tx) => {
    let c = await catchUpInTx(tx, (await loadCivForUser(userId))!.id, now);
    if (!c) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    if (c.level < COLONIZE_MIN_CIV_LEVEL) {
      throw new AppError(
        'LEVEL_LOW',
        `Колонизация доступна с уровня ${COLONIZE_MIN_CIV_LEVEL}`,
        400
      );
    }
    const planet = await tx.planet.findUnique({ where: { id: planetId } });
    if (!planet) throw new AppError('PLANET_NOT_FOUND', 'Планета не найдена', 404);

    const system = await tx.solarSystem.findUnique({ where: { id: planet.solarSystemId } });
    if (!system || system.ownerCivilizationId !== c.id) {
      throw new AppError('FORBIDDEN', 'Система не принадлежит вам', 403);
    }
    if (planet.colonized || planet.ownerCivilizationId) {
      throw new AppError('ALREADY_COLONIZED', 'Планета уже колонизирована', 409);
    }
    const check = canColonizePlanet(
      {
        type: planet.type as PlanetTypeId,
        atmosphere: planet.atmosphere as AtmosphereId,
        gravity: planet.gravity,
        radiation: planet.radiation as 'MINIMAL' | 'MODERATE' | 'HIGH' | 'LETHAL',
        isHomeworld: planet.isHomeworld,
      },
      false
    );
    if (!check.ok) {
      throw new AppError('CANNOT_COLONIZE', check.reasons.join('; ') || 'Нельзя колонизировать', 400);
    }
    if (!c.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
    if (c.resources.highEnergy < COLONIZE_COST_HE || c.resources.fermions < COLONIZE_COST_FERMIONS) {
      throw new AppError(
        'INSUFFICIENT_RESOURCES',
        `Нужно ${COLONIZE_COST_HE} ВЭ и ${COLONIZE_COST_FERMIONS} фермионов`,
        400
      );
    }

    await tx.resourceState.update({
      where: { civilizationId: c.id },
      data: {
        highEnergy: c.resources.highEnergy - COLONIZE_COST_HE,
        fermions: c.resources.fermions - COLONIZE_COST_FERMIONS,
      },
    });
    await tx.planet.update({
      where: { id: planet.id },
      data: { colonized: true, ownerCivilizationId: c.id },
    });
    const colonies = Number((c as { colonies?: number }).colonies ?? 1) + 1;
    await tx.civilization.update({
      where: { id: c.id },
      data: { colonies },
    });
    await addJournal(
      tx,
      c.id,
      'system',
      'Колония основана',
      `Планета ${planet.name} колонизирована. Колоний: ${colonies}.`
    );
    return catchUpInTx(tx, c.id, now);
  });

  return toGameState(civ);
}

export async function changePoliticalRegime(
  userId: string,
  regime: string
): Promise<GameState> {
  invalidateStateCache();
  if (!isPoliticalRegimeId(regime)) {
    throw new AppError('INVALID_REGIME', 'Неизвестный политический режим', 400);
  }
  const now = new Date();
  const civ = await prisma.$transaction(async (tx) => {
    const loaded = await loadCivForUser(userId);
    if (!loaded) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    let c = await catchUpInTx(tx, loaded.id, now);
    const research = c.buildings.find((b) => b.buildingType === 'research_node');
    if (!research || research.level < PARLIAMENT_MIN_LEVEL) {
      throw new AppError(
        'PARLIAMENT_LOCKED',
        `Нужен узел исследований ур. ${PARLIAMENT_MIN_LEVEL}+ (Парламент)`,
        400
      );
    }
    if (!c.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
    if (
      c.resources.highEnergy < REGIME_CHANGE_COST_HE ||
      c.resources.fermions < REGIME_CHANGE_COST_FERMIONS
    ) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для смены режима', 400);
    }
    await tx.resourceState.update({
      where: { civilizationId: c.id },
      data: {
        highEnergy: c.resources.highEnergy - REGIME_CHANGE_COST_HE,
        fermions: c.resources.fermions - REGIME_CHANGE_COST_FERMIONS,
      },
    });
    await tx.civilization.update({
      where: { id: c.id },
      data: { politicalRegime: regime },
    });
    await addJournal(
      tx,
      c.id,
      'system',
      'Смена режима',
      `Политический режим изменён на ${regime}.`
    );
    return catchUpInTx(tx, c.id, now);
  });
  return toGameState(civ);
}
