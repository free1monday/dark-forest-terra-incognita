import {
  BUILDINGS,
  CAPACITY_PER_CIV_LEVEL,
  CAPACITY_PER_COLLIDER_LEVEL,
  EXPEDITION_OUTCOMES,
  HE_PRODUCTION_GLOBAL_MUL,
  HE_LEVEL_GROWTH,
  HE_COLLIDER_LEVEL_GROWTH,
  HE_BUILDING_COUNT_GROWTH,
  HE_CRIT_CHANCE,
  HE_CRIT_MUL,
} from './balance';
import type { BuildingId } from './constants';
import {
  DARK_ENERGY_SIPHON_PER_LEVEL,
  civilizationLevelCostDarkEnergy,
  civilizationLevelCostHe,
} from './progression';
import { createActionRng, rngInt, weightedPick } from './rng';
import type {
  BuildingState,
  CivilizationFocuses,
  CivilizationState,
  ExpeditionResultKind,
  ResourceState,
  WorldState,
} from './types';

export function buildingUpgradeCost(buildingType: BuildingId, currentLevel: number): number {
  const def = BUILDINGS[buildingType];
  return Math.floor(def.baseCostHe * Math.pow(def.growth, currentLevel));
}

export {
  civilizationLevelCostHe,
  civilizationLevelCostDarkEnergy,
  civilizationLevelCostDarkMatter,
  civilizationLevelCostAntimatter,
} from './progression';

export function getBuildingLevel(buildings: BuildingState[], id: BuildingId): number {
  return buildings.find((b) => b.buildingType === id)?.level ?? 0;
}

export interface ProductionBonuses {
  /** Total multiplicative bonus for HE (1.1 = +10%). */
  heMul?: number;
  antimatterMul?: number;
  darkEnergyMul?: number;
  darkMatterMul?: number;
  fermionsMul?: number;
  allMul?: number;
  /** Passive flat per-second from anomalies (before mul). */
  passive?: Partial<Record<'highEnergy' | 'antimatter' | 'darkEnergy' | 'darkMatter' | 'fermions', number>>;
  /** Stage 8 physics all-production multiplier. */
  physicsAllMul?: number;
  /** Stage 8 gravity control — anomaly passive yield. */
  anomalyYieldMul?: number;
}

/**
 * Instantaneous HE production rate (may be fractional for UI display).
 * Server accrual uses milli-units via highEnergyMilliPerSecond for integer safety.
 */
export function highEnergyPerSecond(
  buildings: BuildingState[],
  civLevel: number,
  focuses: CivilizationFocuses,
  bonuses: ProductionBonuses = {}
): number {
  return highEnergyMilliPerSecond(buildings, civLevel, focuses, bonuses) / 1000;
}

/**
 * HE production in milli-units per second (integer).
 * 1000 milli = 1 HE. Deterministic floor of the floating formula.
 */
export function highEnergyMilliPerSecond(
  buildings: BuildingState[],
  civLevel: number,
  focuses: CivilizationFocuses,
  bonuses: ProductionBonuses = {}
): number {
  const collider = getBuildingLevel(buildings, 'high_energy_collider');
  const def = BUILDINGS.high_energy_collider;
  // Stage 12: collider base scales with civ level (+15%/lvl) and building density
  const buildingLevels = buildings.reduce((s, b) => s + Math.max(0, b.level), 0);
  const colliderLevelMul = 1 + civLevel * HE_COLLIDER_LEVEL_GROWTH;
  const baseMilli = Math.round(
    Math.max(0, collider) * def.hePerLevel * 1000 * colliderLevelMul
  );
  // Stage 12: +10%/civ level (replaces old +2%)
  const levelMul = 1 + civLevel * HE_LEVEL_GROWTH;
  const buildingMul = 1 + buildingLevels * HE_BUILDING_COUNT_GROWTH;
  const expansionMul = 1 + focuses.expansionFocus / 200;
  const research = getBuildingLevel(buildings, 'research_node');
  const scienceMul = 1 + research * 0.01 + focuses.scienceFocus / 500;
  const artMul = (bonuses.heMul ?? 1) * (bonuses.allMul ?? 1) * (bonuses.physicsAllMul ?? 1);
  const rateMilli = Math.floor(
    baseMilli * levelMul * buildingMul * expansionMul * scienceMul * artMul
  );
  const passiveMilli = Math.floor((bonuses.passive?.highEnergy ?? 0) * 1000);
  return Math.floor((rateMilli + passiveMilli) * HE_PRODUCTION_GLOBAL_MUL);
}

