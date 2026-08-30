/**
 * Stage 10 — hierarchical universe map (procedural from world seed).
 * Levels: 0 universe walls/voids → 1 superclusters → 2 galaxies → 3 systems.
 */

import { createActionRng, rngInt, rngPick } from '../rng';
import { generateGalaxyNode, type GalaxyNode } from './galaxy';
import { generateSystemName } from './galaxy';

export type MapLevel = 0 | 1 | 2 | 3;

export interface GreatWallNode {
  id: string;
  name: string;
  /** Polyline points in [-1,1] plane */
  points: Array<{ x: number; y: number }>;
}

export interface VoidNode {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
}

export interface SuperclusterNode {
  id: string;
  name: string;
  wallId: string;
  x: number;
  y: number;
  galaxies: GalaxyNode[];
}

export interface SpecialObject {
  id: string;
  kind: 'quasar' | 'black_hole';
  name: string;
  x: number;
  y: number;
  note: string;
}

export interface SystemMarker {
  id: string;
  name: string;
  x: number;
  y: number;
  isPlayer: boolean;
  hasContact?: boolean;
}

export interface UniverseMapSnapshot {
  worldSeed: string;
  level: MapLevel;
  walls: GreatWallNode[];
  voids: VoidNode[];
  superclusters: SuperclusterNode[];
  specials: SpecialObject[];
  /** Populated when drilling into a galaxy */
  systems: SystemMarker[];
  player: {
    wallHint: string;
    superclusterHint: string;
    galaxyName: string;
    systemName: string;
    coordinates: { x: number; y: number; z: number };
  };
}

const WALL_NAMES = ['Великая Стена Слоуна', 'Великая Стена Геркулеса'] as const;
const VOID_NAMES = ['Войд Волопаса', 'Войд Жнеца', 'Войд Сон Пса', 'Войд Озарения'] as const;
const SC_NAMES = [
  'Шепли',
  'Великий Аттрактор',
  'Ланиакея',
  'Дева',
  'Гидра–Центавр',
  'Печь',
  'Павлин–Индеец',
  'Волосы Вероники',
  'Персей–Рыбы',
  'Скульптор',
] as const;

function wallPolyline(rng: () => number, biasX: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({
      x: -0.9 + t * 1.8 + biasX * 0.15 + (rng() - 0.5) * 0.08,
      y: -0.7 + Math.sin(t * Math.PI * 1.4 + biasX) * 0.45 + (rng() - 0.5) * 0.1,
    });
  }
  return pts;
}

/**
 * Full map for API. Heavy but pure CPU — cache on server by civ seed.
 */
export function buildUniverseMap(opts: {
  civSeed: string;
  galaxyName: string;
  systemName: string;
  greatStructureName: string;
  coordinates: { x: number; y: number; z: number };
  contactMarkers?: Array<{ id: string; name: string; x: number; y: number; z: number }>;
  level?: MapLevel;
  focusSuperclusterId?: string;
  focusGalaxyId?: string;
}): UniverseMapSnapshot {
  const worldSeed = opts.civSeed;
  const rng = createActionRng(worldSeed, 'universe-map', 0);
  const level: MapLevel = opts.level ?? 0;

  const walls: GreatWallNode[] = WALL_NAMES.map((name, i) => ({
    id: `wall-${i}`,
    name,
    points: wallPolyline(rng, i === 0 ? -1 : 1),
  }));

  const voids: VoidNode[] = VOID_NAMES.map((name, i) => ({
    id: `void-${i}`,
    name,
    x: (rng() - 0.5) * 1.6,
    y: (rng() - 0.5) * 1.4,
    radius: 0.12 + rng() * 0.18,
  }));

  const superclusters: SuperclusterNode[] = [];
  for (const wall of walls) {
    for (let i = 0; i < 8; i++) {
      const scRng = createActionRng(worldSeed, `sc-${wall.id}`, i);
      const name =
        i < 3 && wall.id === 'wall-0'
          ? SC_NAMES[i]!
          : `${rngPick(scRng, SC_NAMES)}-${rngInt(scRng, 1, 99)}`;
      const galaxies: GalaxyNode[] = [];
      const gCount = rngInt(scRng, 5, 12);
      for (let g = 0; g < gCount; g++) {
        galaxies.push(generateGalaxyNode(`${worldSeed}:${wall.id}:sc${i}`, g));
      }
      superclusters.push({
        id: `${wall.id}-sc${i}`,
        name,
        wallId: wall.id,
        x: wall.points[Math.min(i, wall.points.length - 1)]!.x + (scRng() - 0.5) * 0.15,
        y: wall.points[Math.min(i, wall.points.length - 1)]!.y + (scRng() - 0.5) * 0.15,
        galaxies,
      });
    }
  }

  const specials: SpecialObject[] = [];
  for (let i = 0; i < 6; i++) {
    const sRng = createActionRng(worldSeed, 'special', i);
    const kind = sRng() < 0.5 ? 'quasar' : 'black_hole';
    specials.push({
      id: `sp-${i}`,
      kind,
      name: kind === 'quasar' ? `Квазар Q-${rngInt(sRng, 100, 999)}` : `ЧД BH-${rngInt(sRng, 10, 99)}`,
      x: (sRng() - 0.5) * 1.7,
      y: (sRng() - 0.5) * 1.5,
      note: 'Недоступно для колонизации · цель особых экспедиций (Тёмная энергия)',
    });
  }

  // Systems when focusing a galaxy
  const systems: SystemMarker[] = [];
  const focusG = opts.focusGalaxyId
    ? superclusters.flatMap((s) => s.galaxies).find((g) => g.id === opts.focusGalaxyId)
    : undefined;

  if (focusG || level >= 3) {
    const gSeed = focusG ? focusG.id : `${worldSeed}:home-gal`;
    const sRng = createActionRng(gSeed, 'systems', 0);
    const count = rngInt(sRng, 12, 28);
    for (let i = 0; i < count; i++) {
      const isPlayer = i === 0;
      systems.push({
        id: `${gSeed}:sys${i}`,
        name: isPlayer ? opts.systemName : generateSystemName(gSeed, i),
        x: (sRng() - 0.5) * 1.8,
        y: (sRng() - 0.5) * 1.8,
        isPlayer,
      });
    }
    for (const c of opts.contactMarkers ?? []) {
      systems.push({
        id: `contact-${c.id}`,
        name: c.name,
        x: Math.max(-1, Math.min(1, c.x / 50000)),
        y: Math.max(-1, Math.min(1, c.y / 50000)),
        isPlayer: false,
        hasContact: true,
      });
    }
  }

  return {
    worldSeed,
    level,
    walls,
    voids,
    superclusters,
    specials,
    systems,
    player: {
      wallHint: opts.greatStructureName.includes('Геркул')
        ? WALL_NAMES[1]
        : WALL_NAMES[0],
      superclusterHint: SC_NAMES[0],
      galaxyName: opts.galaxyName,
      systemName: opts.systemName,
      coordinates: opts.coordinates,
    },
  };
}
