import type {
  Artifact,
  Building,
  Civilization,
  CombatAction,
  CombatReport,
  Contact,
  DiscoveredAnomaly,
  Expedition,
  JournalEvent,
  ResourceState,
} from '@prisma/client';
import {
  ARTIFACTS_BY_KEY,
  ATTACK_TYPES,
  SHOP_CATALOG,
  PHYSICS_LAWS,
  MAX_ACTIVE_PHYSICS_LAWS,
  PHYSICS_LAB_LEVEL,
  GALAXY_TRAVEL_LEVEL,
  calculatePhysicsModifiers,
  civilizationLevelCostDarkEnergy,
  civilizationLevelCostHe,
  darkEnergyMilliPerSecond,
  galaxyTravelCost,
  galaxyTravelDurationSec,
  parsePhysicsLaws,
  BUILDING_ORDER,
  EXPEDITION_TYPE_ORDER,
  EXPEDITION_TYPES,
  attackTypeLabelRu,
  canStartExpeditionType,
  combatCostAffordable,
  combatOutcomeLabelRu,
  combatPrepSeconds,
  combatStatusLabelRu,
  effectiveRadar,
  expeditionCost,
  expeditionDurationSec,
  hasGravityAnomaly,
  highEnergyPerSecond,
  passiveProductionFromAnomalies,
  sumArtifactEffects,
  type BuildingState,
  type CivilizationFocuses,
  type DiscoveredAnomalyType,
  type ExpeditionTypeId,
  type GameCombatAction,
  type GameCombatReport,
  type GameState,
  type WorldState,
  SPECIES_LABELS_RU,
  POLITICAL_REGIME_LABELS_RU,
  GOVERNMENT_LABELS_RU,
  type SpeciesId,
  type PoliticalRegimeId,
  type GovernmentFormId,
  PLANET_TYPE_LABELS_RU,
  ATMOSPHERE_LABELS_RU,
  STAR_CLASS_LABELS_RU,
  gravityLabelRu,
  canColonizePlanet,
  type PlanetTypeId,
  type AtmosphereId,
  type StarClassId,
} from '@shared';
import { contactToGame } from './contactService.js';

export type CivFull = Civilization & {
  resources: ResourceState | null;
  buildings: Building[];
  expeditions: Expedition[];
  journal: JournalEvent[];
  artifacts: Artifact[];
  discoveredAnomalies: DiscoveredAnomaly[];
  contactsObserved?: Array<
    Contact & {
      target?: { name: string } | null;
      thread?: { id: string; trust: number; tension: number; status: string } | null;
    }
  >;
  combatActionsAttack?: CombatAction[];
  combatReportsAttack?: CombatReport[];
};

export function focusesFromCiv(civ: Civilization): CivilizationFocuses {
  return {
    scienceFocus: civ.scienceFocus,
    expansionFocus: civ.expansionFocus,
    secrecy: civ.secrecy,
    aggression: civ.aggression,
    diplomacyFocus: civ.diplomacyFocus,
    riskLevel: civ.riskLevel,
  };
}

export function worldFromCiv(civ: Civilization): WorldState {
  return {
    greatStructureName: civ.greatStructureName,
    galaxyName: civ.galaxyName,
    sectorName: civ.sectorName,
    systemName: civ.systemName,
    coordinates: {
      x: civ.coordinatesX,
      y: civ.coordinatesY,
      z: civ.coordinatesZ,
    },
    starType: civ.starType as WorldState['starType'],
    planetCount: 0,
    mainPlanetName: civ.mainPlanetName,
    mainPlanetType: civ.mainPlanetType,
    habitability: civ.habitability as WorldState['habitability'],
    anomalyType: civ.anomalyType as WorldState['anomalyType'],
    backgroundRadiation: civ.backgroundRadiation,
    vacuumStability: civ.vacuumStability,
    darkMatterDensity: civ.darkMatterDensity,
    eventProbability: civ.eventProbability,
    radarQuality: civ.radarQuality,
  };
}

export function buildingsToState(buildings: Building[]): BuildingState[] {
  const map = new Map(buildings.map((b) => [b.buildingType, b.level]));
  return BUILDING_ORDER.map((buildingType) => ({
    buildingType,
    level: map.get(buildingType) ?? 0,
  }));
}