/** Dark energy /s from vacuum siphon (+ anomaly passive), integer milli. */
export function darkEnergyMilliPerSecond(
  buildings: BuildingState[],
  bonuses: ProductionBonuses = {}
): number {
  const siphon = getBuildingLevel(buildings, 'dark_energy_siphon');
  const base = siphon * DARK_ENERGY_SIPHON_PER_LEVEL;
  const mul =
    (bonuses.darkEnergyMul ?? 1) * (bonuses.allMul ?? 1) * (bonuses.physicsAllMul ?? 1);
  const passive = (bonuses.passive?.darkEnergy ?? 0) * (bonuses.anomalyYieldMul ?? 1);
  return Math.floor((base * mul + passive) * 1000);
}

export function highEnergyCapacity(buildings: BuildingState[], civLevel: number): number {
  const collider = getBuildingLevel(buildings, 'high_energy_collider');
  return 1000 + collider * CAPACITY_PER_COLLIDER_LEVEL + civLevel * CAPACITY_PER_CIV_LEVEL;
}

export interface CapacityShopBonuses {
  /** Extra percent points on HE capacity (from shop). */
  hePercent?: number;
  /** Extra percent points on fermion capacity. */
  fermionsPercent?: number;
  /** Extra percent points on ALL capacities. */
  allPercent?: number;
}

export function resourceCapacities(
  buildings: BuildingState[],
  civLevel: number,
  shopBonuses: CapacityShopBonuses = {}
): {
  highEnergy: number;
  antimatter: number;
  darkEnergy: number;
  darkMatter: number;
  fermions: number;
} {
  const collider = getBuildingLevel(buildings, 'high_energy_collider');
  const synth = getBuildingLevel(buildings, 'fermion_synthesizer');
  const sensor = getBuildingLevel(buildings, 'dark_sensor');
  const siphon = getBuildingLevel(buildings, 'dark_energy_siphon');
  const all = shopBonuses.allPercent ?? 0;
  const heB = 1 + ((shopBonuses.hePercent ?? 0) + all) / 100;
  const fmB = 1 + ((shopBonuses.fermionsPercent ?? 0) + all) / 100;
  const otherB = 1 + all / 100;
  return {
    highEnergy: Math.floor(highEnergyCapacity(buildings, civLevel) * heB),
    antimatter: Math.floor((100 + civLevel * 25 + collider * 10) * otherB),
    darkEnergy: Math.floor((100 + civLevel * 20 + sensor * 15 + siphon * 40) * otherB),
    darkMatter: Math.floor((100 + civLevel * 20 + sensor * 15) * otherB),
    fermions: Math.floor((50 + civLevel * 15 + synth * 40) * fmB),
  };
}

export function shopBonusesFromResourceState(r: {
  capacityBonusHe?: number | null;
  capacityBonusFermions?: number | null;
  capacityBonusAll?: number | null;
}): CapacityShopBonuses {
  return {
    hePercent: r.capacityBonusHe ?? 0,
    fermionsPercent: r.capacityBonusFermions ?? 0,
    allPercent: r.capacityBonusAll ?? 0,
  };
}

