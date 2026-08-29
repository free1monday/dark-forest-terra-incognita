import { FOCUS_KEYS } from '@shared';
import { FOCUS_LABELS } from '../lib/labels';
import { useGameStore } from '../store/gameStore';
import styles from './ConstantsPanel.module.css';

export function ConstantsPanel() {
  const constants = useGameStore((s) => s.state?.civilization.constants);
  if (!constants) return null;

  return (
    <div className={`glass ${styles.panel}`}>
      <h2 className="panel-title">Константы цивилизации</h2>
      <div className={styles.list}>
        {FOCUS_KEYS.map((key) => {
          const v = constants[key];
          return (
            <div key={key} className={styles.row} title={FOCUS_LABELS[key].desc}>
              <div className={styles.label}>{FOCUS_LABELS[key].name}</div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${v}%` }} />
              </div>
              <div className={`${styles.val} mono`}>{v}</div>
            </div>
          );
        })}
      </div>
      <p className={styles.note}>
        Константы заданы при основании. Источник истины — сервер.
      </p>
    </div>
  );
}
