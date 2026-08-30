import type { Prisma } from '@prisma/client';
import {
  DROP_EXPOSURE_SPIKE,
  POSITRON_CANNON_DAMAGE,
  TRANQLUCATOR_DEFENSE_BONUS,
  WEAPON_CATALOG,
  WEAPON_ORDER,
  isWeaponTypeId,
  weaponBuildAffordable,
  type WeaponTypeId,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  catchUpInTx,
  invalidateStateCache,
  loadCivForUser,
} from './gameService.js';
import { toGameState } from './stateService.js';

async function finishReadyWeapons(tx: Prisma.TransactionClient, civId: string, now: Date) {
  await tx.weapon.updateMany({
    where: {
      civilizationId: civId,
      status: 'BUILDING',
      readyAt: { lte: now },
    },
    data: { status: 'READY' },
  });
}

export function countReadyTranqlucators(weapons: Array<{ type: string; status: string }>): number {
  return weapons.filter((w) => w.type === 'TRANQLUCATOR' && w.status === 'READY').length;
}

export function tranqlucatorDefenseBonus(weapons: Array<{ type: string; status: string }>): number {
  return countReadyTranqlucators(weapons) * TRANQLUCATOR_DEFENSE_BONUS;
}

export async function listWeapons(userId: string) {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  const now = new Date();
  await prisma.$transaction((tx) => finishReadyWeapons(tx, civ.id, now));

  const rows = await prisma.weapon.findMany({
    where: { civilizationId: civ.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const catalog = WEAPON_ORDER.map((type) => {
    const def = WEAPON_CATALOG[type];
    return {
      type,
      name: def.nameRu,
      description: def.descriptionRu,
      kind: def.kind,
      cost: def.cost,
      buildDurationSec: def.buildDurationSec,
      minCivLevel: def.minCivLevel,
      consumable: def.consumable,
      requiresContact: def.requiresContact,
      effectSummary: def.effectSummaryRu,
      unlocked: civ.level >= def.minCivLevel,
      reasons:
        civ.level >= def.minCivLevel ? [] : [`Нужен уровень ${def.minCivLevel}+`],
    };
  });

  return {
    catalog,
    weapons: rows.map((w) => ({
      id: w.id,
      type: w.type,
      name: WEAPON_CATALOG[w.type as WeaponTypeId]?.nameRu ?? w.type,
      status: w.status,
      startedAt: w.startedAt.toISOString(),
      readyAt: w.readyAt.toISOString(),
      usedAt: w.usedAt?.toISOString() ?? null,
      targetContactId: w.targetContactId,
      etaSeconds:
        w.status === 'BUILDING'
          ? Math.max(0, Math.ceil((w.readyAt.getTime() - now.getTime()) / 1000))
          : 0,
    })),
    tranqlucatorBonus: tranqlucatorDefenseBonus(rows),
    serverTime: now.toISOString(),
  };
}

export async function buildWeapon(userId: string, typeRaw: string) {
  if (!isWeaponTypeId(typeRaw)) {
    throw new AppError('INVALID_WEAPON', 'Неизвестный тип оружия', 400);
  }
  const def = WEAPON_CATALOG[typeRaw];
  invalidateStateCache(userId);
  const now = new Date();

  const state = await prisma.$transaction(async (tx) => {
    const loaded = await loadCivForUser(userId);
    if (!loaded) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    let civ = await catchUpInTx(tx, loaded.id, now);
    await finishReadyWeapons(tx, civ.id, now);

    if (civ.level < def.minCivLevel) {
      throw new AppError(
        'LEVEL_LOW',
        `Оружие доступно с уровня ${def.minCivLevel}`,
        400
      );
    }
    if (!civ.resources) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
    if (!weaponBuildAffordable(def, civ.resources)) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для постройки', 400);
    }

    // Only one permanent Tranqlucator needed — allow multiple stacks as extra bonus
    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: civ.resources.highEnergy - def.cost.highEnergy,
        antimatter: civ.resources.antimatter - def.cost.antimatter,
        darkEnergy: civ.resources.darkEnergy - def.cost.darkEnergy,
        darkMatter: civ.resources.darkMatter - def.cost.darkMatter,
        fermions: civ.resources.fermions - def.cost.fermions,
      },
    });

    const readyAt = new Date(now.getTime() + def.buildDurationSec * 1000);
    await tx.weapon.create({
      data: {
        civilizationId: civ.id,
        type: def.type,
        status: 'BUILDING',
        startedAt: now,
        readyAt,
      },
    });

    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'system',
        title: 'Верфь оружия',
        message: `Начата постройка: ${def.nameRu}. Готовность через ${Math.round(def.buildDurationSec / 3600)} ч.`,
      },
    });

    civ = await catchUpInTx(tx, civ.id, now);
    return toGameState(civ, now);
  });

  return {
    state,
    report: {
      type: 'weapon_build',
      title: 'Постройка оружия',
      message: `${def.nameRu} заложено на верфи.`,
    },
  };
}