/** Floor all resource amounts and clamp to capacities (integers only). */
export function clampResources(
  resources: ResourceState,
  buildings: BuildingState[],
  civLevel: number,
  shopBonuses: CapacityShopBonuses = {}
): ResourceState {
  const base = resourceCapacities(buildings, civLevel, shopBonuses);
  // Preserve expanded capacities (shop/debug/late-game grants) — never shrink below stored cap
  const caps = {
    highEnergy: Math.max(base.highEnergy, resources.highEnergyCapacity ?? 0),
    antimatter: Math.max(base.antimatter, resources.antimatterCapacity ?? 0),
    darkEnergy: Math.max(base.darkEnergy, resources.darkEnergyCapacity ?? 0),
    darkMatter: Math.max(base.darkMatter, resources.darkMatterCapacity ?? 0),
    fermions: Math.max(base.fermions, resources.fermionsCapacity ?? 0),
  };
  const floor = (n: number) => Math.max(0, Math.floor(n));
  return {
    ...resources,
    highEnergy: Math.min(floor(resources.highEnergy), caps.highEnergy),
    highEnergyCapacity: caps.highEnergy,
    antimatter: Math.min(floor(resources.antimatter), caps.antimatter),
    antimatterCapacity: caps.antimatter,
    darkEnergy: Math.min(floor(resources.darkEnergy), caps.darkEnergy),
    darkEnergyCapacity: caps.darkEnergy,
    darkMatter: Math.min(floor(resources.darkMatter), caps.darkMatter),
    darkMatterCapacity: caps.darkMatter,
    fermions: Math.min(floor(resources.fermions), caps.fermions),
    fermionsCapacity: caps.fermions,
  };
}

/**
 * Apply production for `seconds` of real time.
 * HE uses milli remainder; other resources floor(rate * seconds * mul).
 */
export function applyProductionTick(
  resources: ResourceState,
  buildings: BuildingState[],
  civ: CivilizationState,
  seconds: number,
  highEnergyMilliRemainder = 0,
  bonuses: ProductionBonuses = {}
): { resources: ResourceState; minedHe: number; highEnergyMilliRemainder: number } {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const rateMilli = highEnergyMilliPerSecond(buildings, civ.level, civ.focuses, bonuses);
  // Stage 12: soft crit (~5%) doubles HE gained this tick chunk (deterministic-ish via remainder)
  const crit =
    safeSeconds > 0 && (highEnergyMilliRemainder * 17 + safeSeconds * 31 + civ.level * 13) % 100 < HE_CRIT_CHANCE * 100
      ? HE_CRIT_MUL
      : 1;
  const totalMilli = highEnergyMilliRemainder + rateMilli * safeSeconds * crit;
  const gainedHe = Math.floor(totalMilli / 1000);
  const nextRemainder = totalMilli % 1000;

  const allMul = (bonuses.allMul ?? 1) * (bonuses.physicsAllMul ?? 1);
  const anomalyMul = bonuses.anomalyYieldMul ?? 1;
  const passive = bonuses.passive ?? {};
  const gain = (base: number, mul: number) =>
    Math.floor(base * safeSeconds * mul * allMul * anomalyMul);

  const deMilli = darkEnergyMilliPerSecond(buildings, bonuses) * safeSeconds;
  const deFromSiphon = Math.floor(deMilli / 1000);

  const next: ResourceState = {
    ...resources,
    highEnergy: Math.floor(resources.highEnergy) + gainedHe,
    antimatter:
      Math.floor(resources.antimatter) +
      gain(passive.antimatter ?? 0, bonuses.antimatterMul ?? 1),
    // Siphon already includes anomaly passive DE — don't double-count passive.darkEnergy
    darkEnergy: Math.floor(resources.darkEnergy) + deFromSiphon,
    darkMatter:
      Math.floor(resources.darkMatter) +
      gain(passive.darkMatter ?? 0, bonuses.darkMatterMul ?? 1),
    fermions:
      Math.floor(resources.fermions) +
      gain(passive.fermions ?? 0, bonuses.fermionsMul ?? 1),
  };
  const clamped = clampResources(next, buildings, civ.level);
  const actualGained = Math.max(0, clamped.highEnergy - Math.floor(resources.highEnergy));
  return {
    resources: clamped,
    minedHe: actualGained,
    highEnergyMilliRemainder: nextRemainder,
  };
}

