import { useEffect, useState } from 'react';
import { HINTS, bootHints, type HintDef } from '@shared';
import {
  isBootHintsDone,
  markHintSeen,
  readSeenHints,
  setBootHintsDone,
} from '../lib/hintStorage';
import { useGameStore } from '../store/gameStore';
import styles from './Tutorial.module.css'; // reuse spotlight styles

/**
 * One-shot coach marks: first encounter with a mechanic.
 * Skips while Stage 12 interactive tutorial is active.
 */
export function ContextualHint({
  primaryTab,
  openPanel,
  tutorialActive,
}: {
  primaryTab: 'build' | 'explore' | 'scan';
  openPanel: string | null;
  tutorialActive: boolean;
}) {
  const civ = useGameStore((s) => s.state?.civilization);
  const [queue, setQueue] = useState<HintDef[]>([]);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [seenTick, setSeenTick] = useState(0);

  const current = queue[0] ?? null;

  // Build queue when context changes
  useEffect(() => {
    if (!civ || tutorialActive) {
      setQueue([]);
      return;
    }
    const seen = readSeenHints(civ.id);
    const next: HintDef[] = [];

    if (!isBootHintsDone(civ.id)) {
      for (const h of bootHints()) {
        if (!seen.has(h.id)) next.push(h);
      }
    }

    for (const h of HINTS) {
      if (seen.has(h.id)) continue;
      if (h.trigger === 'tab' && h.tab === primaryTab) next.push(h);
      if (h.trigger === 'open' && h.panel && h.panel === openPanel) next.push(h);
    }

    // de-dupe by id preserving order
    const ids = new Set<string>();
    const unique = next.filter((h) => (ids.has(h.id) ? false : (ids.add(h.id), true)));
    setQueue(unique);
  }, [civ?.id, primaryTab, openPanel, tutorialActive, seenTick]);

  useEffect(() => {
    if (!current) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(
        `[data-tutorial="${current.target}"], [data-hint="${current.target}"]`
      );
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
  }, [current?.id, current?.target]);

  if (!civ || !current || tutorialActive) return null;

  const dismiss = (markBootIfNeeded = true) => {
    markHintSeen(civ.id, current.id);
    const remainingBoot = bootHints().filter(
      (h) => h.id !== current.id && !readSeenHints(civ.id).has(h.id)
    );
    // if this was a boot hint and no boot left — mark boot done when queue drains boot
    if (markBootIfNeeded && current.trigger === 'boot') {
      const still = bootHints().some((h) => !readSeenHints(civ.id).has(h.id));
      if (!still) setBootHintsDone(civ.id);
    }
    void remainingBoot;
    setSeenTick((n) => n + 1);
  };

  const skipAllBoot = () => {
    for (const h of bootHints()) markHintSeen(civ.id, h.id);
    setBootHintsDone(civ.id);
    setSeenTick((n) => n + 1);
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
    <div className={styles.root} role="dialog" aria-modal aria-label="Подсказка">
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
      <div
        className={styles.card}
        style={
          hole
            ? {
                top: Math.min(
                  window.innerHeight - 200,
                  Math.max(12, hole.top + hole.height + 28)
                ),
                left: Math.min(window.innerWidth - 320, Math.max(12, hole.left)),
              }
            : { top: '28%', left: '50%', transform: 'translateX(-50%)' }
        }
      >
        <div className={styles.step}>Подсказка · без спойлеров</div>
        <h3 className={styles.title}>{current.titleRu}</h3>
        <p className={styles.body}>{current.bodyRu}</p>
        <div className={styles.actions}>
          {current.trigger === 'boot' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={skipAllBoot}>
              Пропустить вводные
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dismiss()}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
