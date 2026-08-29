import {
  ANOMALY_LABELS,
  HABITABILITY_LABELS,
  STAR_LABELS,
} from '../lib/labels';
import { formatCoords } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import styles from './SystemPanel.module.css';
import type { AnomalyType, Habitability, StarType } from '@shared';

export function SystemPanel() {
  const civ = useGameStore((s) => s.state?.civilization);
  const select = useGameStore((s) => s.select);
  const selected = useGameStore((s) => s.selected);
  if (!civ) return null;

  const isSys = selected?.kind === 'system';
  const isPlanet = selected?.kind === 'planet';
  const isCiv = selected?.kind === 'civilization';
  const isGs = selected?.kind === 'great_structure';

  const starLabel = STAR_LABELS[civ.starType as StarType] ?? civ.starType;
  const habLabel = HABITABILITY_LABELS[civ.habitability as Habitability] ?? civ.habitability;
  const anomalyLabel = ANOMALY_LABELS[civ.anomalyType as AnomalyType] ?? civ.anomalyType;

  return (
    <div className={`glass glow-border ${styles.panel}`}>
      <div className={styles.header}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          Локальная система
        </h2>
        <span className="tag tag-danger">Терра Инкогнита вокруг</span>
      </div>

      <button
        type="button"
        className={`${styles.hero} clickable ${isCiv ? 'selected' : ''}`}
        onClick={() => select({ kind: 'civilization' })}
      >
        <div className={styles.civName}>{civ.name}</div>
        <div className={styles.meta}>
          Уровень <strong>{civ.level}</strong>
          <span className="muted"> · </span>
          Процветание <strong className="mono">{civ.prosperityScore}</strong>
        </div>
        <div className={`${styles.seed} mono muted`}>seed: {civ.seed}</div>
      </button>

      <div className={styles.grid}>
        <button
          type="button"
          className={`${styles.card} clickable ${isGs ? 'selected' : ''}`}
          onClick={() => select({ kind: 'great_structure' })}
        >
          <div className={styles.label}>Великая структура</div>
          <div className={styles.val}>{civ.greatStructureName}</div>
        </button>
        <button
          type="button"
          className={`${styles.card} clickable ${isSys ? 'selected' : ''}`}
          onClick={() => select({ kind: 'system' })}
        >
          <div className={styles.label}>Система</div>
          <div className={styles.val}>{civ.systemName}</div>
          <div className="muted mono" style={{ fontSize: '0.75rem' }}>
            {starLabel}
          </div>
        </button>
        <button
          type="button"
          className={`${styles.card} clickable ${isPlanet ? 'selected' : ''}`}
          onClick={() => select({ kind: 'planet' })}
        >
          <div className={styles.label}>Основная планета</div>
          <div className={styles.val}>{civ.mainPlanetName}</div>
          <div className="muted" style={{ fontSize: '0.75rem' }}>
            {civ.mainPlanetType} · {habLabel}
          </div>
        </button>
        <div className={styles.card}>
          <div className={styles.label}>Галактика / сектор</div>
          <div className={styles.val}>
            {civ.galaxyName}
            <span className="muted"> / </span>
            {civ.sectorName}
          </div>
          <div className="muted mono" style={{ fontSize: '0.75rem' }}>
            {formatCoords(civ.coordinates)}
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div>
          <span className={styles.label}>Аномалия</span>
          <div>{anomalyLabel}</div>
        </div>
        <div>
          <span className={styles.label}>Радар/Локация</span>
          <div className="mono" style={{ color: 'var(--cyan)' }}>
            {civ.radarQuality}
          </div>
        </div>
        <div>
          <span className={styles.label}>Стаб. вакуума</span>
          <div className="mono">{civ.vacuumStability}</div>
        </div>
        <div>
          <span className={styles.label}>Плотн. ТМ</span>
          <div className="mono">{civ.darkMatterDensity}</div>
        </div>
        <div>
          <span className={styles.label}>Фон. излучение</span>
          <div className="mono">{civ.backgroundRadiation}</div>
        </div>
        <div>
          <span className={styles.label}>P(событий)</span>
          <div className="mono">{civ.eventProbability}</div>
        </div>
      </div>
    </div>
  );
}