/**
 * Legacy prosperity helper (Stages 1–6 call sites).
 * Prefer calculateProsperityScore from ./prosperity for full Stage 7 metric.
 */
export function prosperityScore(
  civLevel: number,
  buildings: BuildingState[],
  successfulExpeditions: number,
  totalHighEnergyMined: number
): number {
  const bSum = buildings.reduce((s, b) => s + b.level, 0);
  const minedBonus = Math.floor(Math.log10(1 + totalHighEnergyMined)) * 25;
  return civLevel * 100 + bSum * 10 + successfulExpeditions * 5 + minedBonus;
}

/** @deprecated Stage 1/2 helper — use expeditions.expeditionCost */
export function expeditionCostHe(civLevel: number): number {
  return 10 + Math.floor(civLevel * 1.5);
}

/** @deprecated Stage 1/2 helper — use expeditions.expeditionDurationSec */
export function legacyExpeditionDurationSec(civLevel: number): number {
  return 3 + Math.floor(civLevel * 0.1);
}

export function expeditionWeights(
  world: WorldState,
  focuses: CivilizationFocuses,
  buildings: BuildingState[]
): number[] {
  const radar = world.radarQuality;
  const risk = focuses.riskLevel;
  const science = focuses.scienceFocus;
  const research = getBuildingLevel(buildings, 'research_node');
  const probe = getBuildingLevel(buildings, 'probe_factory');

  return EXPEDITION_OUTCOMES.map((o) => {
    let w = o.baseWeight;
    switch (o.kind) {
      case 'empty':
        w *= 1 - radar / 400;
        break;
      case 'resource_traces':
        w *= 1 + radar / 120;
        break;
      case 'anomaly':
        w *= 1 + risk / 150 + (world.anomalyType !== 'none' ? 0.3 : 0);
        break;
      case 'high_energy_find':
        w *= 1 + radar / 100 + science / 300 + research * 0.05;
        break;
      case 'weak_signal':
        w *= 1 + radar / 90 + probe * 0.08 - focuses.secrecy / 400;
        break;
    }
    return Math.max(0.5, w);
  });
}

export interface ExpeditionResolution {
  kind: ExpeditionResultKind;
  title: string;
  body: string;
  highEnergyGain: number;
  anomalyNote?: string;
}

const ANOMALY_NOTES = [
  'Зафиксирована локальная флуктуация метрики пространства.',
  'Спектр излучения не соответствует известным моделям звёздной эволюции.',
  'Гравитационный градиент нестабилен — рекомендована осторожность.',
  'Обнаружен вторичный эхо-сигнал неизвестной природы.',
];

