/**
 * Stage 10 — galaxy / supercluster naming & lightweight coords.
 */

import { createActionRng, rngInt, rngPick } from '../rng';

export const GALAXY_MORPH_IDS = ['SPIRAL', 'ELLIPTICAL', 'IRREGULAR'] as const;
export type GalaxyMorphId = (typeof GALAXY_MORPH_IDS)[number];

export const GALAXY_MORPH_LABELS_RU: Record<GalaxyMorphId, string> = {
  SPIRAL: 'Спиральная',
  ELLIPTICAL: 'Эллиптическая',
  IRREGULAR: 'Неправильная',
};

const CAT = ['NGC', 'M', 'IC', 'UGC', 'PGC', 'ESO', 'HIP'] as const;

export interface GalaxyNode {
  id: string;
  name: string;
  morph: GalaxyMorphId;
  x: number;
  y: number;
  z: number;
  size: number;
  hue: number;
}

export function generateGalaxyNode(parentSeed: string, index: number): GalaxyNode {
  const rng = createActionRng(parentSeed, 'galaxy', index);
  const cat = rngPick(rng, CAT);
  const num = rngInt(rng, 1, 9999);
  return {
    id: `${parentSeed}:g${index}`,
    name: `${cat}-${num}`,
    morph: rngPick(rng, GALAXY_MORPH_IDS),
    x: (rng() - 0.5) * 2,
    y: (rng() - 0.5) * 2,
    z: (rng() - 0.5) * 0.6,
    size: 0.3 + rng() * 1.2,
    hue: Math.floor(rng() * 360),
  };
}

export function generateSystemName(seed: string, index: number): string {
  const rng = createActionRng(seed, 'sysname', index);
  const greek = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ'];
  return `${rngPick(rng, greek)}-${rngInt(rng, 1000, 9999)}`;
}
