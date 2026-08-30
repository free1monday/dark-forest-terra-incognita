import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import { formatCostParts } from './icons/ResourceIcons';
import styles from './CombatPanel.module.css';

function costStr(c: {
  highEnergy: number;
  antimatter: number;
  darkEnergy: number;
  darkMatter: number;
  fermions: number;
}): string {
  return [
    c.highEnergy ? `ВЭ ${c.highEnergy}` : null,
    c.antimatter ? `АМ ${c.antimatter}` : null,
    c.darkEnergy ? `ТЭ ${c.darkEnergy}` : null,
    c.darkMatter ? `ТМ ${c.darkMatter}` : null,
    c.fermions ? `ФМ ${c.fermions}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function CombatPanel() {
  const open = useGameStore((s) => s.combatPanelOpen);
  const close = useGameStore((s) => s.closeCombat);
  const contactId = useGameStore((s) => s.combatTargetContactId);
  const state = useGameStore((s) => s.state);
  const startCombat = useGameStore((s) => s.startCombat);
  const cancelCombat = useGameStore((s) => s.cancelCombat);
  const refresh = useGameStore((s) => s.refresh);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const error = useGameStore((s) => s.error);

  const contact = useMemo(
    () => state?.contacts.find((c) => c.id === contactId) ?? null,
    [state, contactId]
  );

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);

  useEffect(() => {
    if (contact) {
      setX(Math.round(contact.coordinates.x));
      setY(Math.round(contact.coordinates.y));
      setZ(Math.round(contact.coordinates.z));
    }
  }, [contact?.id]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  if (!open || !state) return null;

  const catalog = state.combatCatalog ?? [];
  const actions = state.combatActions ?? [];
  const reports = state.combatReports ?? [];
  const targetActions = contactId
    ? actions.filter((a) => a.targetContactId === contactId || a.targetContactId == null)
    : actions;

  const onLaunch = (type: string, requiresTarget: boolean) => {
    if (requiresTarget && !contactId) return;
    void startCombat(type, {
      contactId: requiresTarget ? contactId ?? undefined : undefined,
      targetCoordinates: requiresTarget ? { x, y, z } : undefined,
    });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.panel}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Тактический кабинет · STRIKE-BOARD</h2>
            <p className={styles.sub}>
              {contact
                ? `${contact.displayName} · ~${formatNumber(contact.distance, 0)} св. л. · ур. ${contact.levelMin}–${contact.levelMax}${contact.isDestroyed ? ' · УНИЧТОЖЕН' : ''}`
                : 'Оборонительные протоколы (без цели)'}
              {state.evacuationActive && ' · ЭВАКУАЦИЯ АКТИВНА'}
              {state.commJammedUntil && ` · JAM до ${new Date(state.commJammedUntil).toLocaleTimeString('ru-RU')}`}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Закрыть
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.col}>
            {contact && (
              <>
                <h3 className={styles.sectionTitle}>Сектор наведения</h3>
                <p className="muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                  Выберите координаты в радиусе погрешности. Чем ближе к истинным — тем выше P(hit).
                </p>
                <div className={styles.coords}>
                  <label>
                    X
                    <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} />
                  </label>
                  <label>
                    Y
                    <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
                  </label>
                  <label>
                    Z
                    <input type="number" value={z} onChange={(e) => setZ(Number(e.target.value))} />
                  </label>
                </div>
                {contact.structureEstimate && (
                  <>
                    <h3 className={styles.sectionTitle}>Оценка структуры (разведка)</h3>
                    <div className={styles.estimate}>
                      {Object.entries(contact.structureEstimate).map(([k, v]) => (
                        <span key={k}>
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {contact.defenseStatus && (
                  <p className="mono muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                    defenseStatus: {contact.defenseStatus} · recon L{contact.reconLevel}
                  </p>
                )}
              </>
            )}

            <h3 className={styles.sectionTitle}>Протоколы атаки / обороны</h3>
            <div className={styles.attacks}>
              {catalog.map((a) => {
                const needTarget = a.requiresTarget;
                const disabled =
                  actionLoading ||
                  !a.unlocked ||
                  (needTarget && (!contact || contact.isDestroyed)) ||
                  (!needTarget && !a.selfAction);
                return (
                  <button
                    key={a.type}
                    type="button"
                    className={styles.attack}
                    disabled={disabled}
                    title={a.reasons.join('; ') || a.description}
                    onClick={() => onLaunch(a.type, a.requiresTarget)}
                  >
                    <span className={styles.attackName}>{a.name}</span>
                    <span className={styles.attackDesc}>{a.description}</span>
                    <span className={styles.attackCost}>
                      {costStr(a.cost)} · prep~{a.prepSecEstimate}с · ур.{a.minCivLevel}+
                    </span>
                    {a.reasons[0] && <span className={styles.attackReasons}>{a.reasons[0]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.col}>
            <h3 className={styles.sectionTitle}>Активные операции</h3>
            <div className={styles.list}>
              {targetActions.length === 0 ? (
                <span className="muted">Нет активных/недавних операций</span>
              ) : (
                targetActions.slice(0, 12).map((a) => (
                  <div
                    key={a.id}
                    className={`${styles.item} ${
                      a.phase === 'done' ? styles.itemDone : a.phase === 'transit' ? styles.itemTransit : ''
                    }`}
                  >
                    <div>
                      {a.attackLabel} · {a.statusLabel}
                      {a.phase !== 'done' && ` · ETA ${a.etaSeconds}с`}
                    </div>
                    {a.outcomeLabel && <div>Исход: {a.outcomeLabel}</div>}
                    {a.status === 'PREPARING' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        style={{ marginTop: 4 }}
                        disabled={actionLoading}
                        onClick={() => void cancelCombat(a.id)}
                      >
                        Отменить (−60% стоимости)
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <h3 className={styles.sectionTitle}>Боевые отчёты</h3>
            <div className={styles.reports}>
              {reports.length === 0 ? (
                <span className="muted">Отчётов пока нет</span>
              ) : (
                reports.slice(0, 8).map((r) => (
                  <div key={r.id} className={styles.report}>
                    <div className={styles.reportTitle}>
                      {r.attackLabel} → {r.targetName ?? '—'} · {r.outcomeLabel}
                    </div>
                    <div className="mono muted" style={{ fontSize: '0.68rem' }}>
                      P(hit) {(r.hitChance * 100).toFixed(0)}% · ATK {r.attackPower.toFixed(0)} / DEF{' '}
                      {r.defensePower.toFixed(0)} · dmg {r.damageDealt.toFixed(2)}
                      {r.damageTaken > 0 ? ` · taken ${r.damageTaken.toFixed(2)}` : ''}
                    </div>
                    <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>{r.flavorText}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {error && <p className={styles.warn}>{error}</p>}
        <div className={styles.footer}>
          <span className="mono muted" style={{ fontSize: '0.7rem' }}>
            Асинхронный бой · auto-defense · Stage 6
          </span>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()} disabled={actionLoading}>
            Обновить
          </button>
        </div>
      </div>
    </div>
  );
}
