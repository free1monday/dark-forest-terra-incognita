/**
 * Stage 10 — population growth formulas (server tick).
 * Population is integer (BigInt-compatible via string/number on wire).
 */

import type { SpeciesId } from './species';
import { SPECIES_BONUSES } from './species';
import type { PoliticalRegimeId } from './politics';
import { REGIME_BONUSES } from './politics';

/** Base pop at civ create. */
export const STARTING_POPULATION = 1_000_000;

/** Soft daily-ish growth scaled to per-second tick (idle MMO). */
export const BASE_POP_GROWTH_PER_SEC = 0.15;

export interface PopulationTickInput {
  population: number;
  colonies: number;
  civLevel: number;
  highEnergy: number;
  highEnergyCapacity: number;
  species: SpeciesId;
  regime: PoliticalRegimeId;
  /** collider + research levels sum as "infrastructure" */
  infrastructureScore: number;
  seconds: number;
}

/**
 * Discrete population delta for `seconds` of catch-up.
 * Caps at soft max based on colonies and level.
 */
export function populationDelta(input: PopulationTickInput): number {
  const {
    population,
    colonies,
    civLevel,
    highEnergy,
    highEnergyCapacity,
    species,
    regime,
    infrastructureScore,
    seconds,
  } = input;

  if (seconds <= 0 || population <= 0) return 0;

  const softCap =
    STARTING_POPULATION *
    Math.max(1, colonies) *
    (1 + civLevel * 0.08) *
    (1 + infrastructureScore * 0.02);

  if (population >= softCap) return 0;

  const fill = highEnergyCapacity > 0 ? highEnergy / highEnergyCapacity : 0.5;
  const energyFactor = 0.6 + Math.min(1, Math.max(0, fill)) * 0.5;

  const speciesMul = SPECIES_BONUSES[species]?.populationGrowthMul ?? 1;
  const regimeMul =
    (REGIME_BONUSES[regime]?.efficiencyMul ?? 1) *
    (REGIME_BONUSES[regime]?.stabilityMul ?? 1);

  const colonyMul = 1 + Math.max(0, colonies - 1) * 0.12;
  const levelMul = 1 + civLevel * 0.01;

  const rate =
    BASE_POP_GROWTH_PER_SEC *
    energyFactor *
    speciesMul *
    regimeMul *
    colonyMul *
    levelMul *
    (1 + infrastructureScore * 0.015);

  // Logistic approach to soft cap
  const room = Math.max(0, 1 - population / softCap);
  const raw = population * (rate / 1000) * seconds * room;
  const gained = Math.floor(raw);
  return Math.max(0, Math.min(gained, Math.floor(softCap - population)));
}

export function formatPopulation(n: number | string | bigint): string {
  const v = typeof n === 'bigint' ? Number(n) : typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
  return String(Math.floor(v));
}
