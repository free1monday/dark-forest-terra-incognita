export type DiscoveredAnomalyType =
  | 'asteroid_belt'
  | 'dark_cloud'
  | 'wormhole'
  | 'neutron_star'
  | 'black_hole'
  | 'relic_radiation'
  | 'gravitational_lens'
  | 'unstable_vacuum'
  | 'rift_4d';

export interface AnomalyDef {
  type: DiscoveredAnomalyType;
  nameRu: string;
  descriptionRu: string;
  /** Additive radar bonus while owned. */
  radarBonus: number;
  /** Passive resource production per second (base, before civ modifiers). */
  passiveHePerSec: number;
  passiveAntimatterPerSec: number;
  passiveDarkEnergyPerSec: number;
  passiveDarkMatterPerSec: number;
  passiveFermionsPerSec: number;
  /** Expedition duration multiplier (<1 faster). */
  expeditionDurationMul: number;
  /** Trap weight multiplier. */
  trapRiskMul: number;
  danger: number;
}

export const ANOMALY_CATALOG: Record<DiscoveredAnomalyType, AnomalyDef> = {
  asteroid_belt: {
    type: 'asteroid_belt',
    nameRu: 'Астероидный пояс',
    descriptionRu:
      'Плотный пояс обломков. Стабильный источник фермионов при контролируемой добыче.',
    radarBonus: 0,
    passiveHePerSec: 0,
    passiveAntimatterPerSec: 0,
    passiveDarkEnergyPerSec: 0,
    passiveDarkMatterPerSec: 0,
    passiveFermionsPerSec: 0.15,
    expeditionDurationMul: 1,
    trapRiskMul: 1,
    danger: 1,
  },
  dark_cloud: {
    type: 'dark_cloud',
    nameRu: 'Тёмное облако',
    descriptionRu:
      'Непрозрачная область. Затрудняет зонды и повышает риск навигационных сбоев.',
    radarBonus: -5,
    passiveHePerSec: 0,
    passiveAntimatterPerSec: 0,
    passiveDarkEnergyPerSec: 0,
    passiveDarkMatterPerSec: 0.05,
    passiveFermionsPerSec: 0,
    expeditionDurationMul: 1.1,
    trapRiskMul: 1.25,
    danger: 4,
  },
  wormhole: {
    type: 'wormhole',
    nameRu: 'Червоточина',
    descriptionRu: 'Топологический тоннель. Сокращает время дальних экспедиций.',
    radarBonus: 2,
    passiveHePerSec: 0,
    passiveAntimatterPerSec: 0,
    passiveDarkEnergyPerSec: 0.02,
    passiveDarkMatterPerSec: 0,
    passiveFermionsPerSec: 0,
    expeditionDurationMul: 0.85,
    trapRiskMul: 1.1,
    danger: 3,
  },
  neutron_star: {
    type: 'neutron_star',
    nameRu: 'Нейтронная звезда',
    descriptionRu: 'Экстремальный источник высоких энергий. Опасна, но продуктивна.',
    radarBonus: 0,
    passiveHePerSec: 0.35,
    passiveAntimatterPerSec: 0.02,
    passiveDarkEnergyPerSec: 0,
    passiveDarkMatterPerSec: 0,
    passiveFermionsPerSec: 0,
    expeditionDurationMul: 1,
    trapRiskMul: 1.15,
    danger: 5,
  },
  black_hole: {
    type: 'black_hole',
    nameRu: 'Чёрная дыра',
    descriptionRu:
      'Горизонт событий. Источник тёмной энергии. Прямые удары (позже) затруднены.',
    radarBonus: -3,
    passiveHePerSec: 0.05,
    passiveAntimatterPerSec: 0.05,
    passiveDarkEnergyPerSec: 0.2,
    passiveDarkMatterPerSec: 0.08,
    passiveFermionsPerSec: 0,
    expeditionDurationMul: 1.05,
    trapRiskMul: 1.35,
    danger: 8,
  },
  relic_radiation: {
    type: 'relic_radiation',
    nameRu: 'Реликтовое излучение',
    descriptionRu: 'Аномальный всплеск фонового спектра. Повышает точность сенсоров.',
    radarBonus: 8,
    passiveHePerSec: 0.05,
    passiveAntimatterPerSec: 0,
    passiveDarkEnergyPerSec: 0.03,
    passiveDarkMatterPerSec: 0,
    passiveFermionsPerSec: 0,
    expeditionDurationMul: 1,
    trapRiskMul: 0.95,
    danger: 1,
  },
  gravitational_lens: {
    type: 'gravitational_lens',
    nameRu: 'Гравитационная линза',
    descriptionRu: 'Искривление лучей. Улучшает обнаружение на больших дистанциях.',
    radarBonus: 12,
    passiveHePerSec: 0,
    passiveAntimatterPerSec: 0,
    passiveDarkEnergyPerSec: 0.04,
    passiveDarkMatterPerSec: 0.02,
    passiveFermionsPerSec: 0,
    expeditionDurationMul: 0.95,
    trapRiskMul: 1,
    danger: 2,
  },
  unstable_vacuum: {
    type: 'unstable_vacuum',
    nameRu: 'Нестабильный вакуум',
    descriptionRu: 'Локальная метастабильность. Экспедиции рискованны, но богаты.',
    radarBonus: 0,
    passiveHePerSec: 0.1,
    passiveAntimatterPerSec: 0.08,
    passiveDarkEnergyPerSec: 0.05,
    passiveDarkMatterPerSec: 0.05,
    passiveFermionsPerSec: 0.05,
    expeditionDurationMul: 1.15,
    trapRiskMul: 1.5,
    danger: 7,
  },
  rift_4d: {
    type: 'rift_4d',
    nameRu: '4D-разлом',
    descriptionRu:
      'Разрыв пространственной ткани. Открывает доступ к специализированной экспедиции.',
    radarBonus: 5,
    passiveHePerSec: 0.1,
    passiveAntimatterPerSec: 0.05,
    passiveDarkEnergyPerSec: 0.15,
    passiveDarkMatterPerSec: 0.15,
    passiveFermionsPerSec: 0.05,
    expeditionDurationMul: 1,
    trapRiskMul: 1.2,
    danger: 9,
  },
};

export const ANOMALY_TYPES = Object.keys(ANOMALY_CATALOG) as DiscoveredAnomalyType[];
