import {
  COMBAT_HIT_BASE,
  COMBAT_HIT_MAX,
  COMBAT_HIT_MIN,
  COMBAT_PREP_DISTANCE_DIVISOR,
  COMBAT_PREP_MAX_SEC,
  COMBAT_PREP_MIN_SEC,
  COMBAT_TRANSIT_MAX_SEC,
  LY_TO_SECONDS_MULTIPLIER,
} from './balance';
import { createActionRng, rngInt } from './rng';
import type { ArtifactEffects } from './artifacts';

export type AttackType =
  | 'RECON_SCAN'
  | 'LIMITED_STRIKE'
  | 'DARK_STRIKE'
  | 'GRAVITATIONAL_STRIKE'
  | 'DECEPTION_SIGNAL'
  | 'COMM_JAMMING'
  | 'EVACUATION'
  | 'CAPITAL_RELOCATION';

export type CombatActionStatus =
  | 'PREPARING'
  | 'IN_TRANSIT'
  | 'RESOLVED'
  | 'FAILED'
  | 'CANCELLED'
  | 'COUNTERATTACKED';

export type CombatOutcome =
  | 'MISS'
  | 'HIT_LIGHT'
  | 'HIT_MODERATE'
  | 'HIT_HEAVY'
  | 'HIT_DESTROYED'
  | 'RECON_SUCCESS'
  | 'RECON_PARTIAL'
  | 'DECEPTION_SUCCESS'
  | 'JAMMING_SUCCESS'
  | 'EVACUATION_READY'
  | 'RELOCATION_DONE'
  | 'FAILED'
  | 'COUNTERATTACKED';

export interface TargetStructures {
  mainCore: number;
  defenseMatrix: number;
  fleetStrength: number;
  sensorGrid: number;
  shieldCapacity: number;
}

export interface CombatCost {
  highEnergy: number;
  antimatter: number;
  darkEnergy: number;
  darkMatter: number;
  fermions: number;
}

export interface AttackTypeDef {
  type: AttackType;
  nameRu: string;
  descriptionRu: string;
  /** Offensive actions need a contact target. */
  requiresTarget: boolean;
  /** Defensive: applied to self. */
  selfAction: boolean;
  minCivLevel: number;
  basePrepSec: number;
  /** Multiplier on distance-scaled prep. */
  prepDistanceMul: number;
  /** Has light-speed transit after prep. */
  hasTransit: boolean;
  basePower: number;
  cost: CombatCost;
  /** Needs black_hole or gravitational_lens on attacker or target. */
  requiresGravityAnomaly?: boolean;
  canEncrypt?: boolean;
}

