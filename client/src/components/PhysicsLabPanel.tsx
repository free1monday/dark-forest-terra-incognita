import { formatCostParts } from './icons/ResourceIcons';
import { formatNumber } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import styles from './PhysicsLabPanel.module.css';

export function PhysicsLabPanel() {
  const open = useGameStore((s) => s.physicsOpen);
  const close = useGameStore((s) => s.closePhysics);
  const state = useGameStore((s) => s.state);
  const enact = useGameStore((s) => s.enactPhysicsLaw);
  const revoke = useGameStore((s) => s.revokePhysicsLaw);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const error = useGameStore((s) => s.error);
  const lastReport = useGameStore((s) => s.lastReport);

  if (!open || !state) return null;

  const active = state.civilization.physicsLaws ?? [];
  const catalog = state.physicsCatalog ?? [];
  const unlocked = state.civilization.level >= 90;

  const slots = [0, 1, 2].map((i) => active[i] ?? null);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.panel}`}>
        <div className={styles.header}>
          <div>
            <h2 className={`${styles.title} ${styles.glitch}`}>Конструктор реальности · PHYSICS LAB</h2>
            <p className={styles.sub}>
              Уровень 90+. До 3 локальных законов. Тёмная энергия не покупается — только добыча.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Закрыть
          </button>
        </div>

        {!unlocked && (
          <p className={styles.warn}>
            Лаборатория запечатана до 90 уровня (сейчас {state.civilization.level}).
          </p>
        )}

        <h3 className="panel-title" style={{ margin: 0, fontSize: '0.75rem' }}>
          Активные слоты ({active.length}/3)
        </h3>
        <div className={styles.slots}>
          {slots.map((id, i) => {
            const law = catalog.find((c) => c.id === id);
            return (
              <div key={i} className={`${styles.slot} ${id ? styles.slotFilled : ''}`}>
                {law ? (
                  <>
                    <div className={styles.lawName}>{law.name}</div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={actionLoading}
                      onClick={() => void revoke(law.id)}
                    >
                      Отменить (−90% стоимости)
                    </button>
                  </>
                ) : (
                  <span className="muted">пустой слот</span>
                )}
              </div>
            );
          })}
        </div>

        <h3 className="panel-title" style={{ margin: 0, fontSize: '0.75rem' }}>
          Каталог законов
        </h3>
        <div className={styles.list}>
          {catalog.map((law) => (
            <div
              key={law.id}
              className={`${styles.law} ${law.active ? styles.lawActive : ''}`}
            >
              <div className={styles.lawName}>{law.name}</div>
              <div className={styles.lawDesc}>{law.description}</div>
              <div className={styles.lawMeta}>
                <span className={styles.cost}>{formatCostParts(law.cost)}</span>
                {law.active ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={actionLoading}
                    onClick={() => void revoke(law.id)}
                  >
                    Отменить
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={actionLoading || !unlocked || !law.unlocked}
                    title={law.reasons.join('; ')}
                    onClick={() => void enact(law.id)}
                  >
                    Принять
                  </button>
                )}
              </div>
              {!law.active && law.reasons[0] && (
                <span className={styles.warn}>{law.reasons[0]}</span>
              )}
            </div>
          ))}
        </div>

        {error && <p className={styles.warn}>{error}</p>}
        {lastReport && !error && (
          <p className="muted" style={{ fontSize: '0.75rem', margin: 0 }}>
            {lastReport}
          </p>
        )}
      </div>
    </div>
  );
}
