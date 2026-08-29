import { useEffect, type ReactNode } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { CreateCivilization } from './components/CreateCivilization';
import { MainScreen } from './components/MainScreen';
import { Starfield } from './components/Starfield';
import { ToastStack } from './components/ToastStack';
import { OnboardingModal } from './components/OnboardingModal';
import { useGameTick } from './hooks/useGameTick';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const ready = useAuthStore((s) => s.ready);
  const token = useAuthStore((s) => s.token);
  const hasCivilization = useAuthStore((s) => s.hasCivilization);
  const setHasCivilization = useAuthStore((s) => s.setHasCivilization);

  const loadState = useGameStore((s) => s.loadState);
  const state = useGameStore((s) => s.state);
  const loading = useGameStore((s) => s.loading);
  const clearGame = useGameStore((s) => s.clear);
  const gameError = useGameStore((s) => s.error);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!token) {
      clearGame();
      return;
    }
    if (hasCivilization) {
      void loadState()
        .then((s) => {
          if (!s) setHasCivilization(false);
        })
        .catch(() => {
          /* error in store */
        });
    }
  }, [token, hasCivilization, loadState, clearGame, setHasCivilization]);

  useEffect(() => {
    if (state && hasCivilization === false) {
      setHasCivilization(true);
    }
  }, [state, hasCivilization, setHasCivilization]);

  useGameTick();

  let content: ReactNode;

  if (!ready) {
    content = (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: '0.75rem' }}>
        <span className="spinner" aria-hidden />
        <p className="mono muted">Инициализация протоколов…</p>
      </div>
    );
  } else if (!token) {
    content = <AuthScreen />;
  } else if (!hasCivilization) {
    content = <CreateCivilization />;
  } else if (loading && !state) {
    content = (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: '0.75rem' }}>
        <span className="spinner" aria-hidden />
        <p className="mono muted">Синхронизация с сервером…</p>
      </div>
    );
  } else if (state) {
    content = <MainScreen />;
  } else if (gameError) {
    content = (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          gap: '1rem',
          padding: '1rem',
        }}
      >
        <p className="mono" style={{ color: 'var(--danger)', textAlign: 'center' }}>
          {gameError}
        </p>
        <button type="button" className="btn" onClick={() => void loadState()}>
          Повторить
        </button>
      </div>
    );
  } else {
    content = <CreateCivilization />;
  }

  return (
    <div className="app-root">
      <Starfield />
      <div className={`app-content screen-fade`} key={token ? (hasCivilization ? 'game' : 'create') : 'auth'}>
        {content}
      </div>
      <ToastStack />
      {state && <OnboardingModal />}
    </div>
  );
}
