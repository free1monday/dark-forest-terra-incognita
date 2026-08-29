import { useGameStore } from '../store/gameStore';
import styles from './AnomaliesPanel.module.css';

const TYPE_CLASS: Record<string, string> = {
  asteroid_belt: styles.belt,
  dark_cloud: styles.cloud,
  wormhole: styles.worm,
  neutron_star: styles.neutron,
  black_hole: styles.bh,
  relic_radiation: styles.relic,
  gravitational_lens: styles.lens,
  unstable_vacuum: styles.vac,
  rift_4d: styles.rift,
};

export function AnomaliesPanel() {
  const anomalies = useGameStore((s) => s.state?.discoveredAnomalies ?? []);
  const select = useGameStore((s) => s.select);
  const selected = useGameStore((s) => s.selected);

  return (
    <div className={`glass ${styles.panel}`}>
      <h2 className="panel-title">Обнаруженные объекты</h2>
      {anomalies.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
          Карта разведки пуста. Исследуйте Терру Инкогниту.
        </p>
      ) : (
        <div className={`scroll-y ${styles.list}`}>
          {anomalies.map((a) => {
            const isSel = selected?.kind === 'anomaly' && selected.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.item} clickable ${isSel ? 'selected' : ''} ${TYPE_CLASS[a.anomalyType] ?? ''}`}
                onClick={() => select({ kind: 'anomaly', id: a.id })}
              >
                <div className={styles.name}>{a.name}</div>
                <div className={styles.sub}>
                  <span className="mono">{a.sectorSeed}</span>
                  <span className="muted"> · </span>
                  {a.anomalyType}
                </div>
                <div className={styles.desc}>{a.description}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
