import { useEffect, useState } from 'react';
import type { ExpeditionTypeId, ResourceId } from '@shared';
import { formatEta, formatNumber } from '../lib/format';
import { ACTION_TIPS } from '../lib/tooltips';
import { useGameStore } from '../store/gameStore';
import { ActionRow } from './ActionCost';
import { InfoTip } from './InfoTip';
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
  const resources = state.resources;

  return (
    <div className={`glass glow-border ${styles.wrap}`}>
      <div className={styles.header}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          <InfoTip
            title={ACTION_TIPS.expedition.title}
            body={ACTION_TIPS.expedition.body}
            links={ACTION_TIPS.expedition.links}
          >
            <span>Экспедиции · Терра Инкогнита</span>
          </InfoTip>
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
          const cost = item.cost as Partial<Record<ResourceId, number>>;
          return (
            <div
              key={item.id}
              className={`${styles.card} ${!item.unlocked ? styles.locked : ''}`}
            >
              <div className={styles.cardTitle}>
                <InfoTip
                  title={item.name}
                  body={item.description}
                  links="Связь: экспедиции могут поднять заметность, если находят сигналы."
                >
                  <span>{item.name}</span>
                </InfoTip>
              </div>
              <p className={styles.desc}>{item.description}</p>
              <div className={styles.meta}>
                ~{formatNumber(item.durationSecEstimate, 0)} с · ур. {item.minCivLevel}+
              </div>
              {!item.unlocked && item.reasons.length > 0 && (
                <ul className={styles.reasons}>
                  {item.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <ActionRow
                cost={cost}
                have={resources}
                disabled={!item.unlocked || active}
                loading={actionLoading}
                onClick={() => void start(item.id as ExpeditionTypeId)}
              >
                Запустить
              </ActionRow>
            </div>
          );
        })}
      </div>
    </div>
  );
}
