/** Stage 8 — local physics laws (level 90+). */

export type PhysicsLawId =
  | 'LOCAL_LIGHT_SPEED'
  | 'ENTROPY_REDUCTION'
  | 'GRAVITY_CONTROL'
  | 'VACUUM_STABILITY'
  | 'QUANTUM_MASKING'
  | 'CAUSALITY_LOOP';

export interface PhysicsLawDef {
  id: PhysicsLawId;
  nameRu: string;
  descriptionRu: string;
  /** Cost to enact. */
  cost: {
    darkEnergy: number;
    darkMatter: number;
    antimatter: number;
  };
}

/** MVP costs scaled for playability (fantasy: 100k DE etc.). */
export const PHYSICS_LAWS: PhysicsLawDef[] = [
  {
    id: 'LOCAL_LIGHT_SPEED',
    nameRu: 'Локальная скорость света',
    descriptionRu: '−20% к длительности экспедиций и дипломатических/боевых задержек SoL.',
    cost: { darkEnergy: 2500, darkMatter: 800, antimatter: 400 },
  },
  {
    id: 'ENTROPY_REDUCTION',
    nameRu: 'Снижение энтропии',
    descriptionRu: '+15% к производству всех ресурсов (включая сифон ТЭ).',
    cost: { darkEnergy: 3000, darkMatter: 1000, antimatter: 500 },
  },
  {
    id: 'GRAVITY_CONTROL',
    nameRu: 'Контроль гравитации',
    descriptionRu: '+25% к пассивному выходу от аномалий (ЧД, линзы и др.).',
    cost: { darkEnergy: 2800, darkMatter: 1200, antimatter: 450 },
  },
  {
    id: 'VACUUM_STABILITY',
    nameRu: 'Стабильность вакуума',
    descriptionRu: '−50% к весу негативных исходов экспедиций (ловушки/пустота).',
    cost: { darkEnergy: 2200, darkMatter: 900, antimatter: 350 },
  },
  {
    id: 'QUANTUM_MASKING',
    nameRu: 'Квантовая маскировка',
    descriptionRu: '−30% к signalExposure (сложнее обнаружить вашу цивилизацию).',
    cost: { darkEnergy: 2600, darkMatter: 1500, antimatter: 600 },
  },
  {
    id: 'CAUSALITY_LOOP',
    nameRu: 'Петля причинности',
    descriptionRu: '+10% к весу критических/редких успехов экспедиций.',
    cost: { darkEnergy: 3200, darkMatter: 1100, antimatter: 700 },
  },
];

export const PHYSICS_LAWS_BY_ID: Record<string, PhysicsLawDef> = Object.fromEntries(
  PHYSICS_LAWS.map((l) => [l.id, l])
);

export interface PhysicsModifiers {
  expeditionDurationMul: number;
  diplomacyDelayMul: number;
  combatTransitMul: number;
  allProductionMul: number;
  anomalyYieldMul: number;
  trapWeightMul: number;
  criticalSuccessWeightMul: number;
  signalExposureMul: number;
  activeIds: PhysicsLawId[];
}

export function parsePhysicsLaws(raw: string | null | undefined): PhysicsLawId[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is PhysicsLawId => typeof x === 'string' && x in PHYSICS_LAWS_BY_ID);
  } catch {
    return [];
  }
}

export function calculatePhysicsModifiers(activeLaws: readonly string[]): PhysicsModifiers {
  const ids = activeLaws.filter((x): x is PhysicsLawId => x in PHYSICS_LAWS_BY_ID);
  const set = new Set(ids);
  return {
    expeditionDurationMul: set.has('LOCAL_LIGHT_SPEED') ? 0.8 : 1,
    diplomacyDelayMul: set.has('LOCAL_LIGHT_SPEED') ? 0.8 : 1,
    combatTransitMul: set.has('LOCAL_LIGHT_SPEED') ? 0.8 : 1,
    allProductionMul: set.has('ENTROPY_REDUCTION') ? 1.15 : 1,
    anomalyYieldMul: set.has('GRAVITY_CONTROL') ? 1.25 : 1,
    trapWeightMul: set.has('VACUUM_STABILITY') ? 0.5 : 1,
    criticalSuccessWeightMul: set.has('CAUSALITY_LOOP') ? 1.1 : 1,
    signalExposureMul: set.has('QUANTUM_MASKING') ? 0.7 : 1,
    activeIds: ids,
  };
}

export function physicsLawLabelRu(id: string): string {
  return PHYSICS_LAWS_BY_ID[id]?.nameRu ?? id;
}

/** Refund fraction on revoke. */
export const PHYSICS_REVOKE_REFUND = 0.1;
