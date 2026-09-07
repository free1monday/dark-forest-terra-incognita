import { useMemo, useState } from 'react';
import {
  HINTS,
  HINT_CATEGORY_LABELS,
  hintsByCategory,
  type HintCategory,
} from '@shared';
import { readSeenHints } from '../lib/hintStorage';
import { useGameStore } from '../store/gameStore';
import styles from './Handbook.module.css';

const CATS: HintCategory[] = ['interface', 'upgrade', 'cosmos', 'danger', 'economy'];

export function Handbook({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const civId = useGameStore((s) => s.state?.civilization.id);
  const [cat, setCat] = useState<HintCategory>('interface');
  const [tick, setTick] = useState(0);

  const seen = useMemo(() => {
    void tick;
    return civId ? readSeenHints(civId) : new Set<string>();
  }, [civId, tick, open]);

  const byCat = useMemo(() => hintsByCategory(), []);

  if (!open) return null;

  const list = byCat[cat] ?? [];
  const seenCount = HINTS.filter((h) => seen.has(h.id)).length;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label="Справочник">
      <div className={`glass ${styles.panel}`}>
        <header className={styles.head}>
          <div>
            <h2 className={styles.title}>Справочник</h2>
            <p className={styles.sub}>
              Накопленные подсказки · {seenCount} / {HINTS.length} открыто · без спойлеров
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className={styles.tabs} role="tablist">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              className={`${styles.tab} ${cat === c ? styles.tabOn : ''}`}
              onClick={() => setCat(c)}
            >
              {HINT_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {list.length === 0 && (
            <div className={styles.empty}>В этой категории пока пусто.</div>
          )}
          {list.map((h) => {
            const unlocked = seen.has(h.id);
            return (
              <article
                key={h.id}
                className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}
              >
                <div className={styles.cardTitle}>
                  {unlocked ? h.titleRu : '???'}
                  {!unlocked && <span className={styles.lockTag}>ещё не встречали</span>}
                </div>
                <p className={styles.cardBody}>
                  {unlocked
                    ? h.bodyRu
                    : 'Подсказка откроется, когда вы впервые столкнётесь с этой механикой.'}
                </p>
              </article>
            );
          })}
        </div>

        <footer className={styles.foot}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setTick((n) => n + 1)}
          >
            Обновить
          </button>
          <span className="muted" style={{ fontSize: '0.72rem' }}>
            Хранится только на этом устройстве (localStorage)
          </span>
        </footer>
      </div>
    </div>
  );
}
