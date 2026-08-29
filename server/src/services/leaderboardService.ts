import {
  LEADERBOARD_BOT_COUNT,
  LEADERBOARD_TOP,
  generateLeaderboardBot,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { computeAndStoreProsperity } from './prosperityService.js';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  level: number;
  prosperityScore: number;
  status: 'active' | 'destroyed';
  isBot: boolean;
  isCurrent: boolean;
}

export async function getLeaderboard(userId: string): Promise<{
  entries: LeaderboardEntry[];
  current: LeaderboardEntry | null;
  serverTime: string;
}> {

  // Refresh current player score lazily
  const me = await prisma.civilization.findUnique({
    where: { userId },
    include: {
      resources: true,
      buildings: true,
      artifacts: true,
      contactsObserved: { select: { isDestroyed: true, status: true } },
    },
  });
  if (me) {
    await prisma.$transaction(async (tx) => {
      await computeAndStoreProsperity(tx, me);
    });
  }

  const players = await prisma.civilization.findMany({
    orderBy: { prosperityScore: 'desc' },
    take: LEADERBOARD_TOP,
    select: {
      id: true,
      name: true,
      level: true,
      prosperityScore: true,
      isDestroyed: true,
      userId: true,
      seed: true,
    },
  });

  // Stable bot pool from a global seed so leaderboard looks populated
  const bots = Array.from({ length: LEADERBOARD_BOT_COUNT }, (_, i) =>
    generateLeaderboardBot('darkforest-leaderboard-v1', i)
  );

  type Row = {
    id: string;
    name: string;
    level: number;
    prosperityScore: number;
    isDestroyed: boolean;
    isBot: boolean;
    userId?: string;
  };

  const rows: Row[] = [
    ...players.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      prosperityScore: p.prosperityScore,
      isDestroyed: p.isDestroyed,
      isBot: false,
      userId: p.userId,
    })),
    ...bots.map((b) => ({
      id: b.id,
      name: b.name,
      level: b.level,
      prosperityScore: b.prosperityScore,
      isDestroyed: b.isDestroyed,
      isBot: true as const,
    })),
  ];

  rows.sort((a, b) => b.prosperityScore - a.prosperityScore || a.name.localeCompare(b.name, 'ru'));

  const top = rows.slice(0, LEADERBOARD_TOP);
  const entries: LeaderboardEntry[] = top.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.name,
    level: r.level,
    prosperityScore: r.prosperityScore,
    status: r.isDestroyed ? 'destroyed' : 'active',
    isBot: r.isBot,
    isCurrent: !!me && r.id === me.id,
  }));

  let current: LeaderboardEntry | null = null;
  if (me) {
    const inTop = entries.find((e) => e.id === me.id);
    if (inTop) {
      current = inTop;
    } else {
      const fullRank =
        rows.findIndex((r) => r.id === me.id) >= 0
          ? rows.findIndex((r) => r.id === me.id) + 1
          : rows.filter((r) => r.prosperityScore > me.prosperityScore).length + 1;
      current = {
        rank: fullRank,
        id: me.id,
        name: me.name,
        level: me.level,
        prosperityScore: me.prosperityScore,
        status: me.isDestroyed ? 'destroyed' : 'active',
        isBot: false,
        isCurrent: true,
      };
    }
  }

  return {
    entries,
    current,
    serverTime: new Date().toISOString(),
  };
}