export async function useWeapon(
  userId: string,
  weaponId: string,
  opts: { contactId?: string } = {}
) {
  invalidateStateCache(userId);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const loaded = await loadCivForUser(userId);
    if (!loaded) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
    let civ = await catchUpInTx(tx, loaded.id, now);
    await finishReadyWeapons(tx, civ.id, now);

    const weapon = await tx.weapon.findFirst({
      where: { id: weaponId, civilizationId: civ.id },
    });
    if (!weapon) throw new AppError('WEAPON_NOT_FOUND', 'Оружие не найдено', 404);
    if (weapon.status === 'BUILDING' && weapon.readyAt.getTime() > now.getTime()) {
      throw new AppError('NOT_READY', 'Оружие ещё строится', 400);
    }
    if (weapon.status === 'USED' || weapon.status === 'DESTROYED') {
      throw new AppError('ALREADY_USED', 'Оружие уже израсходовано', 400);
    }
    // promote if due
    if (weapon.status === 'BUILDING') {
      await tx.weapon.update({ where: { id: weapon.id }, data: { status: 'READY' } });
      weapon.status = 'READY';
    }
    if (weapon.status !== 'READY') {
      throw new AppError('NOT_READY', 'Оружие не готово', 400);
    }

    const type = weapon.type as WeaponTypeId;
    const def = WEAPON_CATALOG[type];
    if (!def) throw new AppError('INVALID_WEAPON', 'Неизвестный тип', 400);

    let reportMessage = '';

    if (type === 'TRANQLUCATOR') {
      throw new AppError(
        'PASSIVE_WEAPON',
        'Транклюкатор работает пассивно в обороне — применять вручную не нужно',
        400
      );
    }

    if (def.requiresContact && !opts.contactId) {
      throw new AppError('CONTACT_REQUIRED', 'Нужен contactId цели', 400);
    }

    let contact = opts.contactId
      ? await tx.contact.findFirst({
          where: { id: opts.contactId, observerCivilizationId: civ.id },
        })
      : null;

    if (opts.contactId && !contact) {
      throw new AppError('CONTACT_NOT_FOUND', 'Контакт не найден', 404);
    }

    if (type === 'POSITRON_CANNON' && contact) {
      const dmg = POSITRON_CANNON_DAMAGE;
      // Soft damage: mark defense degraded, bump exposure slightly on target if real
      await tx.contact.update({
        where: { id: contact.id },
        data: {
          defenseStatus: 'radiated',
          reconLevel: Math.min(5, (contact.reconLevel ?? 0) + 1),
        },
      });
      if (contact.targetCivilizationId) {
        await tx.civilization.update({
          where: { id: contact.targetCivilizationId },
          data: {
            backgroundRadiation: Math.min(100, 50 + 35),
            signalExposure: { increment: 1.5 },
          },
        }).catch(() => undefined);
      }
      await tx.weapon.update({
        where: { id: weapon.id },
        data: { status: 'USED', usedAt: now, targetContactId: contact.id },
      });
      reportMessage = `Позитронный залп по «${contact.systemName ?? contact.id}». Урон ≈${dmg}. Радиационный фон цели повышен.`;
      await tx.journalEvent.create({
        data: {
          civilizationId: civ.id,
          type: 'combat',
          title: 'Позитронная пушка',
          message: reportMessage,
        },
      });
    } else if (type === 'RELATIVISTIC_DROP' && contact) {
      // Destroy system colonies of target if we own knowledge; wipe contact system
      if (contact.targetCivilizationId) {
        const targetId = contact.targetCivilizationId;
        // Remove target colonies / planets in their home system if present
        const target = await tx.civilization.findUnique({ where: { id: targetId } });
        if (target?.homeSolarSystemId) {
          await tx.planet.updateMany({
            where: {
              solarSystemId: target.homeSolarSystemId,
              colonized: true,
              isHomeworld: false,
            },
            data: { colonized: false, ownerCivilizationId: null },
          });
        }
        await tx.civilization.update({
          where: { id: targetId },
          data: {
            colonies: 1,
            isDestroyed: false,
            signalExposure: { increment: 5 },
            backgroundRadiation: { increment: 80 },
          },
        });
      }
      await tx.contact.update({
        where: { id: contact.id },
        data: {
          status: 'destroyed',
          isDestroyed: true,
          defenseStatus: 'annihilated',
          systemName: (contact.systemName ?? 'Система') + ' [уничтожена]',
        },
      });
      // Dark Forest blowback on attacker
      const exposure =
        Number((civ as { signalExposure?: number }).signalExposure ?? 1) + DROP_EXPOSURE_SPIKE;
      await tx.civilization.update({
        where: { id: civ.id },
        data: {
          signalExposure: exposure,
          aggression: Math.min(100, civ.aggression + 25),
        },
      });
      // Mark diplomatic hostility on open threads for this contact
      await tx.diplomaticThread.updateMany({
        where: { contactId: contact.id },
        data: { status: 'hostile', tension: 100, trust: 0 },
      });

      await tx.weapon.update({
        where: { id: weapon.id },
        data: { status: 'USED', usedAt: now, targetContactId: contact.id },
      });
      reportMessage =
        `Релятивистская капля применена. Система цели уничтожена. ` +
        `Удар Тёмного леса: заметность +${DROP_EXPOSURE_SPIKE}, вы помечены как агрессор.`;
      await tx.journalEvent.create({
        data: {
          civilizationId: civ.id,
          type: 'warning',
          title: 'Удар Тёмного леса',
          message: reportMessage,
        },
      });
    } else {
      throw new AppError('CANNOT_USE', 'Нельзя применить это оружие так', 400);
    }

    civ = await catchUpInTx(tx, civ.id, now);
    return {
      state: toGameState(civ, now),
      report: {
        type: 'weapon_use',
        title: def.nameRu,
        message: reportMessage,
      },
    };
  });

  return result;
}

/** Debug: finish all building weapons now */
export async function debugFinishWeapons(userId: string) {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  const now = new Date();
  await prisma.weapon.updateMany({
    where: { civilizationId: civ.id, status: 'BUILDING' },
    data: { status: 'READY', readyAt: now },
  });
  return listWeapons(userId);
}
