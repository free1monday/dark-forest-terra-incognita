/**
 * Stage 10 — political regimes and their gameplay modifiers.
 */

export const POLITICAL_REGIME_IDS = [
  'SCIENTISM',
  'ANARCHY',
  'MILITARISM',
  'DEMOCRACY',
] as const;

export type PoliticalRegimeId = (typeof POLITICAL_REGIME_IDS)[number];

export const POLITICAL_REGIME_LABELS_RU: Record<PoliticalRegimeId, string> = {
  SCIENTISM: 'Сциентизм',
  ANARCHY: 'Анархия',
  MILITARISM: 'Милитаризм',
  DEMOCRACY: 'Демократия',
};

export interface RegimeBonuses {
  researchMul: number;
  stabilityMul: number;
  randomEventMul: number;
  efficiencyMul: number;
  attackMul: number;
  diplomacyMul: number;
  decisionSpeedMul: number;
  descriptionRu: string;
}

export const REGIME_BONUSES: Record<PoliticalRegimeId, RegimeBonuses> = {
  SCIENTISM: {
    researchMul: 1.2,
    stabilityMul: 0.9,
    randomEventMul: 1.0,
    efficiencyMul: 1.05,
    attackMul: 0.95,
    diplomacyMul: 1.0,
    decisionSpeedMul: 1.0,
    descriptionRu: '+исследования, −стабильность',
  },
  ANARCHY: {
    researchMul: 0.95,
    stabilityMul: 0.75,
    randomEventMul: 1.35,
    efficiencyMul: 0.88,
    attackMul: 1.05,
    diplomacyMul: 0.9,
    decisionSpeedMul: 1.15,
    descriptionRu: '+случайные события, −эффективность',
  },
  MILITARISM: {
    researchMul: 0.92,
    stabilityMul: 1.05,
    randomEventMul: 0.95,
    efficiencyMul: 1.0,
    attackMul: 1.2,
    diplomacyMul: 0.8,
    decisionSpeedMul: 1.1,
    descriptionRu: '+атака, −дипломатия',
  },
  DEMOCRACY: {
    researchMul: 1.0,
    stabilityMul: 1.1,
    randomEventMul: 0.9,
    efficiencyMul: 1.0,
    attackMul: 0.95,
    diplomacyMul: 1.2,
    decisionSpeedMul: 0.85,
    descriptionRu: '+дипломатия, −скорость решений',
  },
};

/** Building that unlocks regime change (Stage 10). */
export const PARLIAMENT_BUILDING_HINT = 'research_node';
export const PARLIAMENT_MIN_LEVEL = 5;
export const REGIME_CHANGE_COST_HE = 200;
export const REGIME_CHANGE_COST_FERMIONS = 5;

export function isPoliticalRegimeId(v: unknown): v is PoliticalRegimeId {
  return typeof v === 'string' && (POLITICAL_REGIME_IDS as readonly string[]).includes(v);
}
