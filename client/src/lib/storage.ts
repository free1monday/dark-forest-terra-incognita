import { SAVE_KEY, SAVE_VERSION, type SaveState } from '@shared';

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveState;
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!data.civilization?.seed) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state: SaveState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
