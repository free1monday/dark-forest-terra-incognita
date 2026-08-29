import { createActionRng, rngInt, rngPick } from './rng';
import type { ExpeditionTypeId } from './expeditions';
import {
  FALSE_POSITIVE_CHANCE,
  MAX_DETECTION_CHANCE,
  REAL_PLAYER_TARGET_CHANCE,
  SIGNAL_ACCURACY_BASE,
  SIGNAL_DETECTION_BASE_CHANCE,
  SIGNAL_DISTANCE_RANGES,
} from './balance';

export type ContactStatus =
  | 'detected'
  | 'monitored'
  | 'contacted'
  | 'hostile'
  | 'allied'
  | 'destroyed';

export type SignalType = 'radio' | 'neutrino' | 'gravitational' | 'quantum';

export interface ContactBotData {
  name: string;
  level: number;
  galaxyName: string;
  sectorName: string;
  systemName: string;
  coordinates: { x: number; y: number; z: number };
  aggression: number;
  secrecy: number;
  diplomacyFocus: number;
  scienceFocus: number;
}

export interface GeneratedContactParams {
  distance: number;
  distanceAccuracy: number;
  distanceNoise: number;
  levelMin: number;
  levelMax: number;
  levelAccuracy: number;
  confidence: number;
  signalType: SignalType;
  coordinatesX: number;
  coordinatesY: number;
  coordinatesZ: number;
  coordinatesAccuracy: number;
  galaxyName: string | null;
  sectorName: string | null;
  systemName: string | null;
  isFalsePositive: boolean;
  preferRealPlayer: boolean;
  bot: ContactBotData;
  reportTitle: string;
  reportBody: string;
}

const SIGNAL_TYPES: SignalType[] = ['radio', 'neutrino', 'gravitational', 'quantum'];

const SIGNAL_TYPE_RU: Record<SignalType, string> = {
  radio: 'радио',
  neutrino: 'нейтринный',
  gravitational: 'гравитационный',
  quantum: 'квантовый',
};

const GALAXY_POOL = [
  'NGC Тень',
  'Messier Обсидиан',
  'UGC Нуль-дуга',
  'PGC Эхо',
  'Сектор Лямбда',
  'IC Ферми-край',
  'Каталог Омега',
];

const SECTOR_POOL = [
  'Θ-7741',
  'Σ-0093',
  'Ω-1192',
  'α-440',
  'β-Тень',
  'γ-Разлом',
  'λ-Горизонт',
  'μ-Сигнал',
];

const BOT_PREFIX = [
  'Конклав',
  'Империя',
  'Содружество',
  'Улей',
  'Орден',
  'Синдикат',
  'Архив',
  'Рой',
];

const BOT_SUFFIX = [
  'Тишины',
  'Горизонта',
  'Пустоты',
  'Нейтрино',
  'Сингулярности',
  'Эха',
  'Барьера',
  'Кванта',
];

/**
 * Base chance (0–1) to detect a civilization signal for expedition type.
 * localScan has no detection (returns 0).
 */
export function calculateSignalDetectionChance(
  expeditionType: ExpeditionTypeId,
  effectiveRadar: number,
  civLevel: number,
  signalExposureModifier = 1
): number {
  const basePct = SIGNAL_DETECTION_BASE_CHANCE[expeditionType] ?? 0;
  if (basePct <= 0) return 0;
  const base = basePct / 100;
  const chance =
    base *
    (1 + effectiveRadar * 0.02) *
    (1 + civLevel * 0.005) *
    Math.max(0.1, signalExposureModifier);
  return Math.min(MAX_DETECTION_CHANCE, chance);
}

export function calculateSignalAccuracy(
  expeditionType: ExpeditionTypeId,
  effectiveRadar: number
): number {
  const base = SIGNAL_ACCURACY_BASE[expeditionType] ?? 0.4;
  return Math.min(0.95, base * (1 + effectiveRadar * 0.01));
}

/**
 * Civilization "glow" for being detected by others (Stage 4 foundation).
 * Higher = easier to find.
 */
export function calculateSignalExposure(params: {
  civLevel: number;
  totalProductionPerSec: number;
  expeditionCount: number;
  darkSensorLevel: number;
  /** Stage 8 QUANTUM_MASKING etc. */
  physicsExposureMul?: number;
}): number {
  const {
    civLevel,
    totalProductionPerSec,
    expeditionCount,
    darkSensorLevel,
    physicsExposureMul = 1,
  } = params;
  const v =
    (1.0 +
      civLevel * 0.01 +
      totalProductionPerSec * 0.0001 +
      expeditionCount * 0.001 +
      darkSensorLevel * 0.02) *
    Math.max(0.2, physicsExposureMul);
  return Math.round(v * 1000) / 1000;
}