export const ATTACK_TYPES: AttackTypeDef[] = [
  {
    type: 'RECON_SCAN',
    nameRu: 'Разведка зондами',
    descriptionRu: 'Отправить зонды для уточнения структуры и координат цели. Без урона.',
    requiresTarget: true,
    selfAction: false,
    minCivLevel: 1,
    basePrepSec: 12,
    prepDistanceMul: 0.6,
    hasTransit: true,
    basePower: 0,
    cost: { highEnergy: 80, antimatter: 0, darkEnergy: 0, darkMatter: 20, fermions: 0 },
  },
  {
    type: 'LIMITED_STRIKE',
    nameRu: 'Ограниченный удар',
    descriptionRu: 'Точечный удар по инфраструктуре. Повреждает ядро и матрицу защиты.',
    requiresTarget: true,
    selfAction: false,
    minCivLevel: 5,
    basePrepSec: 20,
    prepDistanceMul: 1,
    hasTransit: true,
    basePower: 55,
    cost: { highEnergy: 250, antimatter: 40, darkEnergy: 0, darkMatter: 0, fermions: 0 },
  },
  {
    type: 'DARK_STRIKE',
    nameRu: 'Тёмный удар',
    descriptionRu: 'Полная аннигиляция цели. Необратимо. Высокий риск ответного удара.',
    requiresTarget: true,
    selfAction: false,
    minCivLevel: 20,
    basePrepSec: 45,
    prepDistanceMul: 1.4,
    hasTransit: true,
    basePower: 140,
    cost: {
      highEnergy: 1200,
      antimatter: 200,
      darkEnergy: 150,
      darkMatter: 100,
      fermions: 0,
    },
  },
  {
    type: 'GRAVITATIONAL_STRIKE',
    nameRu: 'Гравитационный удар',
    descriptionRu:
      'Искажение пространства через аномалию. Игнорирует щиты, ниже точность.',
    requiresTarget: true,
    selfAction: false,
    minCivLevel: 12,
    basePrepSec: 28,
    prepDistanceMul: 1.1,
    hasTransit: true,
    basePower: 90,
    cost: { highEnergy: 400, antimatter: 0, darkEnergy: 0, darkMatter: 80, fermions: 0 },
    requiresGravityAnomaly: true,
  },
  {
    type: 'DECEPTION_SIGNAL',
    nameRu: 'Ложный сигнал',
    descriptionRu: 'Ложные координаты для снижения точности сенсоров цели.',
    requiresTarget: true,
    selfAction: false,
    minCivLevel: 8,
    basePrepSec: 14,
    prepDistanceMul: 0.7,
    hasTransit: true,
    basePower: 0,
    cost: { highEnergy: 120, antimatter: 0, darkEnergy: 0, darkMatter: 35, fermions: 0 },
  },
  {
    type: 'COMM_JAMMING',
    nameRu: 'Блокировка связи',
    descriptionRu: 'Заглушить дипломатические каналы цели на ограниченное время.',
    requiresTarget: true,
    selfAction: false,
    minCivLevel: 15,
    basePrepSec: 16,
    prepDistanceMul: 0.8,
    hasTransit: true,
    basePower: 0,
    cost: { highEnergy: 180, antimatter: 30, darkEnergy: 0, darkMatter: 0, fermions: 0 },
  },
  {
    type: 'EVACUATION',
    nameRu: 'Эвакуация',
    descriptionRu:
      'Переместить ключевые структуры. Следующий входящий удар наносит −50% урона (1 раз).',
    requiresTarget: false,
    selfAction: true,
    minCivLevel: 10,
    basePrepSec: 60,
    prepDistanceMul: 0,
    hasTransit: false,
    basePower: 0,
    cost: { highEnergy: 800, antimatter: 100, darkEnergy: 0, darkMatter: 0, fermions: 40 },
  },
  {
    type: 'CAPITAL_RELOCATION',
    nameRu: 'Перенос столицы',
    descriptionRu:
      'Смена координат цивилизации. Все исходящие/входящие контакты теряют точность.',
    requiresTarget: false,
    selfAction: true,
    minCivLevel: 30,
    basePrepSec: 90,
    prepDistanceMul: 0,
    hasTransit: false,
    basePower: 0,
    cost: {
      highEnergy: 2500,
      antimatter: 300,
      darkEnergy: 200,
      darkMatter: 0,
      fermions: 80,
    },
  },
];

export const ATTACK_TYPES_BY_TYPE: Record<string, AttackTypeDef> = Object.fromEntries(
  ATTACK_TYPES.map((a) => [a.type, a])
);

export function attackTypeLabelRu(t: string): string {
  return ATTACK_TYPES_BY_TYPE[t]?.nameRu ?? t;
}

export function combatOutcomeLabelRu(o: string): string {
  const map: Record<string, string> = {
    MISS: 'Промах',
    HIT_LIGHT: 'Лёгкое повреждение',
    HIT_MODERATE: 'Повреждение',
    HIT_HEAVY: 'Критическое повреждение',
    HIT_DESTROYED: 'Цель уничтожена',
    RECON_SUCCESS: 'Разведка успешна',
    RECON_PARTIAL: 'Частичная разведка',
    DECEPTION_SUCCESS: 'Обман сработал',
    JAMMING_SUCCESS: 'Связь подавлена',
    EVACUATION_READY: 'Эвакуация готова',
    RELOCATION_DONE: 'Столица перенесена',
    FAILED: 'Провал',
    COUNTERATTACKED: 'Ответный удар',
  };
  return map[o] ?? o;
}

