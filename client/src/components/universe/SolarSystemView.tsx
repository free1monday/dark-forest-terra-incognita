import { useEffect, useState } from 'react';
import type { GamePlanet, GameSolarSystem } from '@shared';
import { apiFetch } from '../../api/client';
import { PlanetView } from './PlanetView';
import styles from './SolarSystemView.module.css';

export function SolarSystemView({
  open,
  onClose,
  onColonized,
}: {
  open: boolean;
  onClose: () => void;
  onColonized?: () => void;
}) {
  const [system, setSystem] = useState<GameSolarSystem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [planet, setPlanet] = useState<GamePlanet | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void apiFetch<{ system: GameSolarSystem }>('/api/universe/solar-system/home')
      .then((r) => setSystem(r.system))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const maxOrbit = Math.max(...(system?.planets.map((p) => p.orbitRadius) ?? [1]), 1);

  return (
    <div className={styles.overlay} role="dialog" aria-modal>
      <div className={styles.panel}>
        <header className={styles.head}>
          <div>
            <h2 className={styles.title}>Солнечная система</h2>
            {system && (
              <div className="muted mono" style={{ fontSize: '0.78rem' }}>
                {system.name} · {system.star.classLabel} · T={system.star.temperature}K · M=
                {system.star.mass}M☉
              </div>
            )}
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        </header>
        {error && <div className={styles.err}>{error}</div>}
        {loading && <div className="muted">Загрузка системы…</div>}
        {system && (
          <div className={styles.stage}>
            <div
              className={styles.star}
              style={{
                background: `radial-gradient(circle at 35% 35%, #fff, ${system.star.color} 45%, transparent 70%)`,
                boxShadow: `0 0 40px ${system.star.color}`,
              }}
              title={system.star.classLabel}
            />
            {system.planets.map((p) => {
              const r = 18 + (p.orbitRadius / maxOrbit) * 38;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={styles.orbitBtn}
                  style={{
                    width: `${r * 2}%`,
                    height: `${r * 2}%`,
                    marginLeft: `${-r}%`,
                    marginTop: `${-r}%`,
                    animationDuration: `${12 + p.indexInSystem * 4}s`,
                  }}
                  title={p.name}
                  onClick={() => setPlanet(p)}
                >
                  <span
                    className={styles.planetDot}
                    style={{
                      background: `hsl(${p.hue} 60% 55%)`,
                      boxShadow: p.isHomeworld ? '0 0 10px #facc15' : undefined,
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}
        {system && (
          <div className={styles.list}>
            {system.planets.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.row}
                onClick={() => setPlanet(p)}
              >
                <span
                  className={styles.swatch}
                  style={{ background: `hsl(${p.hue} 55% 45%)` }}
                />
                <span>
                  <strong>{p.name}</strong>
                  <div className="muted" style={{ fontSize: '0.72rem' }}>
                    {p.typeLabel}
                    {p.isHomeworld ? ' · дом' : p.colonized ? ' · колония' : ''}
                  </div>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {planet && (
        <PlanetView
          planet={planet}
          colonizing={busy}
          onClose={() => setPlanet(null)}
          onColonize={async () => {
            setBusy(true);
            try {
              await apiFetch('/api/civilizations/current/colonize-planet', {
                method: 'POST',
                body: JSON.stringify({ planetId: planet.id }),
              });
              setPlanet(null);
              const r = await apiFetch<{ system: GameSolarSystem }>(
                '/api/universe/solar-system/home'
              );
              setSystem(r.system);
              onColonized?.();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Ошибка колонизации');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
