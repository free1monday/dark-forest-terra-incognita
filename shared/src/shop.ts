/** Stage 7 — monetization. Only HE and Fermions are sellable resources. */

export type ShopCategory = 'resource' | 'capacity';

export type ShopResourceType = 'highEnergy' | 'fermions';

export interface ShopItemDef {
  key: string;
  nameRu: string;
  descriptionRu: string;
  category: ShopCategory;
  /** Resource packs only — HE or fermions. */
  resourceType?: ShopResourceType;
  amount?: number;
  /** Capacity items: percent bonus applied to base max. */
  capacityBonusPercent?: number;
  /** capacity_all applies this % to every resource capacity. */
  capacityAll?: boolean;
  costCredits: number;
  /** Gold-tier styling hint for large packs. */
  premiumTier?: 'standard' | 'gold';
}

/**
 * Hard rule: NEVER add antimatter / darkEnergy / darkMatter packs here.
 */
export const SHOP_CATALOG: ShopItemDef[] = [
  {
    key: 'he_small',
    nameRu: 'Пакет высоких энергий · Малый',
    descriptionRu: '1 000 единиц высоких энергий. Начисляется в пределах ёмкости хранилища.',
    category: 'resource',
    resourceType: 'highEnergy',
    amount: 1000,
    costCredits: 10,
  },
  {
    key: 'he_medium',
    nameRu: 'Пакет высоких энергий · Средний',
    descriptionRu: '5 000 ВЭ. Оптимально для ускорения построек и экспедиций.',
    category: 'resource',
    resourceType: 'highEnergy',
    amount: 5000,
    costCredits: 45,
  },
  {
    key: 'he_large',
    nameRu: 'Пакет высоких энергий · Большой',
    descriptionRu: '20 000 ВЭ. Стратегический запас для рывка уровня.',
    category: 'resource',
    resourceType: 'highEnergy',
    amount: 20000,
    costCredits: 150,
    premiumTier: 'gold',
  },
  {
    key: 'fermion_small',
    nameRu: 'Пакет фермионов · Малый',
    descriptionRu: '500 фермионов. Барионная сборка и эвакуационные протоколы.',
    category: 'resource',
    resourceType: 'fermions',
    amount: 500,
    costCredits: 15,
  },
  {
    key: 'fermion_medium',
    nameRu: 'Пакет фермионов · Средний',
    descriptionRu: '2 500 фермионов.',
    category: 'resource',
    resourceType: 'fermions',
    amount: 2500,
    costCredits: 60,
  },
  {
    key: 'fermion_large',
    nameRu: 'Пакет фермионов · Большой',
    descriptionRu: '10 000 фермионов. Поздняя игра и перенос столицы.',
    category: 'resource',
    resourceType: 'fermions',
    amount: 10000,
    costCredits: 200,
    premiumTier: 'gold',
  },
  {
    key: 'capacity_he',
    nameRu: 'Расширение хранилища ВЭ',
    descriptionRu: '+10% к максимальной ёмкости высоких энергий (постоянно).',
    category: 'capacity',
    capacityBonusPercent: 10,
    resourceType: 'highEnergy',
    costCredits: 50,
  },
  {
    key: 'capacity_fermion',
    nameRu: 'Расширение хранилища фермионов',
    descriptionRu: '+10% к максимальной ёмкости фермионов (постоянно).',
    category: 'capacity',
    capacityBonusPercent: 10,
    resourceType: 'fermions',
    costCredits: 50,
  },
  {
    key: 'capacity_all',
    nameRu: 'Универсальный резонатор ёмкости',
    descriptionRu: '+5% ко всем ёмкостям ресурсов (постоянно).',
    category: 'capacity',
    capacityBonusPercent: 5,
    capacityAll: true,
    costCredits: 100,
    premiumTier: 'gold',
  },
];

export const SHOP_BY_KEY: Record<string, ShopItemDef> = Object.fromEntries(
  SHOP_CATALOG.map((i) => [i.key, i])
);

/** Forbidden resource types for monetization (asserted at purchase). */
export const FORBIDDEN_SHOP_RESOURCES = [
  'antimatter',
  'darkEnergy',
  'darkMatter',
] as const;

export function isAllowedShopResource(t: string | undefined): boolean {
  if (!t) return true;
  return t === 'highEnergy' || t === 'fermions';
}

export function shopCategoryLabelRu(c: string): string {
  if (c === 'resource') return 'Ресурсы';
  if (c === 'capacity') return 'Ёмкость';
  return c;
}