export function generateContactParameters(params: {
  seed: string;
  nonce: number;
  expeditionType: ExpeditionTypeId;
  observerLevel: number;
  observerCoords: { x: number; y: number; z: number };
  effectiveRadar: number;
  expeditionId: string;
}): GeneratedContactParams {
  const {
    seed,
    nonce,
    expeditionType,
    observerLevel,
    observerCoords,
    effectiveRadar,
    expeditionId,
  } = params;

  const rng = createActionRng(seed, `contact:${expeditionType}:${expeditionId}`, nonce);
  const accuracy = calculateSignalAccuracy(expeditionType, effectiveRadar);
  const range = SIGNAL_DISTANCE_RANGES[expeditionType] ?? { min: 500, max: 5000 };
  const trueDistance = rngInt(rng, range.min, range.max);

  const distanceNoiseFactor = (1 - accuracy) * 0.5;
  const distanceNoise = trueDistance * distanceNoiseFactor * (rng() * 2 - 1);
  const reportedDistance = Math.max(50, Math.floor(trueDistance + distanceNoise));

  // True level of target (bot or approx)
  const levelBias = Math.max(5, Math.min(80, Math.floor(observerLevel * (0.6 + rng() * 0.8))));
  const trueLevel = rngInt(rng, Math.max(5, levelBias - 15), Math.min(80, levelBias + 20));
  const levelRangeHalf = Math.max(2, Math.floor(8 * (1 - accuracy) + 2));
  const levelNoise = Math.floor(levelRangeHalf * (1 - accuracy) * 0.3 * (rng() * 2 - 1));
  let levelMin = Math.max(1, trueLevel - levelRangeHalf + levelNoise);
  let levelMax = Math.min(100, trueLevel + levelRangeHalf + levelNoise);
  if (levelMin > levelMax) [levelMin, levelMax] = [levelMax, levelMin];

  const confidence = Math.min(
    0.95,
    Math.max(0.3, accuracy * (0.85 + rng() * 0.25) + effectiveRadar * 0.001)
  );

  const signalType = rngPick(rng, SIGNAL_TYPES);
  const coordNoiseRadius = trueDistance * (1 - accuracy) * 0.1;
  const noise = () => (rng() * 2 - 1) * coordNoiseRadius;
  const coordinatesX = observerCoords.x + (rng() * 2 - 1) * trueDistance * 0.02 + noise();
  const coordinatesY = observerCoords.y + (rng() * 2 - 1) * trueDistance * 0.02 + noise();
  const coordinatesZ = observerCoords.z + (rng() * 2 - 1) * trueDistance * 0.005 + noise() * 0.3;

  const knownGalaxy = rng() < accuracy;
  const knownSector = rng() < accuracy * 0.8;
  const galaxyName = knownGalaxy ? rngPick(rng, GALAXY_POOL) : null;
  const sectorName = knownSector ? rngPick(rng, SECTOR_POOL) : null;
  const systemName = rng() < accuracy * 0.4 ? `${rngPick(rng, ['Кеплер', 'TOI', 'HR'])}-${rngInt(rng, 100, 9999)}` : null;

  const isFalsePositive = rng() < FALSE_POSITIVE_CHANCE;
  const preferRealPlayer = !isFalsePositive && rng() < REAL_PLAYER_TARGET_CHANCE;

  const bot: ContactBotData = {
    name: `${rngPick(rng, BOT_PREFIX)} ${rngPick(rng, BOT_SUFFIX)}`,
    level: trueLevel,
    galaxyName: galaxyName ?? rngPick(rng, GALAXY_POOL),
    sectorName: sectorName ?? rngPick(rng, SECTOR_POOL),
    systemName: systemName ?? `SYS-${rngInt(rng, 1000, 9999)}`,
    coordinates: {
      x: Math.floor(coordinatesX),
      y: Math.floor(coordinatesY),
      z: Math.floor(coordinatesZ),
    },
    aggression: rngInt(rng, 0, 100),
    secrecy: rngInt(rng, 0, 100),
    diplomacyFocus: rngInt(rng, 0, 100),
    scienceFocus: rngInt(rng, 0, 100),
  };

  const distErr = Math.max(40, Math.floor(Math.abs(distanceNoise) + trueDistance * (1 - accuracy) * 0.15));
  const confPct = Math.round(confidence * 100);
  const sectorLabel = sectorName ?? 'неизвестен (Терра Инкогнита)';

  const reportTitle = 'КОНФИДЕНЦИАЛЬНО: организованный сигнал';
  const reportBody =
    `Нейтринный/гравитационный детектор зафиксировал организованный сигнал.\n` +
    `Расстояние: ~${reportedDistance} ± ${distErr} световых лет.\n` +
    `Уровень развития: приблизительно ${levelMin}–${levelMax}.\n` +
    `Тип сигнала: ${SIGNAL_TYPE_RU[signalType]}.\n` +
    `Достоверность: ${confPct}%.\n` +
    `Координаты: сектор ${sectorLabel} (приблизительно).\n` +
    `Рекомендуется повышение уровня сенсоров для уточнения данных.`;

  return {
    distance: reportedDistance,
    distanceAccuracy: accuracy,
    distanceNoise: distErr,
    levelMin,
    levelMax,
    levelAccuracy: accuracy,
    confidence,
    signalType,
    coordinatesX,
    coordinatesY,
    coordinatesZ,
    coordinatesAccuracy: accuracy,
    galaxyName,
    sectorName,
    systemName,
    isFalsePositive,
    preferRealPlayer,
    bot,
    reportTitle,
    reportBody,
  };
}

export function signalTypeLabelRu(t: string): string {
  return SIGNAL_TYPE_RU[t as SignalType] ?? t;
}

export function contactStatusLabelRu(s: string): string {
  const map: Record<string, string> = {
    detected: 'Обнаружена',
    monitored: 'Под наблюдением',
    contacted: 'Контакт',
    hostile: 'Враждебна',
    allied: 'Союзник',
    destroyed: 'Уничтожена',
  };
  return map[s] ?? s;
}