export function artifactKeysOf(artifacts: Artifact[]): string[] {
  return artifacts.map((a) => a.artifactKey);
}

export function anomalyTypesOf(anoms: DiscoveredAnomaly[]): DiscoveredAnomalyType[] {
  return anoms.map((a) => a.anomalyType as DiscoveredAnomalyType);
}

export function physicsOf(civ: { physicsLaws?: string | null }) {
  return calculatePhysicsModifiers(parsePhysicsLaws(civ.physicsLaws));
}

export function productionBonusesFrom(civ: CivFull) {
  const arts = sumArtifactEffects(artifactKeysOf(civ.artifacts ?? []));
  const passive = passiveProductionFromAnomalies(anomalyTypesOf(civ.discoveredAnomalies ?? []));
  const phys = physicsOf(civ);
  return {
    heMul: 1 + (arts.heProductionBonus ?? 0),
    antimatterMul: 1 + (arts.antimatterProductionBonus ?? 0),
    darkEnergyMul: 1 + (arts.darkEnergyProductionBonus ?? 0),
    darkMatterMul: 1 + (arts.darkMatterProductionBonus ?? 0),
    fermionsMul: 1 + (arts.fermionsProductionBonus ?? 0),
    allMul: 1 + (arts.allProductionBonus ?? 0),
    physicsAllMul: phys.allProductionMul,
    anomalyYieldMul: phys.anomalyYieldMul,
    passive,
  };
}

