/**
 * Stage 10 — solar system generation from civilization seed.
 */

import { createActionRng, rngInt, rngPick } from '../rng';
import { generatePlanet, type GeneratedPlanet } from './planet';

export const STAR_CLASS_IDS = [
  'DWARF',
  'MAIN_SEQUENCE',
  'GIANT',
  'SUPERGIANT',
  'NEUTRON_STAR',
  'BLACK_HOLE',
] as const;
export type StarClassId = (typeof STAR_CLASS_IDS)[number];

export const STAR_CLASS_LABELS_RU: Record<StarClassId, string> = {
  DWARF: 'Карлик',
  MAIN_SEQUENCE: 'Главная последовательность',
  GIANT: 'Гигант',
  SUPERGIANT: 'Сверхгигант',
  NEUTRON_STAR: 'Нейтронная звезда',
  BLACK_HOLE: 'Чёрная дыра',
};

export interface GeneratedStar {
  class: StarClassId;
  temperature: number;
  luminosity: number;
  mass: number;
  ageGyr: number;
  name: string;
  color: string;
}

export interface GeneratedSolarSystem {
  seed: string;
  name: string;
  star: GeneratedStar;
  planets: GeneratedPlanet[];
  homeworldIndex: number;
}

const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π'];
const SYSTEM_ROOT = [
  'Centauri',
  'Cygni',
  'Eridani',
  'Draconis',
  'Lyrae',
  'Aquilae',
  'Persei',
  'Orionis',
  'Pegasi',
  'Andromedae',
];

function starColor(temp: number): string {
  if (temp > 10000) return '#9ecbff';
  if (temp > 7500) return '#cfe8ff';
  if (temp > 6000) return '#fff4d6';
  if (temp > 5000) return '#ffd39a';
  if (temp > 3500) return '#ff9b6a';
  return '#ff6b4a';
}

export function generateStar(systemSeed: string): GeneratedStar {
  const rng = createActionRng(systemSeed, 'star', 0);
  // Prefer living stars for home systems
  const cls = rngPick(rng, [
    'DWARF',
    'DWARF',
    'MAIN_SEQUENCE',
    'MAIN_SEQUENCE',
    'MAIN_SEQUENCE',
    'GIANT',
    'SUPERGIANT',
    'NEUTRON_STAR',
    'BLACK_HOLE',
  ] as const) as StarClassId;

  let temperature = 5500;
  let luminosity = 1;
  let mass = 1;
  let ageGyr = 4.5;

  switch (cls) {
    case 'DWARF':
      temperature = rngInt(rng, 2500, 4500);
      luminosity = Math.round((0.01 + rng() * 0.3) * 1000) / 1000;
      mass = Math.round((0.1 + rng() * 0.6) * 100) / 100;
      ageGyr = Math.round((1 + rng() * 10) * 10) / 10;
      break;
    case 'MAIN_SEQUENCE':
      temperature = rngInt(rng, 4500, 7500);
      luminosity = Math.round((0.4 + rng() * 4) * 100) / 100;
      mass = Math.round((0.7 + rng() * 1.5) * 100) / 100;
      ageGyr = Math.round((0.5 + rng() * 8) * 10) / 10;
      break;
    case 'GIANT':
      temperature = rngInt(rng, 3500, 6000);
      luminosity = Math.round((20 + rng() * 200) * 10) / 10;
      mass = Math.round((1.2 + rng() * 4) * 100) / 100;
      ageGyr = Math.round((0.2 + rng() * 3) * 10) / 10;
      break;
    case 'SUPERGIANT':
      temperature = rngInt(rng, 3500, 12000);
      luminosity = Math.round((1000 + rng() * 20000) * 10) / 10;
      mass = Math.round((8 + rng() * 40) * 10) / 10;
      ageGyr = Math.round((0.01 + rng() * 0.5) * 100) / 100;
      break;
    case 'NEUTRON_STAR':
      temperature = rngInt(rng, 100000, 1000000);
      luminosity = Math.round((0.001 + rng() * 0.1) * 10000) / 10000;
      mass = Math.round((1.2 + rng() * 0.8) * 100) / 100;
      ageGyr = Math.round((0.001 + rng() * 1) * 1000) / 1000;
      break;
    case 'BLACK_HOLE':
      temperature = 0;
      luminosity = 0.0001;
      mass = Math.round((5 + rng() * 30) * 10) / 10;
      ageGyr = Math.round((0.1 + rng() * 5) * 10) / 10;
      break;
  }

  const name = `${rngPick(rng, GREEK)}-${rngPick(rng, SYSTEM_ROOT)}`;
  return {
    class: cls,
    temperature,
    luminosity,
    mass,
    ageGyr,
    name,
    color: starColor(temperature || 3000),
  };
}

export function generateSolarSystem(civSeed: string, preferredName?: string): GeneratedSolarSystem {
  const systemSeed = `${civSeed}::sol`;
  const rng = createActionRng(systemSeed, 'system', 0);
  const star = generateStar(systemSeed);
  const planetCount = rngInt(rng, 3, 10);
  const homeworldIndex = Math.min(planetCount - 1, Math.max(0, rngInt(rng, 0, Math.min(3, planetCount - 1))));

  const planets: GeneratedPlanet[] = [];
  for (let i = 0; i < planetCount; i++) {
    planets.push(generatePlanet(systemSeed, i, i === homeworldIndex, star.temperature));
  }

  const name =
    preferredName?.trim() ||
    `${rngPick(rng, GREEK)}-${rngPick(rng, SYSTEM_ROOT)}-${rngInt(rng, 100, 9999)}`;

  return {
    seed: systemSeed,
    name,
    star,
    planets,
    homeworldIndex,
  };
}
