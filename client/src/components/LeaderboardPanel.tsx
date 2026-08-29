import { useEffect, useState } from 'react';
import { formatNumber } from '../lib/format';
import * as gameApi from '../api/game';
import type { LeaderboardEntryDto } from '../api/game';
import { useGameStore } from '../store/gameStore';
import styles from './LeaderboardPanel.module.css';

function rankClass(rank: number): string {
  if (rank === 1) return styles.rank1;
  if (rank === 2) return styles.rank2;
  if (rank === 3) return styles.rank3;
  return '';
}

function rankLabel(rank: number): string {
  if (rank === 1) return '①';
  if (rank === 2) return '②';
  if (rank === 3) return '③';
  return String(rank);
}

export function LeaderboardPanel() {
  const open = useGameStore((s) => s.leaderboardOpen);
  const close = useGameStore((s) => s.closeLeaderboard);
  const prosperity = useGameStore((s) => s.state?.civilization.prosperityScore);
  const [entries, setEntries] = useState<LeaderboardEntryDto[]>([]);
  const [current, setCurrent] = useState<LeaderboardEntryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void gameApi
      .getLeaderboard()
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setCurrent(res.current);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.panel}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Рейтинг процветания</h2>
            <p className={styles.sub}>
              Топ-50 цивилизаций (игроки + синтетические архивы). Метрика: prosperityScore.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Закрыть
          </button>
        </div>

        {current && (
          <div className={styles.currentBox}>
            Ваша позиция: <strong className="mono">#{current.rank}</strong> · {current.name} · ур.{' '}
            {current.level} · процветание{' '}
            <span className="mono">{formatNumber(current.prosperityScore, 0)}</span>
            {prosperity != null && prosperity !== current.prosperityScore && (
              <span className="muted"> (state {formatNumber(prosperity, 0)})</span>
            )}
          </div>
        )}

        <div className={styles.tableWrap}>
          {loading ? (
            <p className="muted" style={{ padding: '1rem' }}>
              Загрузка рейтинга…
            </p>
          ) : error ? (
            <p className="muted" style={{ padding: '1rem', color: 'var(--warn)' }}>
              {error}
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ранг</th>
                  <th>Имя</th>
                  <th>Ур.</th>
                  <th>Процветание</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className={`${e.isCurrent ? styles.rowCurrent : ''} ${
                      e.status === 'destroyed' ? styles.rowDestroyed : ''
                    }`}
                  >
                    <td className={rankClass(e.rank)}>{rankLabel(e.rank)}</td>
                    <td>
                      {e.name}
                      {e.isBot && <span className={styles.bot}>bot</span>}
                      {e.isCurrent && <span className={styles.bot}>вы</span>}
                    </td>
                    <td>{e.level}</td>
                    <td>{formatNumber(e.prosperityScore, 0)}</td>
                    <td>{e.status === 'destroyed' ? 'Уничтожен' : 'Активен'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.footer}>
          <span>Обновляется при открытии · боты детерминированы seed</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setLoading(true);
              void gameApi.getLeaderboard().then((res) => {
                setEntries(res.entries);
                setCurrent(res.current);
                setLoading(false);
              });
            }}
          >
            Обновить
          </button>
        </div>
      </div>
    </div>
  );
}