export function toGameState(civ: CivFull, serverTime = new Date()): GameState {
  const resources = civ.resources;
  if (!resources) {
    throw new Error('ResourceState missing');
  }
  const buildingStates = buildingsToState(civ.buildings);
  const focuses = focusesFromCiv(civ);
  const keys = artifactKeysOf(civ.artifacts ?? []);
  const aTypes = anomalyTypesOf(civ.discoveredAnomalies ?? []);
  const arts = sumArtifactEffects(keys);
  const has4d = civ.has4DRiftAccess || !!arts.unlock4DRift;
  const effRadar = effectiveRadar({
    baseRadar: civ.radarQuality,
    buildings: buildingStates,
    artifactKeys: keys,
    anomalyTypes: aTypes,
  });
  const bonuses = productionBonusesFrom(civ);
  const phys = physicsOf(civ);
  const hePerSec = highEnergyPerSecond(buildingStates, civ.level, focuses, bonuses);
  const dePerSec = darkEnergyMilliPerSecond(buildingStates, bonuses) / 1000;
  const activeExp = civ.expeditions.find((e) => e.status === 'active') ?? null;

  const journal = [...civ.journal]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100)
    .map((j) => ({
      id: j.id,
      type: j.type,
      title: j.title || '',
      message: j.message,
      createdAt: j.createdAt.toISOString(),
    }));

  const expeditionCatalog = EXPEDITION_TYPE_ORDER.map((id) => {
    const def = EXPEDITION_TYPES[id];
    const unlock = canStartExpeditionType(id, civ.level, buildingStates, has4d, keys);
    const cost = expeditionCost(id, civ.level, keys);
    const durationSecEstimate = expeditionDurationSec(
      id,
      civ.level,
      effRadar,
      keys,
      aTypes,
      civ.seed,
      civ.expeditionNonce + 1,
      phys.expeditionDurationMul
    );
    return {
      id,
      name: def.nameRu,
      description: def.descriptionRu,
      unlocked: unlock.ok,
      reasons: unlock.reasons,
      cost,
      durationSecEstimate,
      minCivLevel: def.minCivLevel,
    };
  });

  return {
    civilization: {
      id: civ.id,
      name: civ.name,
      seed: civ.seed,
      level: civ.level,
      prosperityScore: civ.prosperityScore,
      isDestroyed: !!(civ as { isDestroyed?: boolean }).isDestroyed,
      physicsLaws: parsePhysicsLaws((civ as { physicsLaws?: string }).physicsLaws),
      isInterstellarTraveling: !!(civ as { isInterstellarTraveling?: boolean }).isInterstellarTraveling,
      galaxyTravelFinishesAt: (civ as { galaxyTravelFinishesAt?: Date | null }).galaxyTravelFinishesAt
        ? (civ as { galaxyTravelFinishesAt: Date }).galaxyTravelFinishesAt.toISOString()
        : null,
      greatStructureName: civ.greatStructureName,
      galaxyName: civ.galaxyName,
      sectorName: civ.sectorName,
      systemName: civ.systemName,
      coordinates: {
        x: civ.coordinatesX,
        y: civ.coordinatesY,
        z: civ.coordinatesZ,
      },
      starType: civ.starType,
      mainPlanetName: civ.mainPlanetName,
      mainPlanetType: civ.mainPlanetType,
      habitability: civ.habitability,
      anomalyType: civ.anomalyType,
      radarQuality: civ.radarQuality,
      backgroundRadiation: civ.backgroundRadiation,
      vacuumStability: civ.vacuumStability,
      darkMatterDensity: civ.darkMatterDensity,
      eventProbability: civ.eventProbability,
      constants: focuses,
      has4DRiftAccess: has4d,
      species: String((civ as { species?: string }).species ?? 'HUMAN'),
      speciesLabel:
        SPECIES_LABELS_RU[((civ as { species?: string }).species ?? 'HUMAN') as SpeciesId] ??
        String((civ as { species?: string }).species ?? 'HUMAN'),
      politicalRegime: String((civ as { politicalRegime?: string }).politicalRegime ?? 'DEMOCRACY'),
      politicalRegimeLabel:
        POLITICAL_REGIME_LABELS_RU[
          ((civ as { politicalRegime?: string }).politicalRegime ?? 'DEMOCRACY') as PoliticalRegimeId
        ] ?? String((civ as { politicalRegime?: string }).politicalRegime ?? 'DEMOCRACY'),
      governmentForm: String((civ as { governmentForm?: string }).governmentForm ?? 'REPUBLIC'),
      governmentFormLabel:
        GOVERNMENT_LABELS_RU[
          ((civ as { governmentForm?: string }).governmentForm ?? 'REPUBLIC') as GovernmentFormId
        ] ?? String((civ as { governmentForm?: string }).governmentForm ?? 'REPUBLIC'),
      population: Number((civ as { population?: bigint | number }).population ?? 1_000_000),
      colonies: Number((civ as { colonies?: number }).colonies ?? 1),
      homeSolarSystemId: (civ as { homeSolarSystemId?: string | null }).homeSolarSystemId ?? null,
      homePlanetId: (civ as { homePlanetId?: string | null }).homePlanetId ?? null,
    },
    resources: {
      highEnergy: resources.highEnergy,
      antimatter: resources.antimatter,
      darkEnergy: resources.darkEnergy,
      darkMatter: resources.darkMatter,
      fermions: resources.fermions,
      capacities: {
        highEnergy: resources.highEnergyCapacity,
        antimatter: resources.antimatterCapacity,
        darkEnergy: resources.darkEnergyCapacity,
        darkMatter: resources.darkMatterCapacity,
        fermions: resources.fermionsCapacity,
      },
    },
    production: {
      highEnergyPerSec: hePerSec,
      antimatterPerSec:
        (bonuses.passive.antimatter ?? 0) * (bonuses.antimatterMul ?? 1) * (bonuses.allMul ?? 1),
      darkEnergyPerSec: dePerSec,
      darkMatterPerSec:
        (bonuses.passive.darkMatter ?? 0) * (bonuses.darkMatterMul ?? 1) * (bonuses.allMul ?? 1),
      fermionsPerSec:
        (bonuses.passive.fermions ?? 0) * (bonuses.fermionsMul ?? 1) * (bonuses.allMul ?? 1),
    },
    buildings: buildingStates.map((b) => ({
      type: b.buildingType,
      level: b.level,
    })),
    expedition: activeExp
      ? {
          active: true,
          type: activeExp.expeditionType || activeExp.type,
          expeditionType: activeExp.expeditionType || activeExp.type,
          status: activeExp.status,
          startedAt: activeExp.startedAt.toISOString(),
          finishesAt: activeExp.finishesAt.toISOString(),
          outcomeType: activeExp.outcomeType,
        }
      : {
          active: false,
          type: null,
          expeditionType: null,
          status: null,
          startedAt: null,
          finishesAt: null,
          outcomeType: null,
        },
    artifacts: (civ.artifacts ?? []).map((a) => {
      const def = ARTIFACTS_BY_KEY[a.artifactKey];
      let effects: Record<string, unknown> = {};
      try {
        effects = JSON.parse(a.effects) as Record<string, unknown>;
      } catch {
        effects = { ...(def?.effects as Record<string, unknown> | undefined) };
      }
      return {
        id: a.id,
        artifactKey: a.artifactKey,
        name: a.name,
        rarity: a.rarity,
        description: def?.descriptionRu ?? '',
        effects,
        createdAt: a.createdAt.toISOString(),
      };
    }),
    discoveredAnomalies: (civ.discoveredAnomalies ?? []).map((a) => {
      let effects: Record<string, unknown> = {};
      try {
        effects = JSON.parse(a.effects) as Record<string, unknown>;
      } catch {
        effects = {};
      }
      return {
        id: a.id,
        anomalyType: a.anomalyType,
        name: a.name,
        description: a.description,
        effects,
        sectorSeed: a.sectorSeed,
        createdAt: a.createdAt.toISOString(),
      };
    }),
    effectiveRadar: effRadar,
    signalExposure: civ.signalExposure ?? 1,
    contacts: (civ.contactsObserved ?? []).map((c) =>
      contactToGame(c, c.target?.name ?? null)
    ),
    combatActions: mapCombatActions(civ.combatActionsAttack ?? [], serverTime, civ.contactsObserved),
    combatReports: mapCombatReports(civ.combatReportsAttack ?? []),
    evacuationActive: !!civ.evacuationActive,
    commJammedUntil: civ.commJammedUntil ? civ.commJammedUntil.toISOString() : null,
    premiumCredits: 0, // filled by getUserCivilizationState wrapper
    shopCatalog: SHOP_CATALOG.map((i) => ({
      key: i.key,
      name: i.nameRu,
      description: i.descriptionRu,
      category: i.category,
      costCredits: i.costCredits,
      resourceType: i.resourceType,
      amount: i.amount,
      capacityBonusPercent: i.capacityBonusPercent,
      premiumTier: i.premiumTier ?? 'standard',
    })),
    physicsCatalog: PHYSICS_LAWS.map((law) => {
      const active = phys.activeIds.includes(law.id);
      const reasons: string[] = [];
      if (civ.level < PHYSICS_LAB_LEVEL) reasons.push(`Требуется уровень ${PHYSICS_LAB_LEVEL}+`);
      if (!active && phys.activeIds.length >= MAX_ACTIVE_PHYSICS_LAWS) {
        reasons.push(`Максимум ${MAX_ACTIVE_PHYSICS_LAWS} активных закона`);
      }
      if (resources.darkEnergy < law.cost.darkEnergy) reasons.push('Недостаточно тёмной энергии');
      if (resources.darkMatter < law.cost.darkMatter) reasons.push('Недостаточно тёмной материи');
      if (resources.antimatter < law.cost.antimatter) reasons.push('Недостаточно антиматерии');
      const hard = reasons.filter((r) => r.startsWith('Требуется') || r.startsWith('Максимум'));
      return {
        id: law.id,
        name: law.nameRu,
        description: law.descriptionRu,
        cost: law.cost,
        active,
        unlocked: hard.length === 0,
        reasons,
      };
    }),
    galaxyTravel: (() => {
      const cost = galaxyTravelCost(civ.level);
      const reasons: string[] = [];
      if (civ.level < GALAXY_TRAVEL_LEVEL) reasons.push(`Требуется уровень ${GALAXY_TRAVEL_LEVEL}+`);
      if ((civ as { isInterstellarTraveling?: boolean }).isInterstellarTraveling) {
        reasons.push('Переход уже выполняется');
      }
      if (resources.fermions < cost.fermions) reasons.push('Недостаточно фермионов');
      if (resources.darkEnergy < cost.darkEnergy) reasons.push('Недостаточно тёмной энергии');
      if (resources.highEnergy < cost.highEnergy) reasons.push('Недостаточно высоких энергий');
      return {
        unlocked: civ.level >= GALAXY_TRAVEL_LEVEL,
        traveling: !!(civ as { isInterstellarTraveling?: boolean }).isInterstellarTraveling,
        finishesAt: (civ as { galaxyTravelFinishesAt?: Date | null }).galaxyTravelFinishesAt
          ? (civ as { galaxyTravelFinishesAt: Date }).galaxyTravelFinishesAt.toISOString()
          : null,
        cost,
        durationSec: galaxyTravelDurationSec(civ.level),
        reasons,
      };
    })(),
    levelCosts: {
      highEnergy: civilizationLevelCostHe(civ.level),
      darkEnergy: civilizationLevelCostDarkEnergy(civ.level),
    },
    combatCatalog: buildCombatCatalog(civ, buildingStates, keys, aTypes, resources),
    expeditionCatalog,
    journal,
    meta: {
      totalHighEnergyMined: civ.totalHighEnergyMined,
      successfulExpeditions: civ.successfulExpeditions,
      expeditionNonce: civ.expeditionNonce,
    },
    serverTime: serverTime.toISOString(),
  };
}

