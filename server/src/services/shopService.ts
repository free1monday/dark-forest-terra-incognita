import {
  SHOP_BY_KEY,
  SHOP_CATALOG,
  isAllowedShopResource,
  resourceCapacities,
  shopBonusesFromResourceState,
  type GameState,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { buildingsToState } from './stateService.js';
import { getUserCivilizationState, invalidateStateCache } from './gameService.js';
import { computeAndStoreProsperity } from './prosperityService.js';
import { publicUser } from './authService.js';

export function listShopItems() {
  return SHOP_CATALOG.map((i) => ({
    key: i.key,
    name: i.nameRu,
    description: i.descriptionRu,
    category: i.category,
    costCredits: i.costCredits,
    resourceType: i.resourceType,
    amount: i.amount,
    capacityBonusPercent: i.capacityBonusPercent,
    capacityAll: i.capacityAll ?? false,
    premiumTier: i.premiumTier ?? 'standard',
  }));
}

export async function purchaseShopItem(
  userId: string,
  itemKey: string
): Promise<{ state: GameState;
  user: ReturnType<typeof publicUser>;
  report: { type: string; message: string; title?: string; warning?: string };
}> {
  invalidateStateCache();
  const def = SHOP_BY_KEY[itemKey];
  if (!def) throw new AppError('SHOP_ITEM_NOT_FOUND', 'Товар не найден', 404);

  if (def.resourceType && !isAllowedShopResource(def.resourceType)) {
    throw new AppError(
      'FORBIDDEN_ITEM',
      'Этот ресурс нельзя купить за кредиты (только ВЭ и фермионы)',
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('USER_NOT_FOUND', 'Пользователь не найден', 404);
    if (user.premiumCredits < def.costCredits) {
      throw new AppError(
        'INSUFFICIENT_CREDITS',
        `Недостаточно эфирных кредитов (нужно ${def.costCredits}, есть ${user.premiumCredits})`,
        400
      );
    }

    const civ = await tx.civilization.findUnique({
      where: { userId },
      include: {
        resources: true,
        buildings: true,
        artifacts: true,
        contactsObserved: { select: { isDestroyed: true, status: true } },
      },
    });
    if (!civ || !civ.resources) {
      throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    }
    if (civ.isDestroyed) {
      throw new AppError('CIV_DESTROYED', 'Цивилизация уничтожена', 400);
    }

    let warning: string | undefined;
    const buildings = buildingsToState(civ.buildings);
    let bonusHe = civ.resources.capacityBonusHe ?? 0;
    let bonusFm = civ.resources.capacityBonusFermions ?? 0;
    let bonusAll = civ.resources.capacityBonusAll ?? 0;

    if (def.category === 'capacity') {
      if (def.capacityAll) {
        bonusAll += Math.floor(def.capacityBonusPercent ?? 5);
      } else if (def.resourceType === 'highEnergy') {
        bonusHe += Math.floor(def.capacityBonusPercent ?? 10);
      } else if (def.resourceType === 'fermions') {
        bonusFm += Math.floor(def.capacityBonusPercent ?? 10);
      }
    }

    const caps = resourceCapacities(buildings, civ.level, {
      hePercent: bonusHe,
      fermionsPercent: bonusFm,
      allPercent: bonusAll,
    });

    let nextHe = civ.resources.highEnergy;
    let nextFm = civ.resources.fermions;

    if (def.category === 'resource' && def.resourceType && def.amount) {
      if (def.resourceType === 'highEnergy') {
        const room = Math.max(0, caps.highEnergy - civ.resources.highEnergy);
        if (room <= 0) {
          throw new AppError(
            'CAPACITY_FULL',
            'Хранилище высоких энергий заполнено. Купите расширение ёмкости.',
            400
          );
        }
        const grant = Math.min(def.amount, room);
        nextHe = civ.resources.highEnergy + grant;
        if (grant < def.amount) {
          warning = `Ёмкость ограничена: начислено ${grant} из ${def.amount} ВЭ.`;
        }
      } else if (def.resourceType === 'fermions') {
        const room = Math.max(0, caps.fermions - civ.resources.fermions);
        if (room <= 0) {
          throw new AppError(
            'CAPACITY_FULL',
            'Хранилище фермионов заполнено. Купите расширение ёмкости.',
            400
          );
        }
        const grant = Math.min(def.amount, room);
        nextFm = civ.resources.fermions + grant;
        if (grant < def.amount) {
          warning = `Ёмкость ограничена: начислено ${grant} из ${def.amount} фермионов.`;
        }
      }
    }

    await tx.user.update({
      where: { id: userId },
      data: { premiumCredits: user.premiumCredits - def.costCredits },
    });

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: nextHe,
        fermions: nextFm,
        capacityBonusHe: bonusHe,
        capacityBonusFermions: bonusFm,
        capacityBonusAll: bonusAll,
        highEnergyCapacity: caps.highEnergy,
        antimatterCapacity: caps.antimatter,
        darkEnergyCapacity: caps.darkEnergy,
        darkMatterCapacity: caps.darkMatter,
        fermionsCapacity: caps.fermions,
      },
    });

    await tx.purchase.create({
      data: {
        userId,
        itemType: def.key,
        amount: def.amount ?? Math.floor(def.capacityBonusPercent ?? 0),
        amountSpent: def.costCredits,
        mock: true,
      },
    });

    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'shop',
        title: `Покупка: ${def.nameRu}`,
        message:
          `Списано ${def.costCredits} эфирных кредитов.` +
          (warning ? ` ${warning}` : '') +
          (def.category === 'capacity'
            ? ` Ёмкости обновлены (HE+${bonusHe}% FM+${bonusFm}% ALL+${bonusAll}%).`
            : ''),
      },
    });

    const refreshed = await tx.civilization.findUnique({
      where: { id: civ.id },
      include: {
        resources: true,
        buildings: true,
        artifacts: true,
        contactsObserved: { select: { isDestroyed: true, status: true } },
      },
    });
    if (refreshed) {
      await computeAndStoreProsperity(tx, refreshed);
    }

    const updatedUser = await tx.user.findUnique({ where: { id: userId } });
    return { warning, updatedUser: updatedUser! };
  });

  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return {
    state,
    user: publicUser(result.updatedUser),
    report: {
      type: 'shop_purchase',
      title: 'Покупка совершена',
      message: `«${def.nameRu}» — ${def.costCredits} кр.` + (result.warning ? ` ${result.warning}` : ''),
      warning: result.warning,
    },
  };
}

export async function debugAddCredits(userId: string, amount: number) {
  invalidateStateCache();

  const n = Math.max(0, Math.min(1_000_000, Math.floor(amount)));
  const user = await prisma.user.update({
    where: { id: userId },
    data: { premiumCredits: { increment: n } },
  });
  const state = await getUserCivilizationState(userId);
  return { user: publicUser(user), state };
}

/** Re-export for caps helper consumers */
void shopBonusesFromResourceState;
