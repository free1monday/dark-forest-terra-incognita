import type {
  ActionResponse,
  AttackType,
  BuildingId,
  CivilizationFocuses,
  DiplomacyCardType,
  ExpeditionTypeId,
  GameDiplomacyThread,
  GameState,
} from '@shared';
import { apiFetch } from './client';

export function getCurrentState() {
  return apiFetch<{ state: GameState }>('/api/civilizations/current/state');
}

export function createCivilization(
  name: string,
  constants: CivilizationFocuses,
  opts?: { species?: string; politicalRegime?: string; governmentForm?: string }
) {
  return apiFetch<ActionResponse>('/api/civilizations', {
    method: 'POST',
    body: JSON.stringify({ name, constants, ...opts }),
  });
}

export function upgradeBuilding(buildingType: BuildingId) {
  return apiFetch<ActionResponse>('/api/civilizations/current/actions/upgrade-building', {
    method: 'POST',
    body: JSON.stringify({ buildingType }),
  });
}

export function levelUp() {
  return apiFetch<ActionResponse>('/api/civilizations/current/actions/level-up', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function explore(expeditionType: ExpeditionTypeId) {
  return apiFetch<ActionResponse>('/api/civilizations/current/actions/explore', {
    method: 'POST',
    body: JSON.stringify({ expeditionType }),
  });
}

/** @deprecated Stage 2 alias */
export function exploreTerraIncognita() {
  return explore('localScan');
}

export function debugGrantResources(body?: {
  highEnergy?: number;
  antimatter?: number;
  darkEnergy?: number;
  darkMatter?: number;
  fermions?: number;
}) {
  return apiFetch<ActionResponse>('/api/debug/grant-resources', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export function debugLevelUp() {
  return apiFetch<ActionResponse>('/api/debug/level-up', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugSetLevel(level: number) {
  return apiFetch<ActionResponse>('/api/debug/set-level', {
    method: 'POST',
    body: JSON.stringify({ level }),
  });
}

export function debugGrantArtifact(artifactKey?: string) {
  return apiFetch<ActionResponse>('/api/debug/grant-artifact', {
    method: 'POST',
    body: JSON.stringify(artifactKey ? { artifactKey } : {}),
  });
}

export function debugOpen4D() {
  return apiFetch<ActionResponse>('/api/debug/open-4d', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugReset() {
  return apiFetch<{ ok: boolean; report: { type: string; message: string } }>('/api/debug/reset', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function listContacts(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<{ contacts: import('@shared').GameContact[] }>(
    `/api/civilizations/current/contacts${q}`
  );
}

export function getContact(contactId: string) {
  return apiFetch<{ contact: import('@shared').GameContact }>(
    `/api/civilizations/current/contacts/${contactId}`
  );
}

export function debugRandomContact() {
  return apiFetch<ActionResponse>('/api/debug/random-contact', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugBumpExposure() {
  return apiFetch<ActionResponse>('/api/debug/bump-exposure', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugSimulateDetected() {
  return apiFetch<ActionResponse>('/api/debug/simulate-detected', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function initiateDiplomacy(contactId: string) {
  return apiFetch<{
    thread: GameDiplomacyThread;
    state: GameState;
    report: { type: string; message: string; title?: string };
  }>(`/api/civilizations/current/threads/${contactId}/initiate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getDiplomacyThread(threadId: string) {
  return apiFetch<{ thread: GameDiplomacyThread; state: GameState }>(
    `/api/civilizations/current/threads/${threadId}`
  );
}

export function sendDiplomacyCard(
  threadId: string,
  cardType: DiplomacyCardType | string,
  useEncryption = false
) {
  return apiFetch<{
    thread: GameDiplomacyThread;
    state: GameState;
    report: { type: string; message: string; title?: string };
  }>(`/api/civilizations/current/threads/${threadId}/send`, {
    method: 'POST',
    body: JSON.stringify({ cardType, useEncryption }),
  });
}

export function debugDiplomacyDeliverAll() {
  return apiFetch<ActionResponse>('/api/debug/diplomacy-deliver-all', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugDiplomacyResetMetrics(threadId?: string) {
  return apiFetch<ActionResponse>('/api/debug/diplomacy-reset-metrics', {
    method: 'POST',
    body: JSON.stringify(threadId ? { threadId } : {}),
  });
}

export function debugDiplomacyResources() {
  return apiFetch<ActionResponse>('/api/debug/diplomacy-resources', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function startCombat(body: {
  attackType: AttackType | string;
  contactId?: string;
  targetCoordinates?: { x: number; y: number; z: number };
}) {
  return apiFetch<ActionResponse>('/api/civilizations/current/combat/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function cancelCombat(actionId: string) {
  return apiFetch<ActionResponse>(`/api/civilizations/current/combat/${actionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugCombatResolveAll() {
  return apiFetch<ActionResponse>('/api/debug/combat-resolve-all', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugCombatResources() {
  return apiFetch<ActionResponse>('/api/debug/combat-resources', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export interface ShopItemDto {
  key: string;
  name: string;
  description: string;
  category: string;
  costCredits: number;
  resourceType?: string;
  amount?: number;
  capacityBonusPercent?: number;
  capacityAll?: boolean;
  premiumTier?: string;
}

export function listShopItems() {
  return apiFetch<{ items: ShopItemDto[] }>('/api/shop/items');
}

export function purchaseShopItem(itemId: string) {
  return apiFetch<
    ActionResponse & {
      user: { id: string; email: string; premiumCredits: number; createdAt: string };
      report: { type: string; message: string; title?: string; warning?: string };
    }
  >('/api/shop/purchase', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export interface LeaderboardEntryDto {
  rank: number;
  id: string;
  name: string;
  level: number;
  prosperityScore: number;
  status: 'active' | 'destroyed' | string;
  isBot: boolean;
  isCurrent: boolean;
}

export function getLeaderboard() {
  return apiFetch<{
    entries: LeaderboardEntryDto[];
    current: LeaderboardEntryDto | null;
    serverTime: string;
  }>('/api/leaderboard');
}

export function debugAddCredits(amount = 1000) {
  return apiFetch<
    ActionResponse & {
      user: { id: string; email: string; premiumCredits: number; createdAt: string };
    }
  >('/api/debug/add-credits', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function debugRecalculateProsperity() {
  return apiFetch<ActionResponse>('/api/debug/recalculate-prosperity', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getPhysicsLaws() {
  return apiFetch<{
    level: number;
    unlocked: boolean;
    maxActive: number;
    active: string[];
    catalog: import('@shared').GameState['physicsCatalog'];
    state: GameState;
  }>('/api/civilizations/current/physics-laws');
}

export function enactPhysicsLaw(lawId: string) {
  return apiFetch<ActionResponse>('/api/civilizations/current/physics-laws/enact', {
    method: 'POST',
    body: JSON.stringify({ lawId }),
  });
}

export function revokePhysicsLaw(lawId: string) {
  return apiFetch<ActionResponse>('/api/civilizations/current/physics-laws/revoke', {
    method: 'POST',
    body: JSON.stringify({ lawId }),
  });
}

export function startGalaxyTravel() {
  return apiFetch<ActionResponse>('/api/civilizations/current/travel-galaxy', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function debugGrantDarkEnergy(amount = 50000) {
  return apiFetch<ActionResponse>('/api/debug/grant-dark-energy', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function debugCompleteGalaxyTravel() {
  return apiFetch<ActionResponse>('/api/debug/complete-galaxy-travel', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