export function combatStatusLabelRu(s: string): string {
  const map: Record<string, string> = {
    PREPARING: 'Подготовка',
    IN_TRANSIT: 'В пути',
    RESOLVED: 'Завершено',
    FAILED: 'Провал',
    CANCELLED: 'Отменено',
    COUNTERATTACKED: 'Контрудар',
  };
  return map[s] ?? s;
}

/** Deterministic hidden structure for bot contacts. */
export function generateTargetStructures(
  seed: string,
  contactId: string,
  botLevel: number
): TargetStructures {
  const rng = createActionRng(seed, `structures:${contactId}`, botLevel);
  const lvl = Math.max(1, Math.min(100, botLevel));
  const scale = 0.4 + lvl / 120;
  return {
    mainCore: 100,
    defenseMatrix: clampStruct(rngInt(rng, 40, 90) * scale),
    fleetStrength: clampStruct(rngInt(rng, 25, 85) * scale),
    sensorGrid: clampStruct(rngInt(rng, 35, 95) * scale),
    shieldCapacity: clampStruct(rngInt(rng, 40, 100) * scale),
  };
}

function clampStruct(n: number): number {
  return Math.max(5, Math.min(100, Math.floor(n)));
}

export function structuresFromPlayer(params: {
  level: number;
  darkSensorLevel: number;
  colliderLevel: number;
  probeLevel: number;
  artifactDefenseBonus: number;
}): TargetStructures {
  const { level, darkSensorLevel, colliderLevel, probeLevel, artifactDefenseBonus } = params;
  const core = Math.min(100, 55 + level * 0.4 + colliderLevel * 3);
  const def = Math.min(100, 30 + level * 0.35 + probeLevel * 4 + artifactDefenseBonus * 40);
  const fleet = Math.min(100, 20 + level * 0.5 + probeLevel * 5);
  const sensors = Math.min(100, 25 + darkSensorLevel * 8 + level * 0.25);
  const shields = Math.min(100, 35 + level * 0.4 + artifactDefenseBonus * 30);
  return {
    mainCore: Math.floor(core),
    defenseMatrix: Math.floor(def),
    fleetStrength: Math.floor(fleet),
    sensorGrid: Math.floor(sensors),
    shieldCapacity: Math.floor(shields),
  };
}

