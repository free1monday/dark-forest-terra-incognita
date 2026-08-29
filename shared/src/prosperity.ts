import type { BuildingState } from './types';
import type { ArtifactRarity } from './artifacts';
import { createActionRng, rngInt } from './rng';

export interface ProsperityInput {
  level: number;
  buildings: BuildingState[];
  resources: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
  };
  artifactRarities: Array<ArtifactRarity | string>;
  /** Detected contacts (non-destroyed). */
  contactsDetected: number;
  /** Destroyed contacts (worth more). */
  contactsDestroyed: number;
  /** Combat: light/moderate/heavy hits. */
  combatDamageWins: number;
  /** Combat: full destructions of targets. */
  combatDestroyWins: number;
  /** Legacy fallback weight. */
  successfulExpeditions?: number;
  totalHighEnergyMined?: number;
  isDestroyed?: boolean;
}

const ARTIFACT_WEIGHT: Record<string, number> = {
  common: 1,
  rare: 5,
  legendary: 20,
  mythic: 100,
};

/**
 * Stage 7 prosperity score — single ranking metric.
 * score = level*100 + buildings*10 + stockpile*0.1 + artifacts*50 + contacts*20 + combat*30
 */
export function calculateProsperityScore(input: ProsperityInput): number {
  if (input.isDestroyed) {
    return Math.floor(calculateProsperityScore({ ...input, isDestroyed: false }) * 0.15);
  }

  const totalBuildingLevels = input.buildings.reduce((s, b) => s + b.level, 0);

  const stockpile =
    input.resources.highEnergy * 1 +
    input.resources.antimatter * 10 +
    input.resources.darkEnergy * 20 +
    input.resources.darkMatter * 20 +
    input.resources.fermions * 5;

  const artifactScore = input.artifactRarities.reduce(
    (s, r) => s + (ARTIFACT_WEIGHT[String(r)] ?? 1),
    0
  );

  const contactScore = input.contactsDetected * 1 + input.contactsDestroyed * 5;
  const combatScore = input.combatDamageWins * 2 + input.combatDestroyWins * 10;

  const expeditionBonus = (input.successfulExpeditions ?? 0) * 5;
  const minedBonus = Math.floor(Math.log10(1 + (input.totalHighEnergyMined ?? 0))) * 25;

  const raw =
    input.level * 100 +
    totalBuildingLevels * 10 +
    stockpile * 0.1 +
    artifactScore * 50 +
    contactScore * 20 +
    combatScore * 30 +
    expeditionBonus +
    minedBonus;

  return Math.max(0, Math.floor(raw));
}

/** Deterministic ghost/bot entry for leaderboard filler. */
export function generateLeaderboardBot(seed: string, index: number): {
  id: string;
  name: string;
  level: number;
  prosperityScore: number;
  isDestroyed: boolean;
  isBot: true;
} {
  const rng = createActionRng(seed, `lb_bot:${index}`, index);
  const prefixes = [
    'Орден',
    'Конклав',
    'Архив',
    'Синдикат',
    'Империя',
    'Коллектив',
    'Сфера',
    'Легион',
  ];
  const suffixes = [
    'Горизонта',
    'Сингулярности',
    'Пустоты',
    'Реликта',
    'Эха',
    'Квазара',
    'Нейтрино',
    'Теней',
  ];
  const name = `${prefixes[rngInt(rng, 0, prefixes.length - 1)]} ${suffixes[rngInt(rng, 0, suffixes.length - 1)]}`;
  const level = rngInt(rng, 3, 55);
  const buildingsApprox = rngInt(rng, 2, 40);
  const stock = rngInt(rng, 200, 80000);
  const arts = rngInt(rng, 0, 12);
  const contacts = rngInt(rng, 0, 25);
  const destroys = rngInt(rng, 0, 8);
  const dmgWins = rngInt(rng, 0, 20);
  const destroyed = rng() < 0.08;

  const score = calculateProsperityScore({
    level,
    buildings: [{ buildingType: 'high_energy_collider', level: buildingsApprox }],
    resources: {
      highEnergy: stock,
      antimatter: Math.floor(stock / 40),
      darkEnergy: Math.floor(stock / 80),
      darkMatter: Math.floor(stock / 80),
      fermions: Math.floor(stock / 30),
    },
    artifactRarities: Array.from({ length: arts }, (_, i) =>
      i % 7 === 0 ? 'legendary' : i % 3 === 0 ? 'rare' : 'common'
    ),
    contactsDetected: contacts,
    contactsDestroyed: destroys,
    combatDamageWins: dmgWins,
    combatDestroyWins: destroys,
    isDestroyed: destroyed,
  });

  return {
    id: `bot_${index}_${seed.slice(0, 6)}`,
    name,
    level,
    prosperityScore: score,
    isDestroyed: destroyed,
    isBot: true,
  };
}

export const LEADERBOARD_BOT_COUNT = 40;
export const LEADERBOARD_TOP = 50;
