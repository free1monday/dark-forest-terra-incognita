/**
 * Stage 11 — strategic weapons catalog.
 */

export const WEAPON_TYPE_IDS = [
  'POSITRON_CANNON',
  'TRANQLUCATOR',
  'RELATIVISTIC_DROP',
] as const;

export type WeaponTypeId = (typeof WEAPON_TYPE_IDS)[number];

export type WeaponKind = 'consumable_attack' | 'permanent_defense' | 'strategic_strike';

export interface WeaponDef {
  type: WeaponTypeId;
  kind: WeaponKind;
  nameRu: string;
  descriptionRu: string;
  /** Build costs (integers). */
  cost: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
  };
  /** Build duration seconds. */
  buildDurationSec: number;
  /** Min civ level to unlock build. */
  minCivLevel: number;
  /** One-shot after ready. */
  consumable: boolean;
  /** Requires contact target on use. */
  requiresContact: boolean;
  effectSummaryRu: string;
}

/** 12h, 3d, 7d */
export const WEAPON_CATALOG: Record<WeaponTypeId, WeaponDef> = {
  POSITRON_CANNON: {
    type: 'POSITRON_CANNON',
    kind: 'consumable_attack',
    nameRu: 'Позитронная пушка',
    descriptionRu:
      'Однозарядный ускоритель позитронов. Наносит огромный урон отдельным объектам цели и оставляет радиационный шлейф.',
    cost: {
      highEnergy: 500_000,
      antimatter: 0,
      darkEnergy: 0,
      darkMatter: 0,
      fermions: 0,
    },
    buildDurationSec: 12 * 3600,
    minCivLevel: 25,
    consumable: true,
    requiresContact: true,
    effectSummaryRu: 'Большой урон в бою · радиация у цели (habitability↓)',
  },
  TRANQLUCATOR: {
    type: 'TRANQLUCATOR',
    kind: 'permanent_defense',
    nameRu: 'Транклюкатор',
    descriptionRu:
      'Стационарная оборонительная установка родной системы. Автоматически прожигает атакующие флоты мощным излучением.',
    cost: {
      highEnergy: 5_000_000,
      antimatter: 0,
      darkEnergy: 0,
      darkMatter: 0,
      fermions: 0,
    },
    buildDurationSec: 3 * 24 * 3600,
    minCivLevel: 40,
    consumable: false,
    requiresContact: false,
    effectSummaryRu: '+защита · авто-ПВО в обороне родной системы',
  },
  RELATIVISTIC_DROP: {
    type: 'RELATIVISTIC_DROP',
    kind: 'strategic_strike',
    nameRu: 'Релятивистская капля',
    descriptionRu:
      'Одноразовая стратегическая боеголовка. Полностью уничтожает солнечную систему цели. Провоцирует удар Тёмного леса.',
    cost: {
      highEnergy: 5_000_000_000,
      antimatter: 4_000_000,
      darkEnergy: 5_000,
      darkMatter: 5_000,
      fermions: 0,
    },
    buildDurationSec: 7 * 24 * 3600,
    minCivLevel: 70,
    consumable: true,
    requiresContact: true,
    effectSummaryRu: 'Уничтожение системы цели · signalExposure↑ · метка агрессора',
  },
};

export const WEAPON_ORDER: WeaponTypeId[] = [
  'POSITRON_CANNON',
  'TRANQLUCATOR',
  'RELATIVISTIC_DROP',
];

/** Defense power bonus per ready Tranqlucator. */
export const TRANQLUCATOR_DEFENSE_BONUS = 85;

/** Positron cannon flat damage dealt on successful hit. */
export const POSITRON_CANNON_DAMAGE = 420;

/** Exposure spike after relativistic drop. */
export const DROP_EXPOSURE_SPIKE = 25;

export function isWeaponTypeId(v: unknown): v is WeaponTypeId {
  return typeof v === 'string' && (WEAPON_TYPE_IDS as readonly string[]).includes(v);
}

export function weaponBuildAffordable(
  def: WeaponDef,
  resources: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
  }
): boolean {
  return (
    resources.highEnergy >= def.cost.highEnergy &&
    resources.antimatter >= def.cost.antimatter &&
    resources.darkEnergy >= def.cost.darkEnergy &&
    resources.darkMatter >= def.cost.darkMatter &&
    resources.fermions >= def.cost.fermions
  );
}
