import { create } from 'zustand';

export type ToastKind = 'error' | 'info' | 'success';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
  createdAt: number;
}

interface ToastStore {
  items: ToastItem[];
  push: (kind: ToastKind, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

let seq = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  items: [],
  push: (kind, message, title) => {
    const id = `t-${Date.now()}-${seq++}`;
    const item: ToastItem = { id, kind, message, title, createdAt: Date.now() };
    set({ items: [...get().items, item].slice(-6) });
    window.setTimeout(() => get().dismiss(id), kind === 'error' ? 7000 : 4500);
  },
  success: (message, title) => get().push('success', message, title),
  error: (message, title) => get().push('error', message, title ?? 'Ошибка'),
  info: (message, title) => get().push('info', message, title),
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
  clear: () => set({ items: [] }),
}));
