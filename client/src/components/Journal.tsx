import { formatTime } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import styles from './Journal.module.css';

const TYPE_LABEL: Record<string, string> = {
  system: 'SYS',
  production: 'PROD',
  upgrade: 'UPG',
  level_up: 'LVL',
  expedition: 'EXP',
  discovery: 'DET',
  debug: 'DBG',
  warning: 'WRN',
  artifact: 'ART',
  trap: 'TRP',
  rift: '4D',
  signal: 'SIG',
  boost: 'BST',
  paradox: 'PRX',
  CASUS: '🎭',
  casus: '🎭',
};

export function Journal() {
  const journal = useGameStore((s) => s.state?.journal ?? []);
  const error = useGameStore((s) => s.error);

  return (
    <div className={`glass ${styles.panel}`}>
      <h2 className="panel-title">Технический журнал</h2>
      {error && (
        <div className={styles.liveError} role="alert">
          {error}
        </div>
      )}
      <div className={`scroll-y ${styles.list}`}>
        {journal.length === 0 && (
          <div className={styles.empty}>Нет записей. Ожидание телеметрии…</div>
        )}
        {journal.map((e) => (
          <article key={e.id} className={`${styles.entry} ${e.type === 'CASUS' || e.type === 'casus' ? styles.casus : ''}`} data-type={e.type}>
            <header className={styles.head}>
              <span className={`${styles.badge} mono`}>{TYPE_LABEL[e.type] ?? e.type}</span>
              <span className={`${styles.time} mono`}>
                {formatTime(new Date(e.createdAt).getTime())}
              </span>
              <span className={styles.title}>{e.title || e.type}</span>
            </header>
            <p className={styles.body}>{e.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
