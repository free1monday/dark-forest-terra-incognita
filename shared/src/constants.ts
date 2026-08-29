/** Game-wide constants and display names (RU labels live in client). */

export const GAME_TITLE = 'Тёмный Лес: Терра Инкогнита';
export const GAME_SLOGAN = 'Вселенная детерминирована, вероятностна и не случайна.';
export const SAVE_KEY = 'darkforest_terra_incognita_v1';
export const SAVE_VERSION = 1 as const;

export const TICK_MS = 1000;
export const JOURNAL_MAX = 100;

export const RESOURCE_IDS = [
  'highEnergy',
  'antimatter',
  'darkEnergy',
  'darkMatter',
  'fermions',
] as const;

export type ResourceId = (typeof RESOURCE_IDS)[number];

export const BUILDING_IDS = [
  'high_energy_collider',
  'research_node',
  'probe_factory',
  'fermion_synthesizer',
  'dark_sensor',
  'dark_energy_siphon',
] as const;

export type BuildingId = (typeof BUILDING_IDS)[number];

export const FOCUS_KEYS = [
  'scienceFocus',
  'expansionFocus',
  'secrecy',
  'aggression',
  'diplomacyFocus',
  'riskLevel',
] as const;

export type FocusKey = (typeof FOCUS_KEYS)[number];

export const DEFAULT_FOCUSES: Record<FocusKey, number> = {
  scienceFocus: 50,
  expansionFocus: 40,
  secrecy: 50,
  aggression: 30,
  diplomacyFocus: 40,
  riskLevel: 40,
};

export const MAX_CIV_LEVEL = 100;
export const MVP_SOFT_LEVEL_CAP = 10; // documented full balance target for stage 1 UX hints

/** Offline production catch-up cap (ms). Stage 2. */
export const OFFLINE_CAP_MS = 2 * 60 * 60 * 1000;

/** Starting high energy on civilization create. */
export const STARTING_HIGH_ENERGY = 40;

/** Auth token storage key (client). */
export const AUTH_TOKEN_KEY = 'darkforest_auth_token_v1';