function mapCombatActions(
  actions: CombatAction[],
  now: Date,
  contacts?: Array<Contact & { target?: { name: string } | null }>
): GameCombatAction[] {
  const nameByContact = new Map<string, string>();
  for (const c of contacts ?? []) {
    nameByContact.set(c.id, c.target?.name ?? 'Цель');
  }
  return actions.map((a) => {
    const nowMs = now.getTime();
    let phase: 'prep' | 'transit' | 'done' = 'done';
    let eta = 0;
    if (a.status === 'PREPARING') {
      phase = 'prep';
      eta = Math.max(0, Math.ceil((a.prepFinishesAt.getTime() - nowMs) / 1000));
    } else if (a.status === 'IN_TRANSIT' && a.transitFinishesAt) {
      phase = 'transit';
      eta = Math.max(0, Math.ceil((a.transitFinishesAt.getTime() - nowMs) / 1000));
    }
    return {
      id: a.id,
      attackType: a.attackType,
      attackLabel: attackTypeLabelRu(a.attackType),
      targetContactId: a.targetContactId,
      targetName: a.targetContactId ? nameByContact.get(a.targetContactId) ?? 'Цель' : null,
      status: a.status,
      statusLabel: combatStatusLabelRu(a.status),
      outcome: a.outcome,
      outcomeLabel: a.outcome ? combatOutcomeLabelRu(a.outcome) : null,
      prepStartedAt: a.prepStartedAt.toISOString(),
      prepFinishesAt: a.prepFinishesAt.toISOString(),
      transitFinishesAt: a.transitFinishesAt?.toISOString() ?? null,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      damageDealt: a.damageDealt,
      damageTaken: a.damageTaken,
      etaSeconds: eta,
      phase,
      targetCoordinates:
        a.targetContactId != null
          ? {
              x: a.targetCoordinatesX,
              y: a.targetCoordinatesY,
              z: a.targetCoordinatesZ,
            }
          : null,
      flavorText: null,
    };
  });
}

