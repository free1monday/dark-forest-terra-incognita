import type { ResourceId } from './constants';

export type ArtifactRarity = 'common' | 'rare' | 'legendary' | 'mythic';

/** Additive / multiplicative effect keys used by formulas. */
export interface ArtifactEffects {
  /** Multiplier bonus to HE production (0.05 = +5%). */
  heProductionBonus?: number;
  antimatterProductionBonus?: number;
  darkMatterProductionBonus?: number;
  darkEnergyProductionBonus?: number;
  fermionsProductionBonus?: number;
  allProductionBonus?: number;
  /** Additive to effective radar. */
  radarBonus?: number;
  /** Multiplier reduction to local scan cost (0.05 = -5%). */
  localScanCostReduction?: number;
  /** Multiplier reduction to probe duration. */
  probeDurationReduction?: number;
  /** Multiplier reduction to all expedition durations. */
  allExpeditionDurationReduction?: number;
  /** Unlocks free re-entry to 4D without rediscovery. */
  unlock4DRift?: boolean;
  /** Allows reroll of one failed expedition per 24h (flag for future). */
  expeditionReroll?: boolean;
  /** Random powerful effect on level-up (flag). */
  levelUpEcho?: boolean;
  /** Opens N random sectors (meta flag for future map). */
  revealSectors?: number;
  /** Additive combat attack power fraction (Stage 6). */
  combatAttackBonus?: number;
  /** Additive defense power fraction (Stage 6). */
  combatDefenseBonus?: number;
}

export interface ArtifactDef {
  key: string;
  nameRu: string;
  rarity: ArtifactRarity;
  descriptionRu: string;
  effects: ArtifactEffects;
}

export const ARTIFACT_CATALOG: ArtifactDef[] = [
  // —— Common ——
  {
    key: 'neutron_shard',
    nameRu: 'Осколок нейтронной звезды',
    rarity: 'common',
    descriptionRu: 'Плотный фрагмент вырожденной материи. Усиливает контуры высоких энергий.',
    effects: { heProductionBonus: 0.05 },
  },
  {
    key: 'antimatter_crystal',
    nameRu: 'Кристалл антиматерии',
    rarity: 'common',
    descriptionRu: 'Стабилизированный микрокристалл. Слегка повышает выход антиматерии.',
    effects: { antimatterProductionBonus: 0.03 },
  },
  {
    key: 'vacuum_stabilizer',
    nameRu: 'Стабилизатор вакуума',
    rarity: 'common',
    descriptionRu: 'Снижает энергетические потери при локальном сканировании.',
    effects: { localScanCostReduction: 0.05 },
  },
  {
    key: 'fermion_lattice',
    nameRu: 'Фермионная решётка',
    rarity: 'common',
    descriptionRu: 'Кристаллическая матрица барионной сборки.',
    effects: { fermionsProductionBonus: 0.04 },
  },
  {
    key: 'sensor_foil',
    nameRu: 'Сенсорная фольга',
    rarity: 'common',
    descriptionRu: 'Тонкий метаматериал для калибровки приёмников.',
    effects: { radarBonus: 3 },
  },
  {
    key: 'isotope_cache',
    nameRu: 'Изотопный тайник',
    rarity: 'common',
    descriptionRu: 'Компактный накопитель возбуждённых состояний.',
    effects: { heProductionBonus: 0.03 },
  },
  // —— Rare ——
  {
    key: 'relic_resonator',
    nameRu: 'Реликтовый резонатор',
    rarity: 'rare',
    descriptionRu: 'Усиливает когерентность сенсорной матрицы.',
    effects: { radarBonus: 10 },
  },
  {
    key: 'dark_capacitor',
    nameRu: 'Тёмный конденсатор',
    rarity: 'rare',
    descriptionRu: 'Накопитель скрытой массы. Повышает выход тёмной материи.',
    effects: { darkMatterProductionBonus: 0.08 },
  },
  {
    key: 'quantum_beacon',
    nameRu: 'Квантовый маяк',
    rarity: 'rare',
    descriptionRu: 'Сокращает время зондовых маршрутов за счёт коррелированных переходов.',
    effects: { probeDurationReduction: 0.15 },
  },
  {
    key: 'entropy_damper',
    nameRu: 'Демпфер энтропии',
    rarity: 'rare',
    descriptionRu: 'Слегка повышает всё производство и стабильность процессов.',
    effects: { allProductionBonus: 0.06, heProductionBonus: 0.02 },
  },
  {
    key: 'neutrino_lens',
    nameRu: 'Нейтринная линза',
    rarity: 'rare',
    descriptionRu: 'Оптика для слабо взаимодействующих потоков.',
    effects: { radarBonus: 7, darkEnergyProductionBonus: 0.05 },
  },
  // —— Legendary ——
  {
    key: 'singularity_seed',
    nameRu: 'Зерно сингулярности',
    rarity: 'legendary',
    descriptionRu: 'Микроскопический горизонт. Существенно усиливает все контуры добычи.',
    effects: { allProductionBonus: 0.2 },
  },
  {
    key: 'wormhole_map',
    nameRu: 'Карта червоточин',
    rarity: 'legendary',
    descriptionRu: 'Топологическая схема скрытых тоннелей. Открывает сектора (метаданные).',
    effects: { revealSectors: 3, allExpeditionDurationReduction: 0.1 },
  },
  {
    key: 'alcubierre_drive',
    nameRu: 'Двигатель Алькубьерре',
    rarity: 'legendary',
    descriptionRu: 'Локальный пузырь искривления. Существенно ускоряет экспедиции.',
    effects: { allExpeditionDurationReduction: 0.3 },
  },
  {
    key: 'chronon_battery',
    nameRu: 'Хрононная батарея',
    rarity: 'legendary',
    descriptionRu: 'Накопитель временны́х квантов. Усиливает ВЭ и радар.',
    effects: { heProductionBonus: 0.12, radarBonus: 12 },
  },
  // —— Mythic ——
  {
    key: 'core_4d_fragment',
    nameRu: 'Фрагмент 4D-ядра',
    rarity: 'mythic',
    descriptionRu: 'Осколок четырёхмерной структуры. Постоянный доступ к 4D-разлому.',
    effects: { unlock4DRift: true, radarBonus: 15 },
  },
  {
    key: 'causality_matrix',
    nameRu: 'Матрица причинности',
    rarity: 'mythic',
    descriptionRu: 'Позволяет переиграть одну неудачную экспедицию раз в 24 часа.',
    effects: { expeditionReroll: true, allProductionBonus: 0.1 },
  },
  {
    key: 'dead_god_echo',
    nameRu: 'Эхо мёртвого бога',
    rarity: 'mythic',
    descriptionRu: 'При каждом повышении уровня цивилизации — случайный мощный отголосок.',
    effects: { levelUpEcho: true, allProductionBonus: 0.08, radarBonus: 8 },
  },
];