export function euclideanDistance3(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Max targeting radius from contact noise / accuracy.
 * Higher noise → larger sector to search.
 */
export function targetingMaxRadius(distanceNoise: number, coordinatesAccuracy: number): number {
  const base = Math.max(20, distanceNoise * 0.5 + 30);
  return base * (1.2 - Math.min(0.9, coordinatesAccuracy) * 0.5);
}

export function calculateHitChance(params: {
  attackerRadar: number;
  targetSensors: number;
  distanceError: number;
  maxRadius: number;
  /** GRAVITATIONAL_STRIKE accuracy penalty etc. */
  accuracyMul?: number;
}): number {
  const {
    attackerRadar,
    targetSensors,
    distanceError,
    maxRadius,
    accuracyMul = 1,
  } = params;
  // Soft curve: being within ~2× maxRadius still retains some hit chance
  const ratio = maxRadius <= 0 ? 1 : distanceError / Math.max(1, maxRadius);
  const errFactor = Math.max(0.08, 1 - ratio * 0.55);
  let h =
    COMBAT_HIT_BASE *
    (1 + attackerRadar * 0.012) *
    (1 - targetSensors * 0.004) *
    errFactor *
    accuracyMul;
  return Math.max(COMBAT_HIT_MIN, Math.min(COMBAT_HIT_MAX, h));
}

export function calculateAttackPower(params: {
  attackType: AttackType;
  civLevel: number;
  artifacts: ArtifactEffects;
  antimatterSpent: number;
}): number {
  const def = ATTACK_TYPES_BY_TYPE[params.attackType];
  const base = def?.basePower ?? 40;
  if (base <= 0) return 0;
  const artCombat =
    (params.artifacts.heProductionBonus ?? 0) * 0.5 +
    (params.artifacts.allProductionBonus ?? 0) * 0.3 +
    (params.artifacts.radarBonus ?? 0) * 0.01;
  return (
    base *
    (1 + params.civLevel * 0.02) *
    (1 + artCombat) *
    (1 + params.antimatterSpent / 1000)
  );
}

export function calculateDefensePower(params: {
  targetLevel: number;
  structures: TargetStructures;
  artifacts?: ArtifactEffects;
  /** GRAVITATIONAL ignores shields. */
  ignoreShields?: boolean;
  evacuationActive?: boolean;
  /** Stage 11 Tranqlucator stacks */
  tranqlucatorBonus?: number;
}): number {
  const s = params.structures;
  const shield = params.ignoreShields ? 0 : s.shieldCapacity;
  let base = s.defenseMatrix + shield + s.fleetStrength + (params.tranqlucatorBonus ?? 0);
  const artDef =
    (params.artifacts?.darkMatterProductionBonus ?? 0) * 0.4 +
    (params.artifacts?.allProductionBonus ?? 0) * 0.2;
  let power = base * (1 + params.targetLevel * 0.02) * (1 + artDef);
  if (params.evacuationActive) power *= 1.5; // absorbed as damage reduction on resolve
  return power;
}

export interface CombatResolveResult {
  outcome: CombatOutcome;
  damageRatio: number;
  hit: boolean;
  structureDamage: Partial<TargetStructures>;
  destroyed: boolean;
}

export function resolveCombat(params: {
  attackPower: number;
  defensePower: number;
  hitChance: number;
  seed: string;
  actionId: string;
  attackType: AttackType;
  structures: TargetStructures;
  evacuationActive?: boolean;
}): CombatResolveResult {
  const rng = createActionRng(params.seed, `combat_resolve:${params.actionId}`, 0);
  const hit = rng() < params.hitChance;
  if (!hit) {
    return {
      outcome: 'MISS',
      damageRatio: 0,
      hit: false,
      structureDamage: {},
      destroyed: false,
    };
  }

  let damage = params.attackPower / (params.defensePower + 100);
  if (params.evacuationActive) damage *= 0.5;

  // DARK_STRIKE bonus toward destruction
  if (params.attackType === 'DARK_STRIKE') damage *= 1.35;
  if (params.attackType === 'LIMITED_STRIKE') damage *= 0.85;

  const s = params.structures;
  const coreDmg = Math.min(s.mainCore, Math.floor(damage * 55 + rng() * 15));
  const defDmg = Math.min(s.defenseMatrix, Math.floor(damage * 35 + rng() * 10));
  const fleetDmg = Math.min(s.fleetStrength, Math.floor(damage * 25 + rng() * 8));
  const shieldDmg = Math.min(s.shieldCapacity, Math.floor(damage * 40 + rng() * 10));

  const structureDamage: Partial<TargetStructures> = {
    mainCore: coreDmg,
    defenseMatrix: defDmg,
    fleetStrength: fleetDmg,
    shieldCapacity: shieldDmg,
  };

  const newCore = s.mainCore - coreDmg;
  let outcome: CombatOutcome;
  let destroyed = false;
  if (damage > 1.0 || newCore <= 0) {
    outcome = 'HIT_DESTROYED';
    destroyed = true;
    structureDamage.mainCore = s.mainCore;
  } else if (damage > 0.5) {
    outcome = 'HIT_HEAVY';
  } else if (damage > 0.2) {
    outcome = 'HIT_MODERATE';
  } else {
    outcome = 'HIT_LIGHT';
  }

  return {
    outcome,
    damageRatio: Math.round(damage * 1000) / 1000,
    hit: true,
    structureDamage,
    destroyed,
  };
}

export function calculateCounterattackChance(params: {
  targetLevel: number;
  targetSensors: number;
  attackType: AttackType;
  targetDestroyed: boolean;
}): number {
  if (params.targetDestroyed) return 0;
  const base: Record<string, number> = {
    DARK_STRIKE: 0.8,
    LIMITED_STRIKE: 0.3,
    GRAVITATIONAL_STRIKE: 0.2,
    RECON_SCAN: 0.15,
    DECEPTION_SIGNAL: 0.1,
    COMM_JAMMING: 0.2,
  };
  let c = base[params.attackType] ?? 0.1;
  c += params.targetLevel * 0.002 + params.targetSensors * 0.001;
  return Math.max(0, Math.min(0.95, c));
}

export function calculateCounterattackDamage(params: {
  counterPower: number;
  attackerDefense: number;
  seed: string;
  actionId: string;
}): { damageRatio: number; outcome: CombatOutcome } {
  const rng = createActionRng(params.seed, `counter:${params.actionId}`, 1);
  const damage = params.counterPower / (params.attackerDefense + 100);
  const jitter = 0.85 + rng() * 0.3;
  const d = damage * jitter;
  let outcome: CombatOutcome = 'HIT_LIGHT';
  if (d > 0.5) outcome = 'HIT_HEAVY';
  else if (d > 0.2) outcome = 'HIT_MODERATE';
  return { damageRatio: Math.round(d * 1000) / 1000, outcome };
}

export function combatPrepSeconds(params: {
  attackType: AttackType;
  distanceLy: number;
  techBonus?: number;
}): number {
  const def = ATTACK_TYPES_BY_TYPE[params.attackType];
  if (!def) return COMBAT_PREP_MIN_SEC;
  const tech = Math.max(0, Math.min(0.5, params.techBonus ?? 0));
  const distFactor =
    def.prepDistanceMul <= 0
      ? 1
      : Math.max(0.2, (params.distanceLy / COMBAT_PREP_DISTANCE_DIVISOR) * def.prepDistanceMul);
  const raw = def.basePrepSec * distFactor * (1 - tech);
  return Math.max(COMBAT_PREP_MIN_SEC, Math.min(COMBAT_PREP_MAX_SEC, Math.floor(raw)));
}

export function combatTransitSeconds(distanceLy: number): number {
  const raw = Math.max(5, Math.floor(Math.max(0, distanceLy) * LY_TO_SECONDS_MULTIPLIER * 0.15));
  return Math.max(5, Math.min(COMBAT_TRANSIT_MAX_SEC, raw));
}

export function applyStructureDamage(
  s: TargetStructures,
  dmg: Partial<TargetStructures>
): TargetStructures {
  return {
    mainCore: Math.max(0, s.mainCore - (dmg.mainCore ?? 0)),
    defenseMatrix: Math.max(0, s.defenseMatrix - (dmg.defenseMatrix ?? 0)),
    fleetStrength: Math.max(0, s.fleetStrength - (dmg.fleetStrength ?? 0)),
    sensorGrid: Math.max(0, s.sensorGrid - (dmg.sensorGrid ?? 0)),
    shieldCapacity: Math.max(0, s.shieldCapacity - (dmg.shieldCapacity ?? 0)),
  };
}

export function defenseStatusFromStructures(s: TargetStructures, destroyed: boolean): string {
  if (destroyed || s.mainCore <= 0) return 'destroyed';
  if (s.mainCore < 30 || s.defenseMatrix < 20) return 'critical';
  if (s.mainCore < 70 || s.defenseMatrix < 50) return 'damaged';
  return 'intact';
}

export function estimateStructuresForUi(
  s: TargetStructures | null,
  confidence: number
): Partial<Record<keyof TargetStructures, string>> | null {
  if (!s) return null;
  const band = (v: number) => {
    if (confidence < 0.4) return '?';
    if (confidence < 0.6) {
      if (v >= 70) return 'высокий';
      if (v >= 40) return 'средний';
      return 'низкий';
    }
    return `${Math.round(v / 5) * 5}±${Math.max(5, Math.floor((1 - confidence) * 20))}`;
  };
  return {
    mainCore: band(s.mainCore),
    defenseMatrix: band(s.defenseMatrix),
    fleetStrength: band(s.fleetStrength),
    sensorGrid: band(s.sensorGrid),
    shieldCapacity: band(s.shieldCapacity),
  };
}

export function hasGravityAnomaly(anomalyTypes: string[]): boolean {
  return anomalyTypes.some((a) => a === 'black_hole' || a === 'gravitational_lens');
}

export function combatCostAffordable(
  cost: CombatCost,
  res: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
  }
): boolean {
  return (
    res.highEnergy >= cost.highEnergy &&
    res.antimatter >= cost.antimatter &&
    res.darkEnergy >= cost.darkEnergy &&
    res.darkMatter >= cost.darkMatter &&
    res.fermions >= cost.fermions
  );
}
