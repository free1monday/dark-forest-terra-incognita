import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

/**
 * Stage 2: server is authoritative.
 * Poll state every 2s while logged in with a civilization so production / expeditions update.
 */
export function useGameTick(): void {
  const token = useAuthStore((s) => s.token);
  const hasCiv = useAuthStore((s) => s.hasCivilization);
  const state = useGameStore((s) => s.state);

  useEffect(() => {
    if (!token || !hasCiv || !state) return;

    const id = window.setInterval(() => {
      void useGameStore.getState().refresh();
    }, 2000);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void useGameStore.getState().refresh();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [token, hasCiv, !!state]);
}
