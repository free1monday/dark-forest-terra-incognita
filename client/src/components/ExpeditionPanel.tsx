import { useEffect, useState } from 'react';
import type { ExpeditionTypeId } from '@shared';
import { formatEta, formatNumber } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import { formatCostParts } from './icons/ResourceIcons';
import styles from './ExpeditionPanel.module.css';

export function ExpeditionPanel() {
  const state = useGameStore((s) => s.state);
  const start = useGameStore((s) => s.startExpedition);
  const refresh = useGameStore((s) => s.refresh);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const [now, setNow] = useState(Date.now());

  const expedition = state?.expedition;
  const active = !!expedition?.active;
  const finishesAt = expedition?.finishesAt ? new Date(expedition.finishesAt).getTime() : 0;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (finishesAt && t >= finishesAt) void refresh();
    }, 250);
    return () => window.clearInterval(id);
  }, [active, finishesAt, refresh]);

  if (!state) return null;

  const left = active ? finishesAt - now : 0;
  const catalog = state.expeditionCatalog ?? [];

  return (
    <div className={`glass glow-border ${styles.wrap}`}>
      <div className={styles.header}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          Экспедиции · Терра Инкогнита
        </h2>
        <div className={styles.radar}>
          Эфф. радар <span className="mono">{state.effectiveRadar}</span>
          <span className="muted"> · </span>
          светимость <span className="mono">{state.signalExposure}</span>
        </div>
      </div>

      {active && (
        <div className={styles.active}>
          <div>
            <strong>Активна:</strong>{' '}
            {catalog.find((c) => c.id === expedition?.expeditionType)?.name ??
              expedition?.expeditionType}{' '}
            · осталось {formatEta(left)}
          </div>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
            {left <= 0 ? 'Получить отчёт' : 'Обновить статус'}
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {catalog.map((item) => {
          const locked = !item.unlocked || active || actionLoading;
          const costNode = formatCostParts(item.cost);

          return (
            <div
              key={item.id}
              className={`${styles.card} ${!item.unlocked ? styles.locked : ''}`}
            >
              <div className={styles.cardTitle}>{item.name}</div>
              <p className={styles.desc}>{item.description}</p>
              <div className={styles.meta}>
                <div>
                  Стоимость: {costNode || '—'}
                </div>
                <div>
                  ~{formatNumber(item.durationSecEstimate, 0)} с · ур. {item.minCivLevel}+
                </div>
              </div>
              {!item.unlocked && item.reasons.length > 0 && (
                <ul className={styles.reasons}>
                  {item.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={locked}
                onClick={() => void start(item.id as ExpeditionTypeId)}
              >
                Запустить
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
