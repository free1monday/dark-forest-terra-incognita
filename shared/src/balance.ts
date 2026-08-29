/**
 * Stage 9 balance notes (MVP playability):
 * - Building HE costs: soft exponential (growth 1.35–1.55). Early game should unlock collider L3 within ~10 min of active play.
 * - Expedition costs scale with type; localScan must stay cheap at L1–10.
 * - Artifact weights live in expeditions.ts — rare/legendary should stay <15% combined on deep runs.
 * - Diplomacy costs scale with distance (SoL fantasy); never free except CEASE_COMM.
 * - Dark strike is intentionally the most expensive combat option (DE + AM + HE).
 * - Level curve: progression.ts soft-caps HE/DE for MVP; production must not outpace soft-cap before L40 without siphon/shop HE.
 * - Shop sells ONLY highEnergy + fermions (+ capacity). Never AM/DE/DM.
 * - Capacity expansions are the main credit sink after early HE packs.
 */
import type { BuildingId } from './constants';
import type { ExpeditionResultKind } from './types';

export interface BuildingDef {
  id: BuildingId;
  baseCostHe: number;
  growth: number;
  /** HE production per level per second (base, before modifiers) */
  hePerLevel: number;
  unlockedAtLevel: number;
  stage1Active: boolean;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  high_energy_collider: {
    id: 'high_energy_collider',
    baseCostHe: 15,
    growth: 1.35,
    hePerLevel: 0.5,
    unlockedAtLevel: 1,
    stage1Active: true,
  },
  research_node: {
    id: 'research_node',
    baseCostHe: 25,
    growth: 1.4,
    hePerLevel: 0,
    unlockedAtLevel: 1,
    stage1Active: true,
  },
  probe_factory: {
    id: 'probe_factory',
    baseCostHe: 40,
    growth: 1.45,
    hePerLevel: 0,
    unlockedAtLevel: 2,
    stage1Active: true, // stub effects
  },
  fermion_synthesizer: {
    id: 'fermion_synthesizer',
    baseCostHe: 80,
    growth: 1.5,
    hePerLevel: 0,
    unlockedAtLevel: 5,
    stage1Active: true,
  },
  dark_sensor: {
    id: 'dark_sensor',
    baseCostHe: 60,
    growth: 1.42,
    hePerLevel: 0,
    unlockedAtLevel: 3,
    stage1Active: true,
  },
  dark_energy_siphon: {
    id: 'dark_energy_siphon',
    baseCostHe: 500,
    growth: 1.55,
    hePerLevel: 0,
    unlockedAtLevel: 60,
    stage1Active: true,
  },
};

export const BUILDING_ORDER: BuildingId[] = [
  'high_energy_collider',
  'research_node',
  'probe_factory',
  'dark_sensor',
  'fermion_synthesizer',
  'dark_energy_siphon',
];

/** Base capacity values */
export const BASE_CAPACITY = {
  highEnergy: 1000,
  antimatter: 100,
  darkEnergy: 100,
  darkMatter: 100,
  fermions: 50,
};

export const CAPACITY_PER_COLLIDER_LEVEL = 200;
export const CAPACITY_PER_CIV_LEVEL = 50;

export interface ExpeditionOutcomeDef {
  kind: ExpeditionResultKind;
  baseWeight: number;
}

export const EXPEDITION_OUTCOMES: ExpeditionOutcomeDef[] = [
  { kind: 'empty', baseWeight: 35 },
  { kind: 'resource_traces', baseWeight: 20 },
  { kind: 'anomaly', baseWeight: 15 },
  { kind: 'high_energy_find', baseWeight: 18 },
  { kind: 'weak_signal', baseWeight: 12 },
];

/** Stage 4 — civilization signal detection */
export const SIGNAL_DETECTION_BASE_CHANCE: Record<string, number> = {
  localScan: 0,
  probeSurvey: 5,
  deepExpedition: 12,
  rift4D: 20,
};

export const SIGNAL_ACCURACY_BASE: Record<string, number> = {
  localScan: 0.35,
  probeSurvey: 0.5,
  deepExpedition: 0.7,
  rift4D: 0.85,
};

