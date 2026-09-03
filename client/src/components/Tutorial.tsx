import { useEffect, useMemo, useState } from 'react';
import { TUTORIAL_STEPS } from '@shared';
import { apiFetch } from '../api/client';
import { useGameStore } from '../store/gameStore';
import styles from './Tutorial.module.css';

const STEP_KEY = 'darkforest_tutorial_step_v1';

function readLocalStep(civId: string): number {
  try {
    const raw = localStorage.getItem(`${STEP_KEY}:${civId}`);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, n)) : 0;
  } catch {
    return 0;
  }
}

function writeLocalStep(civId: string, step: number) {
  try {
    localStorage.setItem(`${STEP_KEY}:${civId}`, String(step));
  } catch {
    /* ignore */
  }
}

export function Tutorial({
  forceOpen,
  onCloseForce,
}: {
  forceOpen?: boolean;
  onCloseForce?: () => void;
}) {
  const civ = useGameStore((s) => s.state?.civilization);
  const applyState = useGameStore((s) => s.applyState);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => {
    if (!civ) return false;
    if (forceOpen) return true;
    return civ.tutorialCompleted === false;
  }, [civ, forceOpen]);

  useEffect(() => {
    if (!civ || !active) return;
    setStep(readLocalStep(civ.id));
  }, [civ?.id, active]);

  const current = TUTORIAL_STEPS[step] ?? TUTORIAL_STEPS[0]!;

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const el = document.querySelector(`[data-tutorial="${current.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
      else setRect(null);
    };
    update();
    const t = window.setInterval(update, 400);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearInterval(t);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, current.target, step]);

  if (!active || !civ) return null;

  const finish = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ state: unknown }>(
        '/api/civilizations/current/complete-tutorial',
        { method: 'POST', body: JSON.stringify({}) }
      );
      applyState(res.state as never);
      writeLocalStep(civ.id, TUTORIAL_STEPS.length - 1);
      onCloseForce?.();
    } catch {
      // still close force mode
      onCloseForce?.();
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step >= TUTORIAL_STEPS.length - 1) {
      void finish();
      return;
    }
    const n = step + 1;
    setStep(n);
    writeLocalStep(civ.id, n);
  };

  const pad = 8;
  const hole = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  return (
    <div className={styles.root} role="dialog" aria-modal aria-label="Обучение">
      <div className={styles.shade} />
      {hole && (
        <div
          className={styles.hole}
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      )}
      {hole && (
        <div
          className={styles.arrow}
          style={{
            top: Math.min(window.innerHeight - 24, hole.top + hole.height + 6),
            left: hole.left + hole.width / 2,
          }}
        />
      )}
      <div
        className={styles.card}
        style={
          hole
            ? {
                top: Math.min(
                  window.innerHeight - 200,
                  Math.max(12, hole.top + hole.height + 28)
                ),
                left: Math.min(
                  window.innerWidth - 320,
                  Math.max(12, hole.left)
                ),
              }
            : { top: '30%', left: '50%', transform: 'translateX(-50%)' }
        }
      >
        <div className={styles.step}>
          Шаг {step + 1} / {TUTORIAL_STEPS.length}
        </div>
        <h3 className={styles.title}>{current.titleRu}</h3>
        <p className={styles.body}>{current.bodyRu}</p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void finish()}>
            Пропустить
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={next}>
            {step >= TUTORIAL_STEPS.length - 1 ? 'Готово' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}
