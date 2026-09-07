/**
 * Stage 13 — light narrative world events (meteor, foreign scan).
 * Deterministic from civ seed + day bucket. Minimal balance impact.
 * No DB schema: cooldown via journal presence for the day key in payload.
 */

import { createActionRng, hashString } from './rng';

export const NARRATIVE_EVENT_TYPES = ['meteor', 'foreign_scan', 'solar_whisper'] as const;
export type NarrativeEventKind = (typeof NARRATIVE_EVENT_TYPES)[number];

export interface NarrativeEventDef {
  kind: NarrativeEventKind;
  type: string; // journal type
  titleRu: string;
  bodyRu: string;
  icon: string;
  /** HE loss (floor, non-negative). */
  heLoss: number;
  /** Additive signalExposure bump (can be 0). */
  exposureDelta: number;
  /** Rough weight among candidates. */
  weight: number;
}

export const NARRATIVE_EVENTS: NarrativeEventDef[] = [
  {
    kind: 'meteor',
    type: 'meteor',
    titleRu: '☄️ В вас врезался метеорит',
    bodyRu:
      'Небольшой камень пробил верхние слои щита. Потеряны крупицы высоких энергий. Урон терпимый — мир напомнил, что космос не пуст.',
    icon: '☄️',
    heLoss: 8,
    exposureDelta: 0,
    weight: 40,
  },
  {
    kind: 'foreign_scan',
    type: 'foreign_scan',
    titleRu: '📡 Вас засканировала более развитая цивилизация',
    bodyRu:
      'Чужой импульс прошёл по вашим орбитам. Кто-то уже знает, что вы здесь. Заметность чуть выросла — в Тёмном Лесу тишина ценнее золота.',
    icon: '📡',
    heLoss: 0,
    exposureDelta: 0.04,
    weight: 35,
  },
  {
    kind: 'solar_whisper',
    type: 'discovery',
    titleRu: '✨ Солнечный шёпот',
    bodyRu:
      'Сенсоры поймали странную гармонику звезды. Ничего опасного — но журнал запомнил: вселенная иногда отвечает.',
    icon: '✨',
    heLoss: 0,
    exposureDelta: 0,
    weight: 25,
  },
];

/** UTC day key YYYY-MM-DD for stable once-per-day rolls. */
export function narrativeDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Decide whether a narrative event fires on this catch-up.
 * At most one candidate; probability scales with elapsed hours (capped).
 * Caller must still enforce "not already fired today" via journal payload.
 */
export function rollNarrativeEvent(input: {
  civSeed: string;
  dayKey: string;
  /** Hours since last tick (capped). */
  elapsedHours: number;
  signalExposure: number;
  civLevel: number;
}): NarrativeEventDef | null {
  const { civSeed, dayKey, elapsedHours, signalExposure, civLevel } = input;
  if (elapsedHours < 0.15) return null; // ignore sub-10min noise

  const rng = createActionRng(civSeed, `narrative:${dayKey}`, hashString(dayKey) % 1_000_000);
  // Base chance ~12% per long session hour, soft cap 35%
  const chance = Math.min(0.35, 0.08 + elapsedHours * 0.04 + Math.min(0.08, signalExposure * 0.02));
  if (rng() > chance) return null;

  const weights = NARRATIVE_EVENTS.map((e) => {
    let w = e.weight;
    if (e.kind === 'foreign_scan') w += Math.floor(signalExposure * 8) + Math.min(20, civLevel);
    if (e.kind === 'meteor' && civLevel < 3) w += 10;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < NARRATIVE_EVENTS.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return NARRATIVE_EVENTS[i]!;
  }
  return NARRATIVE_EVENTS[NARRATIVE_EVENTS.length - 1]!;
}

export function narrativePayload(kind: NarrativeEventKind, dayKey: string) {
  return { narrative: true, kind, dayKey, stage: 13 };
}