export const ARTIFACTS_BY_KEY: Record<string, ArtifactDef> = Object.fromEntries(
  ARTIFACT_CATALOG.map((a) => [a.key, a])
);

export const ARTIFACTS_BY_RARITY: Record<ArtifactRarity, ArtifactDef[]> = {
  common: ARTIFACT_CATALOG.filter((a) => a.rarity === 'common'),
  rare: ARTIFACT_CATALOG.filter((a) => a.rarity === 'rare'),
  legendary: ARTIFACT_CATALOG.filter((a) => a.rarity === 'legendary'),
  mythic: ARTIFACT_CATALOG.filter((a) => a.rarity === 'mythic'),
};

export const ARTIFACT_SLOT_LIMIT = 20;

export function sumArtifactEffects(keys: string[]): ArtifactEffects {
  const out: ArtifactEffects = {};
  for (const key of keys) {
    const def = ARTIFACTS_BY_KEY[key];
    if (!def) continue;
    const e = def.effects;
    out.heProductionBonus = (out.heProductionBonus ?? 0) + (e.heProductionBonus ?? 0);
    out.antimatterProductionBonus =
      (out.antimatterProductionBonus ?? 0) + (e.antimatterProductionBonus ?? 0);
    out.darkMatterProductionBonus =
      (out.darkMatterProductionBonus ?? 0) + (e.darkMatterProductionBonus ?? 0);
    out.darkEnergyProductionBonus =
      (out.darkEnergyProductionBonus ?? 0) + (e.darkEnergyProductionBonus ?? 0);
    out.fermionsProductionBonus =
      (out.fermionsProductionBonus ?? 0) + (e.fermionsProductionBonus ?? 0);
    out.allProductionBonus = (out.allProductionBonus ?? 0) + (e.allProductionBonus ?? 0);
    out.radarBonus = (out.radarBonus ?? 0) + (e.radarBonus ?? 0);
    out.localScanCostReduction =
      (out.localScanCostReduction ?? 0) + (e.localScanCostReduction ?? 0);
    out.probeDurationReduction =
      (out.probeDurationReduction ?? 0) + (e.probeDurationReduction ?? 0);
    out.allExpeditionDurationReduction =
      (out.allExpeditionDurationReduction ?? 0) + (e.allExpeditionDurationReduction ?? 0);
    if (e.unlock4DRift) out.unlock4DRift = true;
    if (e.expeditionReroll) out.expeditionReroll = true;
    if (e.levelUpEcho) out.levelUpEcho = true;
    out.revealSectors = (out.revealSectors ?? 0) + (e.revealSectors ?? 0);
    out.combatAttackBonus = (out.combatAttackBonus ?? 0) + (e.combatAttackBonus ?? 0);
    out.combatDefenseBonus = (out.combatDefenseBonus ?? 0) + (e.combatDefenseBonus ?? 0);
  }
  return out;
}

export type { ResourceId };
