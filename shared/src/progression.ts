/** Stage 8 — late-game progression (levels 60+, dark energy, galaxy travel). */
import { LEVEL_COST_GLOBAL_MUL } from './balance';


export const DARK_ENERGY_LEVEL_THRESHOLD = 60;
export const PHYSICS_LAB_LEVEL = 90;
export const GALAXY_TRAVEL_LEVEL = 80;
export const MAX_ACTIVE_PHYSICS_LAWS = 3;

/**
 * HE cost to go from currentLevel -> currentLevel+1.
 * Soft-capped for MVP playability while preserving steep late curve.
 */
export function civilizationLevelCostHe(currentLevel: number): number {
  /**
   * Stage 11: × LEVEL_COST_GLOBAL_MUL.
   * Stage 12: after L10 use gentler exponent (1.12) so post-14 is not a hard wall.
   * L1–10 keep classic 1.22 curve (tutorial pacing).
   */
  const mul = LEVEL_COST_GLOBAL_MUL;
  if (currentLevel < 1) return Math.floor(50 * mul);
  if (currentLevel <= 10) {
    return Math.floor(50 * Math.pow(1.22, currentLevel - 1) * mul);
  }
  // cost at 10→11 as anchor
  const anchor = 50 * Math.pow(1.22, 9) * mul;
  if (currentLevel < 60) {
    // steps beyond 10 with softer 1.12
    return Math.floor(anchor * Math.pow(1.12, currentLevel - 10));
  }
  const at60 = anchor * Math.pow(1.12, 50);
  const late = Math.floor(at60 * Math.pow(1.15, currentLevel - 60));
  return Math.min(500_000_000, Math.max(Math.floor(at60), late));
}

/**
 * Dark energy cost for levels 61+ (cost to reach level currentLevel+1 when currentLevel >= 60).
 * currentLevel is the *current* level before leveling up.
 */
export function civilizationLevelCostDarkEnergy(currentLevel: number): number {
  if (currentLevel < DARK_ENERGY_LEVEL_THRESHOLD) return 0;
  // level 60->61 needs DE; index = currentLevel - 60
  const step = currentLevel - DARK_ENERGY_LEVEL_THRESHOLD;
  const raw = Math.floor(100 * Math.pow(1.35, step) * LEVEL_COST_GLOBAL_MUL);
  return Math.min(20_000_000, Math.max(100 * LEVEL_COST_GLOBAL_MUL, raw));
}

export function civilizationLevelCostDarkMatter(currentLevel: number): number {
  if (currentLevel < 89) return 0;
  return Math.floor(10 * Math.pow(1.3, currentLevel - 89));
}

export function civilizationLevelCostAntimatter(currentLevel: number): number {
  if (currentLevel < 89) return 0;
  return Math.floor(15 * Math.pow(1.25, currentLevel - 89));
}

export interface LevelCostBreakdown {
  highEnergy: number;
  darkEnergy: number;
  darkMatter: number;
  antimatter: number;
}

export function civilizationLevelCosts(currentLevel: number): LevelCostBreakdown {
  return {
    highEnergy: civilizationLevelCostHe(currentLevel),
    darkEnergy: civilizationLevelCostDarkEnergy(currentLevel),
    darkMatter: civilizationLevelCostDarkMatter(currentLevel),
    antimatter: civilizationLevelCostAntimatter(currentLevel),
  };
}

/** Vacuum siphon DE production per building level per second. */
export const DARK_ENERGY_SIPHON_PER_LEVEL = 0.08;

export interface GalaxyTravelCost {
  fermions: number;
  darkEnergy: number;
  highEnergy: number;
}

export function galaxyTravelCost(civLevel: number): GalaxyTravelCost {
  return {
    fermions: Math.max(50_000, Math.floor(200_000 + civLevel * 5_000)),
    darkEnergy: Math.max(20_000, Math.floor(80_000 + civLevel * 2_000)),
    highEnergy: Math.max(10_000, Math.floor(civLevel * 500)),
  };
}

/** Prep duration for intergalactic travel (seconds). MVP-scaled ~2 min default. */
export const GALAXY_TRAVEL_DURATION_SEC = 120;

export function galaxyTravelDurationSec(civLevel: number): number {
  // Higher level slightly faster engines
  const tech = Math.min(0.4, Math.max(0, (civLevel - 80) * 0.01));
  return Math.max(60, Math.floor(GALAXY_TRAVEL_DURATION_SEC * (1 - tech)));
}
