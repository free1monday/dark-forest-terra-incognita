/**
 * Stage 10 — species (races) and government forms.
 * Deterministic labels + bonuses; server applies modifiers on create/tick.
 */

export const SPECIES_IDS = [
  'HUMAN',
  'INSECTOID',
  'ORGANIC_LARGE',
  'INORGANIC',
  'ENERGY_BEING',
  'SILICATE',
] as const;

export type SpeciesId = (typeof SPECIES_IDS)[number];

export const SPECIES_LABELS_RU: Record<SpeciesId, string> = {
  HUMAN: 'Люди',
  INSECTOID: 'Инсектоиды',
  ORGANIC_LARGE: 'Крупные органики',
  INORGANIC: 'Неорганика',
  ENERGY_BEING: 'Энергетические',
  SILICATE: 'Силикаты',
};

export type GovernmentFormId =
  | 'CONFEDERATION'
  | 'DOMINION'
  | 'REPUBLIC'
  | 'THEOCRACY'
  | 'HIVE'
  | 'COLONY_SWARM'
  | 'SUBSTANCE'
  | 'COLLECTIVE'
  | 'MATRIX'
  | 'CHORUS'
  | 'RESONANCE'
  | 'CRYSTAL_COUNCIL'
  | 'LITHIC_NETWORK';

export const GOVERNMENT_LABELS_RU: Record<GovernmentFormId, string> = {
  CONFEDERATION: 'Конфедерация',
  DOMINION: 'Доминион',
  REPUBLIC: 'Республика',
  THEOCRACY: 'Теократия',
  HIVE: 'Рой',
  COLONY_SWARM: 'Колониальный рой',
  SUBSTANCE: 'Субстанция',
  COLLECTIVE: 'Коллектив',
  MATRIX: 'Матрица',
  CHORUS: 'Хор',
  RESONANCE: 'Резонанс',
  CRYSTAL_COUNCIL: 'Кристаллический совет',
  LITHIC_NETWORK: 'Литосеть',
};

export const GOVERNMENTS_BY_SPECIES: Record<SpeciesId, readonly GovernmentFormId[]> = {
  HUMAN: ['CONFEDERATION', 'DOMINION', 'REPUBLIC', 'THEOCRACY'],
  INSECTOID: ['HIVE', 'COLONY_SWARM'],
  ORGANIC_LARGE: ['HIVE', 'COLONY_SWARM'],
  INORGANIC: ['SUBSTANCE', 'COLLECTIVE', 'MATRIX'],
  ENERGY_BEING: ['CHORUS', 'RESONANCE'],
  SILICATE: ['CRYSTAL_COUNCIL', 'LITHIC_NETWORK'],
};

/** Multiplicative / additive bonuses applied on top of focuses & production. */
export interface SpeciesBonuses {
  diplomacyMul: number;
  productionMul: number;
  populationGrowthMul: number;
  researchMul: number;
  defenseMul: number;
  attackMul: number;
  buildingLongevityMul: number;
  flexibilityMul: number;
  descriptionRu: string;
}

export const SPECIES_BONUSES: Record<SpeciesId, SpeciesBonuses> = {
  HUMAN: {
    diplomacyMul: 1.12,
    productionMul: 1.0,
    populationGrowthMul: 1.05,
    researchMul: 1.05,
    defenseMul: 1.0,
    attackMul: 1.0,
    buildingLongevityMul: 1.0,
    flexibilityMul: 1.15,
    descriptionRu: '+дипломатия, +универсальность',
  },
  INSECTOID: {
    diplomacyMul: 0.85,
    productionMul: 1.18,
    populationGrowthMul: 1.25,
    researchMul: 0.95,
    defenseMul: 1.0,
    attackMul: 1.05,
    buildingLongevityMul: 0.95,
    flexibilityMul: 0.9,
    descriptionRu: '+производство, +население, −дипломатия',
  },
  ORGANIC_LARGE: {
    diplomacyMul: 1.0,
    productionMul: 1.05,
    populationGrowthMul: 1.1,
    researchMul: 0.88,
    defenseMul: 1.15,
    attackMul: 1.08,
    buildingLongevityMul: 1.05,
    flexibilityMul: 0.85,
    descriptionRu: '+выносливость, −скорость исследований',
  },
  INORGANIC: {
    diplomacyMul: 0.95,
    productionMul: 1.0,
    populationGrowthMul: 0.75,
    researchMul: 1.0,
    defenseMul: 1.22,
    attackMul: 0.95,
    buildingLongevityMul: 1.2,
    flexibilityMul: 0.8,
    descriptionRu: '+защита, −рост населения',
  },
  ENERGY_BEING: {
    diplomacyMul: 1.05,
    productionMul: 0.92,
    populationGrowthMul: 0.9,
    researchMul: 1.25,
    defenseMul: 0.9,
    attackMul: 0.82,
    buildingLongevityMul: 0.9,
    flexibilityMul: 1.1,
    descriptionRu: '+исследования, −физические атаки',
  },
  SILICATE: {
    diplomacyMul: 0.98,
    productionMul: 1.0,
    populationGrowthMul: 0.85,
    researchMul: 1.0,
    defenseMul: 1.1,
    attackMul: 1.0,
    buildingLongevityMul: 1.3,
    flexibilityMul: 0.75,
    descriptionRu: '+долголетие зданий, −гибкость',
  },
};

export function isSpeciesId(v: unknown): v is SpeciesId {
  return typeof v === 'string' && (SPECIES_IDS as readonly string[]).includes(v);
}

export function isGovernmentForSpecies(species: SpeciesId, gov: string): gov is GovernmentFormId {
  return (GOVERNMENTS_BY_SPECIES[species] as readonly string[]).includes(gov);
}

export function defaultGovernment(species: SpeciesId): GovernmentFormId {
  return GOVERNMENTS_BY_SPECIES[species][0]!;
}