export function resolveExpedition(
  seed: string,
  nonce: number,
  civ: CivilizationState,
  buildings: BuildingState[]
): ExpeditionResolution {
  const rng = createActionRng(seed, 'expedition', nonce);
  const weights = expeditionWeights(civ.world, civ.focuses, buildings);
  const idx = weightedPick(rng, weights);
  const kind = EXPEDITION_OUTCOMES[idx]!.kind;
  const radar = civ.world.radarQuality;

  switch (kind) {
    case 'empty':
      return {
        kind,
        title: 'Экспедиция: пустой сектор',
        body:
          `Зонд завершил сканирование сектора «Терра Инкогнита». ` +
          `Значимых сигнатур не обнаружено. Фоновый шум в пределах нормы. ` +
          `Радар/Локация: ${radar}. Достоверность покрытия: ${40 + Math.floor(radar / 2)}%.`,
        highEnergyGain: 0,
      };
    case 'resource_traces':
      return {
        kind,
        title: 'Экспедиция: следы ресурсов',
        body:
          `Обнаружены диффузные следы высокоэнергетических процессов. ` +
          `Концентрация недостаточна для немедленного сбора, но сектор помечен для повторного анализа. ` +
          `Координаты смещены шумом ±${rngInt(rng, 3, 40)} у.е.`,
        highEnergyGain: 0,
      };
    case 'anomaly': {
      const note = ANOMALY_NOTES[rngInt(rng, 0, ANOMALY_NOTES.length - 1)]!;
      return {
        kind,
        title: 'Экспедиция: аномалия',
        body:
          `Внимание. Зафиксирована пространственная аномалия класса «Терра Инкогнита». ${note} ` +
          `Прямой забор проб отложен. Уровень угрозы: ${rngInt(rng, 12, 67)}%.`,
        highEnergyGain: 0,
        anomalyNote: note,
      };
    }
    case 'high_energy_find': {
      const gain = 5 + Math.floor(rng() * 20 * (1 + radar / 100));
      return {
        kind,
        title: 'Экспедиция: высокие энергии',
        body:
          `Сборный контур стабилизировал локальный карман возбуждённого вакуума. ` +
          `Извлечено единиц высоких энергий: ${gain}. ` +
          `Параметр Радар/Локация повысил выход на ${(radar / 10).toFixed(1)}%.`,
        highEnergyGain: gain,
      };
    }
    case 'weak_signal':
      return {
        kind,
        title: 'Экспедиция: слабый сигнал',
        body:
          `Зафиксирован слабый модулированный сигнал неизвестного происхождения. ` +
          `Расстояние (оценка): ${rngInt(rng, 120, 9800)} св. лет ±${rngInt(rng, 40, 900)}. ` +
          `Уровень источника: неопределён. Достоверность: ${rngInt(rng, 18, 55)}%. ` +
          `Статус объекта: Терра Инкогнита. Рекомендовано усиление сенсоров.`,
        highEnergyGain: 0,
      };
    default:
      return {
        kind: 'empty',
        title: 'Экспедиция: сбой',
        body: 'Данные повреждены. Повторный запуск рекомендован.',
        highEnergyGain: 0,
      };
  }
}

export function canUpgradeBuilding(
  buildingType: BuildingId,
  buildings: BuildingState[],
  resources: ResourceState,
  civLevel: number
): { ok: boolean; reason?: string; cost: number } {
  const def = BUILDINGS[buildingType];
  const level = getBuildingLevel(buildings, buildingType);
  const cost = buildingUpgradeCost(buildingType, level);
  if (civLevel < def.unlockedAtLevel) {
    return { ok: false, reason: `Требуется уровень цивилизации ${def.unlockedAtLevel}`, cost };
  }
  if (!def.stage1Active && buildingType !== 'probe_factory') {
    // fermion & dark_sensor locked message but probe is stub-active
  }
  if (buildingType === 'fermion_synthesizer' || buildingType === 'dark_sensor') {
    if (civLevel < def.unlockedAtLevel) {
      return { ok: false, reason: `Требуется уровень ${def.unlockedAtLevel}`, cost };
    }
  }
  if (resources.highEnergy < cost) {
    return { ok: false, reason: 'Недостаточно высоких энергий', cost };
  }
  return { ok: true, cost };
}

export function canLevelUp(
  civLevel: number,
  resources: ResourceState
): { ok: boolean; reason?: string; costHe: number; costDe: number } {
  if (civLevel >= 100) return { ok: false, reason: 'Максимальный уровень', costHe: 0, costDe: 0 };
  const costHe = civilizationLevelCostHe(civLevel);
  const costDe = civilizationLevelCostDarkEnergy(civLevel);
  if (resources.highEnergy < costHe) {
    return { ok: false, reason: 'Недостаточно высоких энергий', costHe, costDe };
  }
  if (costDe > 0 && resources.darkEnergy < costDe) {
    return { ok: false, reason: 'Недостаточно тёмной энергии (уровень 61+)', costHe, costDe };
  }
  return { ok: true, costHe, costDe };
}
