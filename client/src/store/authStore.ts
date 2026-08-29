import { create } from 'zustand';
import * as authApi from '../api/auth';
import { ApiError, getToken, setToken } from '../api/client';
import type { PublicUser } from '../api/auth';

interface AuthStore {
  ready: boolean;
  loading: boolean;
  token: string | null;
  user: PublicUser | null;
  hasCivilization: boolean | null;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setHasCivilization: (v: boolean) => void;
  setUser: (u: PublicUser) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  ready: false,
  loading: false,
  token: getToken(),
  user: null,
  hasCivilization: null,
  error: null,

  bootstrap: async () => {
    const token = getToken();
    if (!token) {
      set({ ready: true, token: null, user: null, hasCivilization: null });
      return;
    }
    try {
      const me = await authApi.me();
      set({
        ready: true,
        token,
        user: me.user,
        hasCivilization: !!me.civilization,
        error: null,
      });
    } catch {
      setToken(null);
      set({
        ready: true,
        token: null,
        user: null,
        hasCivilization: null,
        error: null,
      });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      setToken(res.token);
      const me = await authApi.me();
      set({
        loading: false,
        token: res.token,
        user: me.user,
        hasCivilization: !!me.civilization,
        error: null,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Ошибка входа';
      set({ loading: false, error: msg });
      throw e;
    }
  },

  register: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(email, password);
      setToken(res.token);
      set({
        loading: false,
        token: res.token,
        user: res.user,
        hasCivilization: false,
        error: null,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Ошибка регистрации';
      set({ loading: false, error: msg });
      throw e;
    }
  },

  logout: () => {
    setToken(null);
    set({
      token: null,
      user: null,
      hasCivilization: null,
      error: null,
      loading: false,
    });
  },

  clearError: () => set({ error: null }),
  setHasCivilization: (v) => set({ hasCivilization: v }),
  setUser: (u) => set({ user: u }),
}));
