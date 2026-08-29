import { apiFetch } from './client';
import type { GameState } from '@shared';

export function adminStats() {
  return apiFetch<{
    users: number;
    civilizations: number;
    destroyed: number;
    expeditions: number;
    combatActions: number;
    contacts: number;
    purchases: number;
    serverTime: string;
  }>('/api/admin/stats');
}

export function adminUsers(limit = 100, offset = 0) {
  return apiFetch<{
    total: number;
    users: Array<{
      id: string;
      email: string;
      premiumCredits: number;
      isAdmin: boolean;
      createdAt: string;
      civilization: {
        id: string;
        name: string;
        level: number;
        prosperityScore: number;
      } | null;
    }>;
  }>(`/api/admin/users?limit=${limit}&offset=${offset}`);
}

export function adminCivilizations(q = '', limit = 50) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (q) qs.set('q', q);
  return apiFetch<{
    total: number;
    civilizations: Array<{
      id: string;
      name: string;
      level: number;
      prosperityScore: number;
      seed: string;
      isDestroyed: boolean;
      galaxyName: string;
      createdAt: string;
      user: { id: string; email: string; isAdmin: boolean };
    }>;
  }>(`/api/admin/civilizations?${qs}`);
}

export function adminCivilization(id: string) {
  return apiFetch<{
    meta: Record<string, unknown>;
    state: GameState | null;
    journal: Array<{ id: string; type: string; title: string; message: string; createdAt: string }>;
  }>(`/api/admin/civilizations/${id}`);
}

export function adminModify(
  id: string,
  patch: {
    level?: number;
    highEnergy?: number;
    antimatter?: number;
    darkEnergy?: number;
    darkMatter?: number;
    fermions?: number;
    premiumCredits?: number;
  }
) {
  return apiFetch<{ state: GameState | null; message: string }>(
    `/api/admin/civilizations/${id}/modify`,
    { method: 'POST', body: JSON.stringify(patch) }
  );
}
