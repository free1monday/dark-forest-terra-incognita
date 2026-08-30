import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCostParts } from './icons/ResourceIcons';
import styles from './CosmosPanel.module.css';

export function CosmosPanel() {
  const open = useGameStore((s) => s.cosmosOpen);
  const close = useGameStore((s) => s.closeCosmos);
  const state = useGameStore((s) => s.state);
  const start = useGameStore((s) => s.startGalaxyTravel);
  const refresh = useGameStore((s) => s.refresh);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const error = useGameStore((s) => s.error);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      void refresh();
    }, 2000);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  if (!open || !state) return null;

  const gt = state.galaxyTravel;
  const eta =
    gt.traveling && gt.finishesAt
      ? Math.max(0, Math.ceil((new Date(gt.finishesAt).getTime() - now) / 1000))
      : 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.panel}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Космос · Межгалактика</h2>
            <p className={styles.sub}>
              Текущая: {state.civilization.galaxyName} / {state.civilization.sectorName} /{' '}
              {state.civilization.systemName}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Закрыть
          </button>
        </div>

        <div className={styles.box}>
          <p style={{ margin: '0 0 0.5rem' }}>
            Перенос цивилизации в процедурно новую галактику. Уровень, здания и ресурсы
            сохраняются. <strong>Все контакты будут потеряны</strong>, signalExposure
            сбрасывается.
          </p>
          <div className={styles.cost}>
            Стоимость: {formatCostParts(gt.cost)}
          </div>
          <div className="muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
            Длительность ~{gt.durationSec} с · доступ с ур. 80
          </div>
        </div>

        {gt.traveling ? (
          <div className={styles.box}>
            <div>Переход в процессе…</div>
            <div className={styles.timer}>ETA {eta} с</div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={actionLoading || !gt.unlocked || gt.reasons.length > 0}
            title={gt.reasons.join('; ') || undefined}
            onClick={() => {
              if (confirm('Начать межгалактический переход? Контакты будут уничтожены.')) {
                void start();
              }
            }}
          >
            Начать переход
          </button>
        )}

        {gt.reasons[0] && !gt.traveling && <p className={styles.warn}>{gt.reasons[0]}</p>}
        {error && <p className={styles.warn}>{error}</p>}
      </div>
    </div>
  );
}
