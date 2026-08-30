import {
  formatPopulation,
  POLITICAL_REGIME_IDS,
  POLITICAL_REGIME_LABELS_RU,
  SPECIES_BONUSES,
  REGIME_BONUSES,
  type PoliticalRegimeId,
  type SpeciesId,
} from '@shared';
import { useGameStore } from '../../store/gameStore';
import { apiFetch } from '../../api/client';
import { useState } from 'react';
import styles from './CivilizationProfile.module.css';

export function CivilizationProfile({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const civ = useGameStore((s) => s.state?.civilization);
  const applyState = useGameStore((s) => s.applyState);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open || !civ) return null;

  const species = (civ.species ?? 'HUMAN') as SpeciesId;
  const regime = (civ.politicalRegime ?? 'DEMOCRACY') as PoliticalRegimeId;
  const sb = SPECIES_BONUSES[species];
  const rb = REGIME_BONUSES[regime];

  return (
    <div className={styles.overlay} role="dialog" aria-modal onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2 className={styles.title}>{civ.name}</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.label}>Раса</div>
            <div className={styles.value}>{civ.speciesLabel ?? species}</div>
            <div className="muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
              {sb?.descriptionRu}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Форма правления</div>
            <div className={styles.value}>{civ.governmentFormLabel ?? civ.governmentForm}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Политический режим</div>
            <div className={styles.value}>{civ.politicalRegimeLabel ?? regime}</div>
            <div className="muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
              {rb?.descriptionRu}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Население</div>
            <div className={`${styles.value} mono`}>{formatPopulation(civ.population ?? 0)}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Колонии</div>
            <div className={`${styles.value} mono`}>{civ.colonies ?? 1}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Уровень / процветание</div>
            <div className={`${styles.value} mono`}>
              {civ.level} · ★ {civ.prosperityScore}
            </div>
          </div>
        </div>

        <div className={styles.regime}>
          <div className={styles.label}>Сменить режим (Парламент · узел исследований 5+)</div>
          <div className={styles.regimeRow}>
            {POLITICAL_REGIME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`btn btn-sm ${id === regime ? 'btn-premium' : ''}`}
                disabled={busy || id === regime}
                onClick={() => {
                  setBusy(true);
                  setErr(null);
                  void apiFetch<{ state: unknown }>('/api/civilizations/current/change-regime', {
                    method: 'POST',
                    body: JSON.stringify({ regime: id }),
                  })
                    .then((r) => {
                      applyState(r.state as never);
                    })
                    .catch((e) => setErr(e instanceof Error ? e.message : 'Ошибка'))
                    .finally(() => setBusy(false));
                }}
              >
                {POLITICAL_REGIME_LABELS_RU[id]}
              </button>
            ))}
          </div>
          {err && <div className={styles.err}>{err}</div>}
        </div>
      </div>
    </div>
  );
}