function mapCombatReports(reports: CombatReport[]): GameCombatReport[] {
  return reports.map((r) => ({
    id: r.id,
    combatActionId: r.combatActionId,
    attackType: r.attackType,
    attackLabel: attackTypeLabelRu(r.attackType),
    outcome: r.outcome,
    outcomeLabel: combatOutcomeLabelRu(r.outcome),
    hitChance: r.hitChance,
    attackPower: r.attackPower,
    defensePower: r.defensePower,
    damageDealt: r.damageDealt,
    damageTaken: r.damageTaken,
    flavorText: r.flavorText,
    createdAt: r.createdAt.toISOString(),
    targetName: r.targetName,
  }));
}

function buildCombatCatalog(
  civ: CivFull,
  buildingStates: BuildingState[],
  keys: string[],
  aTypes: string[],
  resources: ResourceState
) {
  const arts = sumArtifactEffects(keys);
  const techBonus = Math.min(0.35, (arts.radarBonus ?? 0) * 0.005 + civ.level * 0.002);
  const gravityOk = hasGravityAnomaly([civ.anomalyType, ...aTypes]);
  void buildingStates;

  return ATTACK_TYPES.map((def) => {
    const reasons: string[] = [];
    if (civ.level < def.minCivLevel) {
      reasons.push(`Требуется уровень цивилизации ≥ ${def.minCivLevel}`);
    }
    if (def.requiresGravityAnomaly && !gravityOk) {
      reasons.push('Нужна аномалия «Чёрная дыра» или «Гравитационная линза»');
    }
    if (!combatCostAffordable(def.cost, resources)) {
      reasons.push('Недостаточно ресурсов');
    }
    if (def.type === 'EVACUATION' && civ.evacuationActive) {
      reasons.push('Эвакуация уже активна');
    }
    const prepSecEstimate = combatPrepSeconds({
      attackType: def.type,
      distanceLy: 1000,
      techBonus,
    });
    return {
      type: def.type,
      name: def.nameRu,
      description: def.descriptionRu,
      cost: def.cost,
      minCivLevel: def.minCivLevel,
      unlocked: reasons.length === 0 || reasons.every((r) => r.startsWith('Недостаточно')),
      reasons,
      requiresTarget: def.requiresTarget,
      selfAction: def.selfAction,
      prepSecEstimate,
    };
  }).map((row) => {
    // unlocked means level/anomaly gates; resource shown in reasons
    const hard = row.reasons.filter((r) => !r.startsWith('Недостаточно'));
    return { ...row, unlocked: hard.length === 0, reasons: row.reasons };
  });
}

