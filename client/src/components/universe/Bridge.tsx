import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BridgeBackground } from './BridgeBackground';
import styles from './Bridge.module.css';

/** Full-screen Bridge (рубка) — diplomacy hub with animated cosmos. */
export function Bridge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contacts = useGameStore((s) => s.state?.contacts) ?? [];
  const openDiplomacy = useGameStore((s) => s.openDiplomacy);
  const diplomacyOpen = useGameStore((s) => s.diplomacyOpen);
  const combatOpen = useGameStore((s) => s.combatPanelOpen);
  const thread = useGameStore((s) => s.diplomacyThread);

  const mode = useMemo(() => {
    if (combatOpen) return 'combat' as const;
    if (diplomacyOpen || thread) return 'diplomacy' as const;
    return 'neutral' as const;
  }, [combatOpen, diplomacyOpen, thread]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label="Рубка">
      <BridgeBackground mode={mode} />
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Рубка</h2>
            <div className="muted" style={{ fontSize: '0.78rem' }}>
              Дипломатические каналы · SoL delay · асинхронные протоколы
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Покинуть рубку
          </button>
        </header>

        <div className={styles.grid}>
          <aside className={styles.left}>
            <div className={styles.sectionTitle}>Контакты</div>
            <div className={styles.list}>
              {contacts.length === 0 && (
                <div className="muted" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                  Нет обнаруженных сигналов. Запустите экспедицию.
                </div>
              )}
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.contact}
                  onClick={() => void openDiplomacy(c.id)}
                >
                  <div className={styles.contactName}>{c.displayName}</div>
                  <div className={`mono muted ${styles.meta}`}>
                    d≈{c.distance.toFixed?.(1) ?? c.distance} · conf{' '}
                    {(c.confidence * 100).toFixed(0)}%
                    {c.threadId ? ' · канал' : ''}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className={styles.center}>
            <div className={styles.placeholder}>
              <div className={styles.scan} />
              {diplomacyOpen || thread ? (
                <>
                  <p>Канал открыт. Дипломатическая панель поверх рубки.</p>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    {thread
                      ? `${thread.contact.displayName} · доверие ${thread.trust} · напряжение ${thread.tension}`
                      : 'Идёт синхронизация…'}
                  </p>
                </>
              ) : (
                <>
                  <p>Выберите контакт слева, чтобы открыть дипломатический канал.</p>
                  <p className="muted" style={{ fontSize: '0.8rem' }}>
                    Фон: открытый космос. Режим:{' '}
                    {mode === 'combat' ? 'боевой' : mode === 'diplomacy' ? 'дипломатия' : 'наблюдение'}.
                  </p>
                </>
              )}
            </div>
          </main>

          <aside className={styles.right}>
            <div className={styles.sectionTitle}>Канал</div>
            {thread ? (
              <div className={styles.detail}>
                <div>
                  <span className="muted">Контакт</span>
                  <div>{thread.contact.displayName}</div>
                </div>
                <div>
                  <span className="muted">Уровень (оценка)</span>
                  <div className="mono">
                    {thread.contact.levelMin}–{thread.contact.levelMax}
                  </div>
                </div>
                <div>
                  <span className="muted">Дистанция</span>
                  <div className="mono">{thread.contact.distance.toFixed?.(2) ?? thread.contact.distance}</div>
                </div>
                <div>
                  <span className="muted">Точность координат</span>
                  <div className="mono">{(thread.contact.coordinatesAccuracy * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <span className="muted">Доверие / Напряжение</span>
                  <div className="mono">
                    {thread.trust} / {thread.tension}
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Нет активного треда.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
