/**
 * Stage 10 — planet generation (seeded).
 */

import { createActionRng, rngInt, rngPick } from '../rng';

export const PLANET_TYPE_IDS = [
  'ROCKY',
  'GAS_GIANT',
  'ICE',
  'OCEAN',
  'DESERT',
  'LAVA',
] as const;
export type PlanetTypeId = (typeof PLANET_TYPE_IDS)[number];

export const ATMOSPHERE_IDS = ['NONE', 'THIN', 'BREATHABLE', 'TOXIC', 'DENSE'] as const;
export type AtmosphereId = (typeof ATMOSPHERE_IDS)[number];

export const DUST_IDS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type CosmicDustId = (typeof DUST_IDS)[number];

export const RADIATION_IDS = ['MINIMAL', 'MODERATE', 'HIGH', 'LETHAL'] as const;
export type RadiationId = (typeof RADIATION_IDS)[number];

export const PLANET_TYPE_LABELS_RU: Record<PlanetTypeId, string> = {
  ROCKY: 'Каменистая',
  GAS_GIANT: 'Газовый гигант',
  ICE: 'Ледяная',
  OCEAN: 'Океаническая',
  DESERT: 'Пустынная',
  LAVA: 'Лавовая',
};

export const ATMOSPHERE_LABELS_RU: Record<AtmosphereId, string> = {
  NONE: 'Нет',
  THIN: 'Разреженная',
  BREATHABLE: 'Пригодная',
  TOXIC: 'Токсичная',
  DENSE: 'Плотная',
};

export interface GeneratedPlanet {
  /** Stable id within system: `${systemSeed}:p${index}` */
  key: string;
  index: number;
  name: string;
  type: PlanetTypeId;
  atmosphere: AtmosphereId;
  gravity: number;
  moons: number;
  cosmicDust: CosmicDustId;
  radiation: RadiationId;
  temperatureDay: number;
  temperatureNight: number;
  /** Resource deposit hints (0–100) */
  resources: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
  };
  isHomeworld: boolean;
  orbitRadius: number;
  hue: number;
}

const PLANET_NAME_A = [
  'Терра',
  'Кеплер',
  'Нова',
  'Эос',
  'Астра',
  'Лимб',
  'Хель',
  'Мира',
  'Икар',
  'Селена',
  'Хадс',
  'Вега',
];
const PLANET_NAME_B = [
  'Прайм',
  'Минор',
  'Ультра',
  'Тень',
  'Край',
  'Глубь',
  'Сияние',
  'Разлом',
  'Оплот',
  'Эхо',
];

function gravityComfort(g: number): 'comfort' | 'low' | 'high' | 'extreme' {
  if (g < 0.3) return 'low';
  if (g <= 1.5) return 'comfort';
  if (g <= 2.0) return 'high';
  return 'extreme';
}

export function gravityLabelRu(g: number): string {
  const c = gravityComfort(g);
  const map = {
    comfort: 'комфортно',
    low: 'слабая гравитация',
    high: 'повышенная',
    extreme: 'экстремальная (нужны скафандры)',
  } as const;
  return `${g.toFixed(2)} g · ${map[c]}`;
}

export function canColonizePlanet(p: Pick<GeneratedPlanet, 'type' | 'atmosphere' | 'gravity' | 'radiation' | 'isHomeworld'>, alreadyOwned: boolean): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (alreadyOwned) reasons.push('Уже колонизирована');
  if (p.isHomeworld) reasons.push('Это родной мир');
  if (p.type === 'GAS_GIANT') reasons.push('Газовый гигант — колонизация орбитальных станций (позже)');
  if (p.atmosphere === 'NONE' || p.atmosphere === 'TOXIC') {
    reasons.push('Атмосфера непригодна без теплиц');
  }
  if (p.gravity > 2.0) reasons.push('Гравитация > 2 g');
  if (p.gravity < 0.15) reasons.push('Слишком слабая гравитация');
  if (p.radiation === 'LETHAL') reasons.push('Смертельная радиация');
  return { ok: reasons.length === 0, reasons };
}

export function generatePlanet(
  systemSeed: string,
  index: number,
  isHomeworld: boolean,
  starTempBias = 0
): GeneratedPlanet {
  const rng = createActionRng(systemSeed, 'planet', index);
  const type = isHomeworld
    ? (rngPick(rng, ['ROCKY', 'OCEAN', 'DESERT'] as const) as PlanetTypeId)
    : rngPick(rng, PLANET_TYPE_IDS);

  let atmosphere: AtmosphereId;
  if (isHomeworld) {
    atmosphere = rng() < 0.7 ? 'BREATHABLE' : 'THIN';
  } else if (type === 'GAS_GIANT') {
    atmosphere = 'DENSE';
  } else if (type === 'LAVA') {
    atmosphere = rngPick(rng, ['NONE', 'TOXIC', 'THIN'] as const);
  } else {
    atmosphere = rngPick(rng, ATMOSPHERE_IDS);
  }

  let gravity: number;
  if (type === 'GAS_GIANT') gravity = Math.round((1.5 + rng() * 3.5) * 100) / 100;
  else if (isHomeworld) gravity = Math.round((0.7 + rng() * 0.7) * 100) / 100;
  else gravity = Math.round((0.1 + rng() * 4.5) * 100) / 100;

  const moons = type === 'GAS_GIANT' ? rngInt(rng, 4, 40) : rngInt(rng, 0, 4);
  const cosmicDust = rngPick(rng, DUST_IDS);
  const radiation = isHomeworld
    ? rngPick(rng, ['MINIMAL', 'MODERATE'] as const)
    : rngPick(rng, RADIATION_IDS);

  const baseTemp = Math.floor(starTempBias * 0.05 + (type === 'LAVA' ? 400 : type === 'ICE' ? -80 : 10));
  const temperatureDay = baseTemp + rngInt(rng, -20, 80);
  const temperatureNight = temperatureDay - rngInt(rng, 10, 90);

  const name = isHomeworld
    ? `${rngPick(rng, PLANET_NAME_A)}-${rngPick(rng, PLANET_NAME_B)}`
    : `${rngPick(rng, PLANET_NAME_A)}-${rngInt(rng, 10, 99)}${String.fromCharCode(98 + rngInt(rng, 0, 5))}`;

  return {
    key: `${systemSeed}:p${index}`,
    index,
    name,
    type,
    atmosphere,
    gravity,
    moons,
    cosmicDust,
    radiation,
    temperatureDay,
    temperatureNight,
    resources: {
      highEnergy: rngInt(rng, 5, 90),
      antimatter: rngInt(rng, 0, 40),
      darkEnergy: rngInt(rng, 0, 50),
      darkMatter: rngInt(rng, 5, 70),
      fermions: rngInt(rng, 0, 35),
    },
    isHomeworld,
    orbitRadius: 0.4 + index * (0.35 + rng() * 0.25),
    hue: Math.floor(rng() * 360),
  };
}
