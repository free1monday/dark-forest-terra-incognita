import { useEffect, useRef } from 'react';
import type { GamePlanet } from '@shared';
import styles from './PlanetView.module.css';

export function PlanetView({
  planet,
  onClose,
  onColonize,
  colonizing,
}: {
  planet: GamePlanet;
  onClose: () => void;
  onColonize?: () => void;
  colonizing?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let alive = true;
    const size = 220;
    canvas.width = size;
    canvas.height = size;

    const draw = (t: number) => {
      if (!alive) return;
      ctx.clearRect(0, 0, size, size);
      // star glow
      const sg = ctx.createRadialGradient(40, 40, 0, 40, 40, 80);
      sg.addColorStop(0, 'rgba(255,240,200,0.35)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const r = 70;
      const rot = t * 0.0004;

      // planet body
      const g = ctx.createRadialGradient(cx - 20, cy - 25, 10, cx, cy, r);
      g.addColorStop(0, `hsla(${planet.hue}, 55%, 55%, 1)`);
      g.addColorStop(0.55, `hsla(${(planet.hue + 40) % 360}, 45%, 35%, 1)`);
      g.addColorStop(1, `hsla(${planet.hue}, 40%, 12%, 1)`);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // cloud bands
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `hsla(${planet.hue + i * 20}, 30%, 80%, 0.5)`;
        const y = cy - 50 + ((i * 28 + rot * 40) % 120);
        ctx.fillRect(cx - r, y, r * 2, 10);
      }
      ctx.restore();

      // terminator
      const shade = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
      shade.addColorStop(0, 'rgba(0,0,0,0.55)');
      shade.addColorStop(0.45, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = shade;
      ctx.fill();

      // moons
      for (let m = 0; m < Math.min(planet.moons, 4); m++) {
        const ang = rot * (1.2 + m * 0.3) + m;
        const mr = r + 18 + m * 10;
        const mx = cx + Math.cos(ang) * mr;
        const my = cy + Math.sin(ang) * mr * 0.55;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(mx, my, 2 + (m % 2), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [planet]);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h3>{planet.name}</h3>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.body}>
          <canvas ref={ref} className={styles.sphere} />
          <div className={styles.stats}>
            <Row k="Тип" v={planet.typeLabel} />
            <Row k="Атмосфера" v={planet.atmosphereLabel} />
            <Row k="Гравитация" v={planet.gravityLabel} />
            <Row k="Спутники" v={String(planet.moons)} />
            <Row k="Пыль" v={planet.cosmicDust} />
            <Row k="Радиация" v={planet.radiation} />
            <Row k="День / ночь" v={`${planet.temperatureDay}°C / ${planet.temperatureNight}°C`} />
            <Row
              k="Статус"
              v={
                planet.isHomeworld
                  ? 'Родной мир'
                  : planet.colonized
                    ? 'Колония'
                    : 'Не колонизирована'
              }
            />
            <div className={styles.res}>
              {Object.entries(planet.resources).map(([k, v]) => (
                <span key={k} className="tag">
                  {k}: {v}
                </span>
              ))}
            </div>
            {!planet.colonized && !planet.isHomeworld && (
              <div className={styles.actions}>
                {planet.canColonize ? (
                  <button
                    type="button"
                    className="btn btn-premium"
                    disabled={colonizing}
                    onClick={() => onColonize?.()}
                  >
                    Колонизировать
                  </button>
                ) : (
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {planet.colonizeReasons.join(' · ') || 'Недоступно'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.row}>
      <span className="muted">{k}</span>
      <strong>{v}</strong>
    </div>
  );
}
