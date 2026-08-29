import { create } from 'zustand';
import type {
  BuildingId,
  CivilizationFocuses,
  DiplomacyCardType,
  ExpeditionTypeId,
  GameDiplomacyThread,
  GameState,
  SelectableObject,
} from '@shared';
import { ApiError } from '../api/client';
import * as gameApi from '../api/game';
import { useToastStore } from './toastStore';

interface GameStore {
  state: GameState | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  selected: SelectableObject;
  lastReport: string | null;
  diplomacyThread: GameDiplomacyThread | null;
  diplomacyOpen: boolean;

  clear: () => void;
  select: (obj: SelectableObject) => void;
  clearError: () => void;
  applyState: (state: GameState) => void;
  closeDiplomacy: () => void;

  loadState: () => Promise<GameState | null>;
  createCivilization: (name: string, focuses: CivilizationFocuses) => Promise<void>;
  upgradeBuilding: (id: BuildingId) => Promise<void>;
  levelUp: () => Promise<void>;
  startExpedition: (type: ExpeditionTypeId) => Promise<void>;
  refresh: () => Promise<void>;

  openDiplomacy: (contactId: string) => Promise<void>;
  refreshDiplomacy: () => Promise<void>;
  sendDiplomacyCard: (cardType: DiplomacyCardType | string, useEncryption?: boolean) => Promise<void>;

  combatTargetContactId: string | null;
  combatPanelOpen: boolean;
  shopOpen: boolean;
  leaderboardOpen: boolean;
  physicsOpen: boolean;
  cosmosOpen: boolean;
  openCombat: (contactId: string | null) => void;
  closeCombat: () => void;
  openShop: () => void;
  closeShop: () => void;
  openLeaderboard: () => void;
  closeLeaderboard: () => void;
  openPhysics: () => void;
  closePhysics: () => void;
  openCosmos: () => void;
  closeCosmos: () => void;
  purchaseShopItem: (itemId: string) => Promise<void>;
  addCreditsDebug: (amount?: number) => Promise<void>;
  recalculateProsperity: () => Promise<void>;
  enactPhysicsLaw: (lawId: string) => Promise<void>;
  revokePhysicsLaw: (lawId: string) => Promise<void>;
  startGalaxyTravel: () => Promise<void>;
  debugGrantDarkEnergy: (amount?: number) => Promise<void>;
  debugCompleteGalaxyTravel: () => Promise<void>;
  startCombat: (
    attackType: string,
    opts?: { contactId?: string; targetCoordinates?: { x: number; y: number; z: number } }
  ) => Promise<void>;
  cancelCombat: (actionId: string) => Promise<void>;

  debugAddHighEnergy: (amount?: number) => Promise<void>;
  debugAddFermions: (amount?: number) => Promise<void>;
  debugGrantAllResources: () => Promise<void>;
  debugLevelUp: () => Promise<void>;
  debugSetLevel: (level: number) => Promise<void>;
  debugGrantArtifact: () => Promise<void>;
  debugOpen4D: () => Promise<void>;
  debugRandomContact: () => Promise<void>;
  debugBumpExposure: () => Promise<void>;
  debugSimulateDetected: () => Promise<void>;
  debugDiplomacyDeliverAll: () => Promise<void>;
  debugDiplomacyResetMetrics: () => Promise<void>;
  debugDiplomacyResources: () => Promise<void>;
  debugCombatResolveAll: () => Promise<void>;
  debugCombatResources: () => Promise<void>;
  resetSave: () => Promise<void>;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Неизвестная ошибка';
}

function toastError(e: unknown) {
  useToastStore.getState().error(errMsg(e));
}

