import { useMemo, useState } from 'react';
import {
  contactStatusLabelRu,
  signalTypeLabelRu,
  type ContactStatus,
} from '@shared';
import { formatNumber } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import styles from './ContactsPanel.module.css';

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'detected', label: 'Обнаружены' },
  { id: 'monitored', label: 'Наблюдение' },
  { id: 'contacted', label: 'Контакт' },
  { id: 'hostile', label: 'Враждебные' },
  { id: 'allied', label: 'Союз' },
  { id: 'destroyed', label: 'Уничтожены' },
];

const STATUS_CLASS: Record<string, string> = {
  detected: styles.stDetected,
  monitored: styles.stMonitored,
  contacted: styles.stContacted,
  hostile: styles.stHostile,
  allied: styles.stAllied,
  destroyed: styles.stDestroyed,
};

export function ContactsPanel() {
  const contacts = useGameStore((s) => s.state?.contacts ?? []);
  const select = useGameStore((s) => s.select);
  const selected = useGameStore((s) => s.selected);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return contacts;
    return contacts.filter((c) => c.status === filter);
  }, [contacts, filter]);

  return (
    <div className={`glass ${styles.panel}`}>
      <div className={styles.header}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          Обнаруженные цивилизации
        </h2>
        <span className="tag">{contacts.length}</span>
      </div>

      <div className={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-ghost btn-sm ${filter === f.id ? styles.filterActive : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.82rem', margin: '0.5rem 0 0' }}>
          Нет контактов. Зондовая/глубокая экспедиция или 4D могут зафиксировать сигнал.
        </p>
      ) : (
        <div className={`scroll-y ${styles.list}`}>
          {filtered.map((c) => {
            const isSel = selected?.kind === 'contact' && selected.id === c.id;
            const confPct = Math.round(c.confidence * 100);
            return (
              <button
                key={c.id}
                type="button"
                title={`Ур. ~${c.levelMin}–${c.levelMax} · ${Math.floor(c.distance)} св.л. · ${c.status}`}
              className={`${styles.item} clickable ${isSel ? 'selected' : ''} ${
                  c.fuzzy ? styles.fuzzy : ''
                } ${STATUS_CLASS[c.status] ?? ''}`}
                onClick={() => select({ kind: 'contact', id: c.id })}
              >
                <div className={styles.topRow}>
                  <span className={styles.antenna} aria-hidden>
                    ⌇
                  </span>
                  <span className={styles.name}>{c.displayName}</span>
                  {c.threadId && (
                    <span className={styles.threadIcon} title="Дипломатический канал">
                      📡
                    </span>
                  )}
                  <span className={`${styles.status} ${STATUS_CLASS[c.status] ?? ''}`}>
                    {contactStatusLabelRu(c.status as ContactStatus)}
                  </span>
                </div>
                <div className={styles.meta}>
                  <span>
                    ~{formatNumber(c.distance, 0)} ± {formatNumber(c.distanceNoise, 0)} св.л.
                  </span>
                  <span>
                    ур. {c.levelMin}–{c.levelMax}
                  </span>
                  <span>{confPct}%</span>
                  <span>{signalTypeLabelRu(c.signalType)}</span>
                  {c.threadId != null && c.trust != null && (
                    <span>
                      D{c.trust}/N{c.tension ?? 0}
                    </span>
                  )}
                </div>
                {c.fuzzy && <div className={styles.fuzzyTag}>НЕТЧЁТКИЙ СИГНАЛ</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