export type { ExpeditionTypeId };


export function planetToGame(p: {
  id: string;
  planetKey: string;
  indexInSystem: number;
  name: string;
  type: string;
  atmosphere: string;
  gravity: number;
  moons: number;
  cosmicDust: string;
  radiation: string;
  temperatureDay: number;
  temperatureNight: number;
  resourcesJson: string;
  orbitRadius: number;
  hue: number;
  isHomeworld: boolean;
  colonized: boolean;
  ownerCivilizationId: string | null;
}) {
  let resources: Record<string, number> = {};
  try {
    resources = JSON.parse(p.resourcesJson || '{}') as Record<string, number>;
  } catch {
    resources = {};
  }
  const owned = !!(p.colonized || p.ownerCivilizationId);
  const check = canColonizePlanet(
    {
      type: p.type as PlanetTypeId,
      atmosphere: p.atmosphere as AtmosphereId,
      gravity: p.gravity,
      radiation: p.radiation as 'MINIMAL' | 'MODERATE' | 'HIGH' | 'LETHAL',
      isHomeworld: p.isHomeworld,
    },
    owned
  );
  return {
    id: p.id,
    planetKey: p.planetKey,
    indexInSystem: p.indexInSystem,
    name: p.name,
    type: p.type,
    typeLabel: PLANET_TYPE_LABELS_RU[p.type as PlanetTypeId] ?? p.type,
    atmosphere: p.atmosphere,
    atmosphereLabel: ATMOSPHERE_LABELS_RU[p.atmosphere as AtmosphereId] ?? p.atmosphere,
    gravity: p.gravity,
    gravityLabel: gravityLabelRu(p.gravity),
    moons: p.moons,
    cosmicDust: p.cosmicDust,
    radiation: p.radiation,
    temperatureDay: p.temperatureDay,
    temperatureNight: p.temperatureNight,
    resources,
    orbitRadius: p.orbitRadius,
    hue: p.hue,
    isHomeworld: p.isHomeworld,
    colonized: p.colonized,
    ownerCivilizationId: p.ownerCivilizationId,
    canColonize: check.ok,
    colonizeReasons: check.reasons,
  };
}

export function solarSystemToGame(sys: {
  id: string;
  seed: string;
  name: string;
  starClass: string;
  starTemperature: number;
  starLuminosity: number;
  starMass: number;
  starAgeGyr: number;
  starColor: string;
  planets: Array<Parameters<typeof planetToGame>[0]>;
}) {
  const planets = [...sys.planets]
    .sort((a, b) => a.indexInSystem - b.indexInSystem)
    .map(planetToGame);
  const homeworldIndex = Math.max(
    0,
    planets.findIndex((p) => p.isHomeworld)
  );
  return {
    id: sys.id,
    seed: sys.seed,
    name: sys.name,
    star: {
      class: sys.starClass,
      classLabel: STAR_CLASS_LABELS_RU[sys.starClass as StarClassId] ?? sys.starClass,
      temperature: sys.starTemperature,
      luminosity: sys.starLuminosity,
      mass: sys.starMass,
      ageGyr: sys.starAgeGyr,
      color: sys.starColor,
      name: sys.name,
    },
    planets,
    homeworldIndex,
  };
}
