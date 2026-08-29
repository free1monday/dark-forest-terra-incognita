import { GAME_SLOGAN, GAME_TITLE } from '@shared';
import styles from './Slogan.module.css';

export function Slogan({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      {!compact && <div className={styles.title}>{GAME_TITLE}</div>}
      <div className={styles.slogan}>{GAME_SLOGAN}</div>
    </div>
  );
}