function toastOk(message: string, title?: string) {
  if (message) useToastStore.getState().success(message, title);
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  loading: false,
  actionLoading: false,
  error: null,
  selected: null,
  lastReport: null,
  diplomacyThread: null,
  diplomacyOpen: false,
  combatTargetContactId: null,
  combatPanelOpen: false,
  shopOpen: false,
  leaderboardOpen: false,
  physicsOpen: false,
  cosmosOpen: false,

  clear: () =>
    set({
      state: null,
      loading: false,
      actionLoading: false,
      error: null,
      selected: null,
      lastReport: null,
      diplomacyThread: null,
      diplomacyOpen: false,
      combatTargetContactId: null,
      combatPanelOpen: false,
      shopOpen: false,
      leaderboardOpen: false,
      physicsOpen: false,
      cosmosOpen: false,
    }),

  select: (obj) => set({ selected: obj }),
  clearError: () => set({ error: null }),
  applyState: (state) => set({ state, error: null }),
  closeDiplomacy: () => set({ diplomacyOpen: false }),

  loadState: async () => {
    set({ loading: true, error: null });
    try {
      const { state } = await gameApi.getCurrentState();
      set({ state, loading: false, error: null });
      return state;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CIV_NOT_FOUND') {
        set({ state: null, loading: false, error: null });
        return null;
      }
      set({ loading: false, error: errMsg(e) });
      throw e;
    }
  },

  createCivilization: async (name, focuses) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.createCivilization(name, focuses);
      set({
        state: res.state,
        actionLoading: false,
        lastReport: res.report.message,
        selected: { kind: 'civilization' },
      });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
      throw e;
    }
  },

  upgradeBuilding: async (id) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.upgradeBuilding(id);
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  levelUp: async () => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.levelUp();
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  startExpedition: async (type) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.explore(type);
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  refresh: async () => {
    try {
      const { state } = await gameApi.getCurrentState();
      set({ state });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toastError(e);
      set({ error: errMsg(e) });
      }
    }
  },

  debugAddHighEnergy: async (amount = 500) => {
    try {
      const res = await gameApi.debugGrantResources({ highEnergy: amount });
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugAddFermions: async (amount = 25) => {
    try {
      const res = await gameApi.debugGrantResources({ fermions: amount });
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugGrantAllResources: async () => {
    try {
      const res = await gameApi.debugGrantResources({});
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugLevelUp: async () => {
    try {
      const res = await gameApi.debugLevelUp();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugSetLevel: async (level) => {
    try {
      const res = await gameApi.debugSetLevel(level);
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugGrantArtifact: async () => {
    try {
      const res = await gameApi.debugGrantArtifact();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugOpen4D: async () => {
    try {
      const res = await gameApi.debugOpen4D();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugRandomContact: async () => {
    try {
      const res = await gameApi.debugRandomContact();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugBumpExposure: async () => {
    try {
      const res = await gameApi.debugBumpExposure();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugSimulateDetected: async () => {
    try {
      const res = await gameApi.debugSimulateDetected();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  openDiplomacy: async (contactId) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.initiateDiplomacy(contactId);
      set({
        state: res.state,
        diplomacyThread: res.thread,
        diplomacyOpen: true,
        actionLoading: false,
        lastReport: res.report.message,
        selected: { kind: 'contact', id: contactId },
      });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  refreshDiplomacy: async () => {
    const thread = get().diplomacyThread;
    if (!thread) return;
    try {
      const res = await gameApi.getDiplomacyThread(thread.id);
      set({ state: res.state, diplomacyThread: res.thread });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  sendDiplomacyCard: async (cardType, useEncryption = false) => {
    const thread = get().diplomacyThread;
    if (!thread) return;
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.sendDiplomacyCard(thread.id, cardType, useEncryption);
      set({
        state: res.state,
        diplomacyThread: res.thread,
        actionLoading: false,
        lastReport: res.report.message,
      });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  debugDiplomacyDeliverAll: async () => {
    try {
      const res = await gameApi.debugDiplomacyDeliverAll();
      set({ state: res.state, lastReport: res.report.message });
      const t = get().diplomacyThread;
      if (t) {
        const thr = await gameApi.getDiplomacyThread(t.id);
        set({ diplomacyThread: thr.thread, state: thr.state });
      }
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugDiplomacyResetMetrics: async () => {
    try {
      const t = get().diplomacyThread;
      const res = await gameApi.debugDiplomacyResetMetrics(t?.id);
      set({ state: res.state, lastReport: res.report.message });
      if (t) {
        const thr = await gameApi.getDiplomacyThread(t.id);
        set({ diplomacyThread: thr.thread, state: thr.state });
      }
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugDiplomacyResources: async () => {
    try {
      const res = await gameApi.debugDiplomacyResources();
      set({ state: res.state, lastReport: res.report.message });
      const t = get().diplomacyThread;
      if (t) {
        const thr = await gameApi.getDiplomacyThread(t.id);
        set({ diplomacyThread: thr.thread, state: thr.state });
      }
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  openCombat: (contactId) =>
    set({ combatPanelOpen: true, combatTargetContactId: contactId, diplomacyOpen: false }),
  closeCombat: () => set({ combatPanelOpen: false }),

  openShop: () => set({ shopOpen: true, leaderboardOpen: false, physicsOpen: false, cosmosOpen: false }),
  closeShop: () => set({ shopOpen: false }),
  openLeaderboard: () => set({ leaderboardOpen: true, shopOpen: false, physicsOpen: false, cosmosOpen: false }),
  closeLeaderboard: () => set({ leaderboardOpen: false }),
  openPhysics: () => set({ physicsOpen: true, cosmosOpen: false, shopOpen: false, leaderboardOpen: false }),
  closePhysics: () => set({ physicsOpen: false }),
  openCosmos: () => set({ cosmosOpen: true, physicsOpen: false, shopOpen: false, leaderboardOpen: false }),
  closeCosmos: () => set({ cosmosOpen: false }),

  enactPhysicsLaw: async (lawId) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.enactPhysicsLaw(lawId);
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  revokePhysicsLaw: async (lawId) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.revokePhysicsLaw(lawId);
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  startGalaxyTravel: async () => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.startGalaxyTravel();
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  debugGrantDarkEnergy: async (amount = 50000) => {
    try {
      const res = await gameApi.debugGrantDarkEnergy(amount);
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugCompleteGalaxyTravel: async () => {
    try {
      const res = await gameApi.debugCompleteGalaxyTravel();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  purchaseShopItem: async (itemId) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.purchaseShopItem(itemId);
      set({
        state: res.state,
        actionLoading: false,
        lastReport: res.report.message,
      });
      window.dispatchEvent(new CustomEvent('df-user-update', { detail: res.user }));
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  addCreditsDebug: async (amount = 1000) => {
    try {
      const res = await gameApi.debugAddCredits(amount);
      if (res.state) set({ state: res.state, lastReport: res.report.message });
      else set({ lastReport: res.report.message });
      window.dispatchEvent(new CustomEvent('df-user-update', { detail: res.user }));
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  recalculateProsperity: async () => {
    try {
      const res = await gameApi.debugRecalculateProsperity();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  startCombat: async (attackType, opts = {}) => {
    set({ actionLoading: true, error: null });
    try {
      const contactId = opts.contactId ?? get().combatTargetContactId ?? undefined;
      const res = await gameApi.startCombat({
        attackType,
        contactId,
        targetCoordinates: opts.targetCoordinates,
      });
      set({
        state: res.state,
        actionLoading: false,
        lastReport: res.report.message,
      });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  cancelCombat: async (actionId) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await gameApi.cancelCombat(actionId);
      toastOk(res.report.message);
      set({ state: res.state, actionLoading: false, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ actionLoading: false, error: errMsg(e) });
    }
  },

  debugCombatResolveAll: async () => {
    try {
      const res = await gameApi.debugCombatResolveAll();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  debugCombatResources: async () => {
    try {
      const res = await gameApi.debugCombatResources();
      set({ state: res.state, lastReport: res.report.message });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },

  resetSave: async () => {
    try {
      await gameApi.debugReset();
      set({
        state: null,
        selected: null,
        lastReport: 'Цивилизация сброшена на сервере.',
        diplomacyThread: null,
        diplomacyOpen: false,
        combatPanelOpen: false,
        combatTargetContactId: null,
        shopOpen: false,
        leaderboardOpen: false,
        physicsOpen: false,
        cosmosOpen: false,
      });
    } catch (e) {
      toastError(e);
      set({ error: errMsg(e) });
    }
  },
}));