export const FALSE_POSITIVE_CHANCE = 0.1;
export const MAX_DETECTION_CHANCE = 0.5;
export const REAL_PLAYER_TARGET_CHANCE = 0.2;

export const SIGNAL_DISTANCE_RANGES: Record<
  string,
  { min: number; max: number }
> = {
  localScan: { min: 200, max: 1500 },
  probeSurvey: { min: 500, max: 5000 },
  deepExpedition: { min: 2000, max: 20000 },
  rift4D: { min: 10000, max: 50000 },
};

/**
 * Stage 5 — diplomacy / light-speed delay.
 * Production fantasy: 1 ly takes years. MVP scaling: 1 ly ≈ 60 real seconds
 * so a 5–100 ly contact is testable without multi-hour waits.
 */
export const LY_TO_SECONDS_MULTIPLIER = 60;

/** Base HE cost per light-year for an unencrypted diplomatic packet. */
/** HE cost scales gently with distance (soft-capped in diplomacyCardCost). */
export const DIPLOMACY_COST_HE_PER_LY = 0.04;
export const DIPLOMACY_COST_HE_BASE = 25;
export const DIPLOMACY_COST_HE_MAX = 600;

/** Flat antimatter for high-stakes cards (pact / ultimatum). */
export const DIPLOMACY_COST_AM_PACT = 25;
export const DIPLOMACY_COST_AM_ULTIMATUM = 40;

/** Dark matter cost for encrypted transmission (reduces exposure bump). */
export const DIPLOMACY_ENCRYPT_DM_COST = 15;

export const TRUST_GAIN_GREETING = 5;
export const TRUST_GAIN_DATA_EXCHANGE = 8;
export const TRUST_GAIN_NEUTRALITY = 12;
export const TRUST_LOSS_ULTIMATUM = 10;
export const TRUST_LOSS_THREAT = 5;

export const TENSION_GAIN_GREETING = 2;
export const TENSION_GAIN_THREAT = 15;
export const TENSION_GAIN_ULTIMATUM = 25;
export const TENSION_GAIN_DATA_REJECT = 8;
export const TENSION_LOSS_NEUTRALITY = 20;
export const TENSION_LOSS_GREETING_REPLY = 3;
export const TENSION_THRESHOLD_WAR = 100;

export const DATA_EXCHANGE_MIN_TRUST = 30;
export const NEUTRALITY_PACT_MIN_TRUST = 60;

/** How much contact confidence / level range improves on successful DATA_EXCHANGE. */
export const DATA_EXCHANGE_ACCURACY_BOOST = 0.12;
export const DATA_EXCHANGE_LEVEL_RANGE_SHRINK = 0.45;

/** signalExposure bump when sending an unencrypted diplomatic signal. */
export const DIPLOMACY_EXPOSURE_BUMP = 0.08;
export const DIPLOMACY_EXPOSURE_BUMP_ENCRYPTED = 0.03;

/** Stage 6 — combat */
export const COMBAT_HIT_BASE = 0.3;
export const COMBAT_HIT_MIN = 0.05;
export const COMBAT_HIT_MAX = 0.95;
/** Prep time scale: seconds ≈ base * (distanceLy / 1000). Soft-capped for MVP. */
export const COMBAT_PREP_DISTANCE_DIVISOR = 1000;
export const COMBAT_PREP_MIN_SEC = 8;
export const COMBAT_PREP_MAX_SEC = 180;
/** Transit after prep uses same SoL multiplier as diplomacy, soft-capped. */
export const COMBAT_TRANSIT_MAX_SEC = 300;
export const COMBAT_RECON_ACCURACY_BOOST = 0.1;
export const COMBAT_RECON_LEVEL_SHRINK = 0.35;
export const COMBAT_RECON_COORD_SHRINK = 0.4;
export const COMBAT_TENSION_ON_RECON = 8;
export const COMBAT_TENSION_ON_STRIKE = 25;
export const COMBAT_TENSION_ON_DARK = 40;
export const COMBAT_EXPOSURE_ON_STRIKE = 0.12;
export const COMBAT_EXPOSURE_ON_DARK = 0.25;
export const COMBAT_JAM_DURATION_SEC = 600;
export const COMBAT_DECEPTION_SENSOR_PENALTY = 15;