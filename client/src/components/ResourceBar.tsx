import { RESOURCE_IDS, type ResourceId } from '@shared';
import { formatNumber, formatRate } from '../lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { RESOURCE_LABELS } from '../lib/labels';
import { RESOURCE_TIPS } from '../lib/tooltips';
import { useGameStore } from '../store/gameStore';
import { InfoTip } from './InfoTip';
import { ResourceIcon } from './icons/ResourceIcons';
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
        const tip = RESOURCE_TIPS[id];
        const value = resources[id];
        const cap = resources.capacities[id];
        const isSelected = selected?.kind === 'resource' && selected.id === id;
        const locked = meta.locked && value <= 0;

        return (
          <div
            key={id}
            className={`${styles.item} ${isSelected ? 'selected' : ''} ${locked ? styles.locked : ''}`}
          >
            <button
              type="button"
              className={`${styles.itemBtn} clickable`}
              onClick={() => select({ kind: 'resource', id })}
            >
              <div className={styles.name}>
                <ResourceIcon id={id} />
                <span>{meta.name}</span>
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
            <InfoTip title={tip.title} body={tip.body} links={tip.links} compact label={`Справка: ${meta.name}`} />
          </div>
        );
      })}
    </div>
  );
}
