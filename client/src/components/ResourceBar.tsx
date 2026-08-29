import { RESOURCE_IDS, type ResourceId } from '@shared';
import { formatNumber, formatRate } from '../lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { RESOURCE_LABELS } from '../lib/labels';
import { useGameStore } from '../store/gameStore';
import styles from './ResourceBar.module.css';

export function ResourceBar() {
  const resources = useGameStore((s) => s.state?.resources);
  const hePerSec = useGameStore((s) => s.state?.production.highEnergyPerSec ?? 0);
  const dePerSec = useGameStore((s) => s.state?.production.darkEnergyPerSec ?? 0);
  const select = useGameStore((s) => s.select);
  const selected = useGameStore((s) => s.selected);

  if (!resources) return null;

  return (
    <div className={`glass ${styles.bar}`}>
      {RESOURCE_IDS.map((id: ResourceId) => {
        const meta = RESOURCE_LABELS[id];
        const value = resources[id];
        const cap = resources.capacities[id];
        const isSelected = selected?.kind === 'resource' && selected.id === id;
        const locked = meta.locked && value <= 0;

        return (
          <button
            key={id}
            type="button"
            className={`${styles.item} clickable ${isSelected ? 'selected' : ''} ${locked ? styles.locked : ''}`}
            onClick={() => select({ kind: 'resource', id })}
            title={`${meta.desc}\nСейчас: ${formatNumber(value)} / ${formatNumber(cap, 0)}${
                id === 'highEnergy' ? `\nПроизводство: ${formatRate(hePerSec)}` : ''
              }${id === 'darkEnergy' && dePerSec > 0 ? `\nПроизводство: ${formatRate(dePerSec)}` : ''}`}
          >
            <div className={styles.name}>
              {meta.name}
              {locked && <span className="tag">блок</span>}
            </div>
            <div className={styles.value}>
              <span className="mono"><AnimatedNumber value={value} digits={value >= 100 ? 0 : 1} /></span>
              <span className={styles.cap}>/ {formatNumber(cap, 0)}</span>
            </div>
            {id === 'highEnergy' && (
              <div className={styles.rate}>{formatRate(hePerSec)}</div>
            )}
            {id === 'darkEnergy' && dePerSec > 0 && (
              <div className={styles.rate}>{formatRate(dePerSec)}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
