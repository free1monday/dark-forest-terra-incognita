import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './UniverseMap.module.css';

type MapPayload = {
  worldSeed: string;
  level: number;
  walls: Array<{ id: string; name: string; points: Array<{ x: number; y: number }> }>;
  voids: Array<{ id: string; name: string; x: number; y: number; radius: number }>;
  superclusters: Array<{
    id: string;
    name: string;
    wallId: string;
    x: number;
    y: number;
    galaxies: Array<{ id: string; name: string; x: number; y: number; size: number; hue: number; morph: string }>;
  }>;
  specials: Array<{ id: string; kind: string; name: string; x: number; y: number; note: string }>;
  systems: Array<{ id: string; name: string; x: number; y: number; isPlayer: boolean; hasContact?: boolean }>;
  player: {
    wallHint: string;
    superclusterHint: string;
    galaxyName: string;
    systemName: string;
    coordinates: { x: number; y: number; z: number };
  };
};

export function UniverseMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<MapPayload | null>(null);
  const [level, setLevel] = useState(0);
  const [focusSc, setFocusSc] = useState<string | undefined>();
  const [focusGal, setFocusGal] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dustRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set('level', String(level));
      if (focusSc) q.set('superclusterId', focusSc);
      if (focusGal) q.set('galaxyId', focusGal);
      const res = await apiFetch<{ map: MapPayload }>(`/api/universe/map?${q}`);
      setMap(res.map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка карты');
    } finally {
      setLoading(false);
    }
  }, [level, focusSc, focusGal]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // draw
  useEffect(() => {
    if (!open || !map) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let alive = true;

    const resize = () => {
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const toScreen = (x: number, y: number, w: number, h: number) => {
      const z = zoomRef.current;
      const px = w / 2 + (x + panRef.current.x) * (w * 0.42) * z;
      const py = h / 2 + (y + panRef.current.y) * (h * 0.42) * z;
      return { px, py };
    };

    const draw = (t: number) => {
      if (!alive) return;
      dustRef.current = t;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // dust
      ctx.fillStyle = 'rgba(148,163,184,0.35)';
      for (let i = 0; i < 80; i++) {
        const dx = ((i * 97 + t * 0.01) % w);
        const dy = ((i * 53 + t * 0.006) % h);
        ctx.globalAlpha = 0.15 + (i % 5) * 0.05;
        ctx.fillRect(dx, dy, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;

      // voids
      for (const v of map.voids) {
        const { px, py } = toScreen(v.x, v.y, w, h);
        const r = v.radius * Math.min(w, h) * 0.35 * zoomRef.current;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(2,6,23,0.95)');
        g.addColorStop(1, 'rgba(2,6,23,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // walls
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(125,211,252,0.35)';
      for (const wall of map.walls) {
        ctx.beginPath();
        wall.points.forEach((pt, i) => {
          const { px, py } = toScreen(pt.x, pt.y, w, h);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // specials
      for (const s of map.specials) {
        const { px, py } = toScreen(s.x, s.y, w, h);
        ctx.beginPath();
        ctx.fillStyle = s.kind === 'quasar' ? '#fde68a' : '#c4b5fd';
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 0.004 + s.x * 5);
        ctx.arc(px, py, s.kind === 'quasar' ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
        // accretion ring
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = s.kind === 'quasar' ? '#fbbf24' : '#a78bfa';
        ctx.beginPath();
        ctx.ellipse(px, py, 10, 4, t * 0.0005, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // superclusters / galaxies
      if (level <= 1) {
        for (const sc of map.superclusters) {
          const { px, py } = toScreen(sc.x, sc.y, w, h);
          ctx.fillStyle = 'rgba(165,180,252,0.85)';
          ctx.beginPath();
          ctx.arc(px, py, 4 + zoomRef.current, 0, Math.PI * 2);
          ctx.fill();
          if (zoomRef.current > 0.9) {
            ctx.fillStyle = 'rgba(226,232,240,0.7)';
            ctx.font = '11px ui-sans-serif, system-ui';
            ctx.fillText(sc.name, px + 8, py + 3);
          }
        }
      }

      if (level >= 2) {
        const gals = focusSc
          ? map.superclusters.find((s) => s.id === focusSc)?.galaxies ?? []
          : map.superclusters.flatMap((s) => s.galaxies).slice(0, 40);
        for (const g of gals) {
          const { px, py } = toScreen(g.x * 0.5 + (focusSc ? 0 : g.x * 0.1), g.y * 0.5, w, h);
          ctx.fillStyle = `hsla(${g.hue},70%,65%,0.85)`;
          ctx.beginPath();
          ctx.ellipse(px, py, 6 * g.size, 3 * g.size, t * 0.0002, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (level >= 3 || map.systems.length) {
        for (const s of map.systems) {
          const { px, py } = toScreen(s.x, s.y, w, h);
          if (s.isPlayer) {
            const pulse = 6 + Math.sin(t * 0.006) * 3;
            ctx.strokeStyle = 'rgba(250,204,21,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#facc15';
          } else if (s.hasContact) {
            ctx.fillStyle = '#34d399';
          } else {
            ctx.fillStyle = '#94a3b8';
          }
          ctx.beginPath();
          ctx.arc(px, py, s.isPlayer ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // minimap
      const mw = 120;
      const mh = 80;
      const mx = w - mw - 16;
      const my = h - mh - 16;
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 1;
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeRect(mx, my, mw, mh);
      for (const sc of map.superclusters.slice(0, 24)) {
        ctx.fillStyle = '#a5b4fc';
        ctx.fillRect(mx + (sc.x + 1) * 0.5 * mw - 1, my + (sc.y + 1) * 0.5 * mh - 1, 2, 2);
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mx + mw * 0.5, my + mh * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(3.5, Math.max(0.5, zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [open, map, level, focusSc]);

  const breadcrumb = useMemo(() => {
    if (!map) return '';
    return [
      map.player.wallHint,
      map.player.superclusterHint,
      map.player.galaxyName,
      map.player.systemName,
    ].join(' · ');
  }, [map]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Карта Вселенной">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Карта Вселенной</h2>
            <div className={`muted mono ${styles.crumb}`}>{breadcrumb || '…'}</div>
          </div>
          <div className={styles.controls}>
            {[0, 1, 2, 3].map((lv) => (
              <button
                key={lv}
                type="button"
                className={`btn btn-sm ${level === lv ? 'btn-premium' : 'btn-ghost'}`}
                onClick={() => {
                  setLevel(lv);
                  if (lv < 1) setFocusSc(undefined);
                  if (lv < 2) setFocusGal(undefined);
                  if (lv >= 3 && map?.superclusters[0]?.galaxies[0]) {
                    setFocusGal(map.superclusters[0]!.galaxies[0]!.id);
                  }
                }}
              >
                L{lv}
              </button>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
              Обновить
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </header>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} />
          {loading && <div className={styles.loading}>Сканирование…</div>}
        </div>
        <footer className={styles.footer}>
          <span className="muted">
            Колесо — зум · L0 стены/войды · L1 сверхскопления · L2 галактики · L3 системы
          </span>
          {hover && <span className="mono">{hover}</span>}
          {map && (
            <span className="mono muted">
              xyz {map.player.coordinates.x},{map.player.coordinates.y},{map.player.coordinates.z}
            </span>
          )}
        </footer>
        {level >= 1 && map && (
          <div className={styles.side}>
            <div className={styles.sideTitle}>Сверхскопления</div>
            <div className={styles.sideList}>
              {map.superclusters.slice(0, 16).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={styles.sideItem}
                  onMouseEnter={() => setHover(sc.name)}
                  onClick={() => {
                    setFocusSc(sc.id);
                    setLevel(2);
                  }}
                >
                  {sc.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
