import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { getUserCivilizationState, invalidateStateCache } from './gameService.js';
import type { GameState } from '@shared';

export async function assertAdmin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) {
    throw new AppError('FORBIDDEN', 'Доступ только для администраторов', 403);
  }
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      throw new AppError('FORBIDDEN', 'Админ-панель отключена в production', 403);
    }
  }
}

export async function listUsers(limit = 100, offset = 0) {
  const take = Math.min(200, Math.max(1, limit));
  const skip = Math.max(0, offset);
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        email: true,
        premiumCredits: true,
        isAdmin: true,
        createdAt: true,
        civilization: { select: { id: true, name: true, level: true, prosperityScore: true } },
      },
    }),
    prisma.user.count(),
  ]);
  return {
    total,
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      premiumCredits: u.premiumCredits,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString(),
      civilization: u.civilization
        ? {
            id: u.civilization.id,
            name: u.civilization.name,
            level: u.civilization.level,
            prosperityScore: u.civilization.prosperityScore,
          }
        : null,
    })),
  };
}

export async function listCivilizations(opts: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const take = Math.min(200, Math.max(1, opts.limit ?? 50));
  const skip = Math.max(0, opts.offset ?? 0);
  const where = opts.q
    ? {
        OR: [
          { name: { contains: opts.q } },
          { user: { email: { contains: opts.q } } },
          { id: { contains: opts.q } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    prisma.civilization.findMany({
      where,
      orderBy: { prosperityScore: 'desc' },
      take,
      skip,
      select: {
        id: true,
        name: true,
        level: true,
        prosperityScore: true,
        seed: true,
        isDestroyed: true,
        galaxyName: true,
        createdAt: true,
        user: { select: { id: true, email: true, isAdmin: true } },
      },
    }),
    prisma.civilization.count({ where }),
  ]);
  return {
    total,
    civilizations: rows.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      prosperityScore: c.prosperityScore,
      seed: c.seed,
      isDestroyed: c.isDestroyed,
      galaxyName: c.galaxyName,
      createdAt: c.createdAt.toISOString(),
      user: { id: c.user.id, email: c.user.email, isAdmin: c.user.isAdmin },
    })),
  };
}

export async function getCivilizationAdmin(civId: string): Promise<{
  meta: Record<string, unknown>;
  state: GameState | null;
  journal: Array<{ id: string; type: string; title: string; message: string; createdAt: string }>;
}> {
  const civ = await prisma.civilization.findUnique({
    where: { id: civId },
    include: {
      user: { select: { id: true, email: true, isAdmin: true, premiumCredits: true } },
      resources: true,
      buildings: true,
      journal: { orderBy: { createdAt: 'desc' }, take: 40 },
    },
  });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const state = await getUserCivilizationState(civ.userId);
  return {
    meta: {
      id: civ.id,
      userId: civ.userId,
      email: civ.user.email,
      isAdmin: civ.user.isAdmin,
      premiumCredits: civ.user.premiumCredits,
      name: civ.name,
      level: civ.level,
      seed: civ.seed,
      prosperityScore: civ.prosperityScore,
      isDestroyed: civ.isDestroyed,
      physicsLaws: civ.physicsLaws,
      galaxyName: civ.galaxyName,
      resources: civ.resources,
      buildings: civ.buildings,
    },
    state,
    journal: civ.journal.map((j) => ({
      id: j.id,
      type: j.type,
      title: j.title,
      message: j.message,
      createdAt: j.createdAt.toISOString(),
    })),
  };
}

export async function modifyCivilization(
  civId: string,
  patch: {
    level?: number;
    highEnergy?: number;
    antimatter?: number;
    darkEnergy?: number;
    darkMatter?: number;
    fermions?: number;
    premiumCredits?: number;
  }
): Promise<{ state: GameState | null; message: string }> {
  invalidateStateCache();

  const civ = await prisma.civilization.findUnique({
    where: { id: civId },
    include: { resources: true, user: true },
  });
  if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  if (patch.level != null) {
    const lvl = Math.max(1, Math.min(100, Math.floor(patch.level)));
    await prisma.civilization.update({ where: { id: civId }, data: { level: lvl } });
  }

  const resData: Record<string, number> = {};
  const applyRes = (key: string, val: number | undefined, capacityKey: string) => {
    if (val == null || !Number.isFinite(val)) return;
    const n = Math.max(0, Math.floor(val));
    resData[key] = n;
    const curCap = Number((civ.resources as unknown as Record<string, unknown>)[capacityKey] ?? 0);
    resData[capacityKey] = Math.max(curCap, n);
  };
  applyRes('highEnergy', patch.highEnergy, 'highEnergyCapacity');
  applyRes('antimatter', patch.antimatter, 'antimatterCapacity');
  applyRes('darkEnergy', patch.darkEnergy, 'darkEnergyCapacity');
  applyRes('darkMatter', patch.darkMatter, 'darkMatterCapacity');
  applyRes('fermions', patch.fermions, 'fermionsCapacity');
  if (Object.keys(resData).length) {
    await prisma.resourceState.update({ where: { civilizationId: civId }, data: resData });
  }

  if (patch.premiumCredits != null) {
    await prisma.user.update({
      where: { id: civ.userId },
      data: { premiumCredits: Math.max(0, Math.floor(patch.premiumCredits)) },
    });
  }

  await prisma.journalEvent.create({
    data: {
      civilizationId: civId,
      type: 'admin',
      title: 'Админ: правка',
      message: `Изменения: ${JSON.stringify(patch)}`,
    },
  });

  const state = await getUserCivilizationState(civ.userId);
  return { state, message: 'Состояние цивилизации обновлено администратором' };
}

export async function getAdminStats() {
  const [
    users,
    civilizations,
    expeditions,
    combatActions,
    contacts,
    purchases,
    destroyed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.civilization.count(),
    prisma.expedition.count(),
    prisma.combatAction.count(),
    prisma.contact.count(),
    prisma.purchase.count(),
    prisma.civilization.count({ where: { isDestroyed: true } }),
  ]);
  return {
    users,
    civilizations,
    destroyed,
    expeditions,
    combatActions,
    contacts,
    purchases,
    serverTime: new Date().toISOString(),
  };
}
