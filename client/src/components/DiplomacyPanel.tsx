import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import { formatCostParts } from './icons/ResourceIcons';
import styles from './DiplomacyPanel.module.css';

function formatEta(sec: number): string {
  if (sec <= 0) return '0 с';
  if (sec < 60) return `${sec} с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}м ${s}с`;
}

function statusClass(status: string): string {
  if (status === 'hostile') return styles.statusHostile;
  if (status === 'closed') return styles.statusClosed;
  return styles.statusActive;
}

function statusLabel(status: string): string {
  if (status === 'hostile') return 'Враждебный';
  if (status === 'closed') return 'Закрыт';
  return 'Активен';
}

export function DiplomacyPanel() {
  const open = useGameStore((s) => s.diplomacyOpen);
  const thread = useGameStore((s) => s.diplomacyThread);
  const close = useGameStore((s) => s.closeDiplomacy);
  const send = useGameStore((s) => s.sendDiplomacyCard);
  const refresh = useGameStore((s) => s.refreshDiplomacy);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const error = useGameStore((s) => s.error);
  const [encrypt, setEncrypt] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      void refresh();
    }, 2000);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  const inTransit = useMemo(() => {
    if (!thread) return [];
    return thread.messages.filter((m) => m.status === 'IN_TRANSIT');
  }, [thread, tick]);

  if (!open || !thread) return null;

  const c = thread.contact;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.cabinet}`}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h2>Кабинет связи · COMM-TERMINAL</h2>
            <p className={styles.subtitle}>
              {c.displayName} · ~{formatNumber(c.distance, 0)} св. л. · ур. {c.levelMin}–{c.levelMax}{' '}
              ·{' '}
              <span className={`${styles.statusBadge} ${statusClass(thread.status)}`}>
                {statusLabel(thread.status)}
              </span>
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Закрыть
          </button>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Доверие</div>
            <div className={`mono ${styles.metricValue}`}>{thread.trust}</div>
            <div className={styles.barTrack}>
              <div className={styles.barFillTrust} style={{ width: `${thread.trust}%` }} />
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Напряжение</div>
            <div className={`mono ${styles.metricValue}`}>{thread.tension}</div>
            <div className={styles.barTrack}>
              <div className={styles.barFillTension} style={{ width: `${thread.tension}%` }} />
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>В пути</div>
            <div className={`mono ${styles.metricValue}`}>{inTransit.length}</div>
            <div className={styles.metricLabel} style={{ marginTop: '0.35rem' }}>
              SoL delay · lazy catch-up
            </div>
          </div>
        </div>

        <div className={styles.channel}>
          {thread.messages.length === 0 ? (
            <div className="muted">Канал пуст. Выберите карточку протокола.</div>
          ) : (
            thread.messages.map((m) => {
              const isOut = m.senderIsObserver;
              const transit = m.status === 'IN_TRANSIT';
              return (
                <div
                  key={m.id}
                  className={`${styles.msg} ${isOut ? styles.msgOut : styles.msgIn} ${
                    transit ? styles.msgTransit : ''
                  }`}
                >
                  <div className={styles.msgHead}>
                    <span>{isOut ? '→ ИСХОД' : '← ВХОД'}</span>
                    <span className={styles.msgCard}>{m.cardLabel}</span>
                    <span>{m.status}</span>
                    {transit && (
                      <span className={styles.eta}>ETA {formatEta(m.etaSeconds)}</span>
                    )}
                    <span>{new Date(m.sentAt).toLocaleTimeString('ru-RU')}</span>
                  </div>
                  <div className={styles.msgBody}>{m.textFlavor}</div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.tray}>
          <h3 className={styles.trayTitle}>Лоток карточек протокола</h3>
          <label className={styles.encryptRow}>
            <input
              type="checkbox"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
              disabled={thread.status !== 'active'}
            />
            Шифрование канала (+ТМ иконка, ниже signalExposure)
          </label>
          <div className={styles.cards}>
            {thread.availableCards.map((card) => {
              const cost = card.cost;
              const costNode =
                formatCostParts({
                  highEnergy: cost.highEnergy,
                  antimatter: cost.antimatter,
                  darkMatter: encrypt && card.canEncrypt ? Math.max(15, cost.darkMatter || 0) : cost.darkMatter,
                }) || 'бесплатно';
              return (
                <button
                  key={card.type}
                  type="button"
                  className={styles.card}
                  disabled={!card.unlocked || actionLoading || thread.status !== 'active'}
                  title={card.reasons.join('; ') || card.description}
                  onClick={() => void send(card.type, encrypt && card.canEncrypt)}
                >
                  <span className={styles.cardName}>{card.name}</span>
                  <span className={styles.cardDesc}>{card.description}</span>
                  <span className={styles.cardCost}>{costNode}</span>
                  {!card.unlocked && card.reasons[0] && (
                    <span className={styles.cardReasons}>{card.reasons[0]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className={styles.warn}>{error}</p>}
        {thread.status === 'hostile' && (
          <p className={styles.warn}>
            Канал враждебен (объявление войны). Боевые действия — Этап 6.
          </p>
        )}
        <div className={styles.footerRow}>
          <span className="mono muted" style={{ fontSize: '0.7rem' }}>
            thread {thread.id.slice(0, 8)} · server {new Date(thread.serverTime).toLocaleTimeString('ru-RU')}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()} disabled={actionLoading}>
            Обновить канал
          </button>
        </div>
      </div>
    </div>
  );
}
