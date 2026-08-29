import type { Prisma } from '@prisma/client';
import {
  calculateProsperityScore,
  type BuildingState,
} from '@shared';
import { buildingsToState } from './stateService.js';

type CivForProsperity = {
  id: string;
  level: number;
  isDestroyed?: boolean | null;
  successfulExpeditions: number;
  totalHighEnergyMined: number;
  buildings: Array<{ buildingType: string; level: number }>;
  resources: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
  } | null;
  artifacts: Array<{ rarity: string }>;
  contactsObserved?: Array<{ isDestroyed: boolean; status: string }>;
};

export async function computeAndStoreProsperity(
  tx: Prisma.TransactionClient,
  civ: CivForProsperity
): Promise<number> {
  if (!civ.resources) return civ.level * 100;

  const buildings: BuildingState[] = buildingsToState(civ.buildings as never);
  const contacts = civ.contactsObserved ?? [];
  const contactsDestroyed = contacts.filter((c) => c.isDestroyed || c.status === 'destroyed').length;
  const contactsDetected = Math.max(0, contacts.length - contactsDestroyed);

  // Combat stats from reports
  const reports = await tx.combatReport.findMany({
    where: { attackerCivilizationId: civ.id },
    select: { outcome: true },
  });
  let combatDestroyWins = 0;
  let combatDamageWins = 0;
  for (const r of reports) {
    if (r.outcome === 'HIT_DESTROYED') combatDestroyWins += 1;
    else if (
      r.outcome === 'HIT_LIGHT' ||
      r.outcome === 'HIT_MODERATE' ||
      r.outcome === 'HIT_HEAVY' ||
      r.outcome === 'COUNTERATTACKED'
    ) {
      combatDamageWins += 1;
    }
  }

  const score = calculateProsperityScore({
    level: civ.level,
    buildings,
    resources: {
      highEnergy: civ.resources.highEnergy,
      antimatter: civ.resources.antimatter,
      darkEnergy: civ.resources.darkEnergy,
      darkMatter: civ.resources.darkMatter,
      fermions: civ.resources.fermions,
    },
    artifactRarities: civ.artifacts.map((a) => a.rarity),
    contactsDetected,
    contactsDestroyed,
    combatDamageWins,
    combatDestroyWins,
    successfulExpeditions: civ.successfulExpeditions,
    totalHighEnergyMined: civ.totalHighEnergyMined,
    isDestroyed: !!civ.isDestroyed,
  });

  await tx.civilization.update({
    where: { id: civ.id },
    data: { prosperityScore: score },
  });
  return score;
}
