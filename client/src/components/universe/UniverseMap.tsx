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
    galaxies: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      size: number;
      hue: number;
      morph: string;
    }>;
  }>;
  specials: Array<{ id: string; kind: string; name: string; x: number; y: number; note: string }>;
  systems: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    isPlayer: boolean;
    hasContact?: boolean;
  }>;
  player: {
    wallHint: string;
    superclusterHint: string;
    galaxyName: string;
    systemName: string;
    coordinates: { x: number; y: number; z: number };
  };
};

const LEVEL_NAMES = ['Вселенная', 'Сверхскопления', 'Галактики', 'Системы'] as const;

export function UniverseMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<MapPayload | null>(null);
  const [level, setLevel] = useState(0);
  const [focusSc, setFocusSc] = useState<string | undefined>();
  const [focusGal, setFocusGal] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [autoSpin, setAutoSpin] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; rot: number; panX: number; panY: number } | null>(
    null
  );

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
      if (e.key === 'Escape') {
        if (helpOpen) setHelpOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, helpOpen]);

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
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rotXY = (x: number, y: number) => {
      const a = rotRef.current;
      const c = Math.cos(a);
      const s = Math.sin(a);
      return { x: x * c - y * s, y: x * s + y * c };
    };

    const toScreen = (x: number, y: number, w: number, h: number) => {
      const rr = rotXY(x + panRef.current.x, y + panRef.current.y);
      const z = zoomRef.current;
      return {
        px: w / 2 + rr.x * (w * 0.42) * z,
        py: h / 2 + rr.y * (h * 0.42) * z,
      };
    };

    const drawNebula = (t: number, w: number, h: number) => {
      const spots = [
        { x: 0.22, y: 0.3, r: 0.35, c: 'rgba(99,102,241,0.14)' },
        { x: 0.72, y: 0.55, r: 0.4, c: 'rgba(14,165,233,0.1)' },
        { x: 0.5, y: 0.2, r: 0.28, c: 'rgba(168,85,247,0.09)' },
      ];
      for (const n of spots) {
        const ox = Math.sin(t * 0.00007 + n.x * 10) * 18;
        const oy = Math.cos(t * 0.00005 + n.y * 8) * 14;
        const g = ctx.createRadialGradient(
          w * n.x + ox,
          h * n.y + oy,
          0,
          w * n.x + ox,
          h * n.y + oy,
          Math.max(w, h) * n.r
        );
        g.addColorStop(0, n.c);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const drawSpiralGalaxy = (
      px: number,
      py: number,
      size: number,
      hue: number,
      t: number,
      morph: string
    ) => {
      const arms = morph === 'ELLIPTICAL' ? 0 : morph === 'IRREGULAR' ? 1 : 2;
      const rot = t * 0.00025 + hue;
      if (arms === 0) {
        const g = ctx.createRadialGradient(px, py, 0, px, py, 10 * size);
        g.addColorStop(0, `hsla(${hue},70%,75%,0.95)`);
        g.addColorStop(0.5, `hsla(${hue},60%,45%,0.5)`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(px, py, 9 * size, 6 * size, rot, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      for (let a = 0; a < arms; a++) {
        ctx.beginPath();
        for (let i = 0; i < 28; i++) {
          const ang = rot + a * Math.PI + i * 0.22;
          const rad = (2 + i * 0.35) * size;
          const x = px + Math.cos(ang) * rad;
          const y = py + Math.sin(ang) * rad * 0.55;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue},75%,65%,0.55)`;
        ctx.lineWidth = 1.6 * size;
        ctx.stroke();
      }
      const core = ctx.createRadialGradient(px, py, 0, px, py, 5 * size);
      core.addColorStop(0, '#fff');
      core.addColorStop(0.4, `hsla(${hue},80%,70%,0.9)`);
      core.addColorStop(1, 'transparent');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(px, py, 5 * size, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (t: number) => {
      if (!alive) return;
      if (autoSpin && !dragRef.current) {
        rotRef.current += 0.00035;
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      bg.addColorStop(0, '#0b1229');
      bg.addColorStop(0.55, '#050a18');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      drawNebula(t, w, h);

      // parallax dust (cap ~180)
      ctx.fillStyle = '#e2e8f0';
      for (let i = 0; i < 180; i++) {
        const layer = (i % 3) + 1;
        const dx = ((i * 97 + t * 0.008 * layer + rotRef.current * 40 * layer) % (w + 40)) - 20;
        const dy = ((i * 53 + t * 0.005 * layer) % (h + 40)) - 20;
        ctx.globalAlpha = 0.12 + layer * 0.08 + 0.08 * Math.sin(t * 0.003 + i);
        ctx.fillRect(dx, dy, layer === 3 ? 1.6 : 1.1, layer === 3 ? 1.6 : 1.1);
      }
      ctx.globalAlpha = 1;

      for (const v of map.voids) {
        const { px, py } = toScreen(v.x, v.y, w, h);
        const r = v.radius * Math.min(w, h) * 0.35 * zoomRef.current;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(2,6,23,0.92)');
        g.addColorStop(0.7, 'rgba(15,23,42,0.35)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (zoomRef.current > 0.85) {
          ctx.fillStyle = 'rgba(148,163,184,0.45)';
          ctx.font = '10px ui-sans-serif, system-ui';
          ctx.fillText(v.name, px - 20, py);
        }
      }

      ctx.lineWidth = 2;
      for (const wall of map.walls) {
        ctx.beginPath();
        wall.points.forEach((pt, i) => {
          const { px, py } = toScreen(pt.x, pt.y, w, h);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = 'rgba(125,211,252,0.28)';
        ctx.stroke();
        ctx.strokeStyle = 'rgba(186,230,253,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.lineWidth = 2;
      }

      for (const s of map.specials) {
        const { px, py } = toScreen(s.x, s.y, w, h);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.004 + s.x * 5);
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 16);
        glow.addColorStop(
          0,
          s.kind === 'quasar' ? `rgba(253,224,71,${0.35 + pulse * 0.25})` : `rgba(196,181,253,${0.3 + pulse * 0.2})`
        );
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = s.kind === 'quasar' ? '#fde68a' : '#c4b5fd';
        ctx.beginPath();
        ctx.arc(px, py, s.kind === 'quasar' ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = s.kind === 'quasar' ? 'rgba(251,191,36,0.55)' : 'rgba(167,139,250,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(px, py, 12, 4.5, t * 0.0008 + s.x, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (level <= 1) {
        for (const sc of map.superclusters) {
          const { px, py } = toScreen(sc.x, sc.y, w, h);
          const g = ctx.createRadialGradient(px, py, 0, px, py, 8);
          g.addColorStop(0, 'rgba(224,231,255,0.95)');
          g.addColorStop(1, 'rgba(129,140,248,0.15)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 5 + zoomRef.current, 0, Math.PI * 2);
          ctx.fill();
          // cluster dots
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + t * 0.0003;
            ctx.fillStyle = 'rgba(165,180,252,0.7)';
            ctx.fillRect(px + Math.cos(ang) * 7 - 1, py + Math.sin(ang) * 4 - 1, 2, 2);
          }
          if (zoomRef.current > 0.85) {
            ctx.fillStyle = 'rgba(226,232,240,0.75)';
            ctx.font = '11px ui-sans-serif, system-ui';
            ctx.fillText(sc.name, px + 10, py + 3);
          }
        }
      }

      if (level >= 2) {
        const gals = focusSc
          ? map.superclusters.find((s) => s.id === focusSc)?.galaxies ?? []
          : map.superclusters.flatMap((s) => s.galaxies).slice(0, 48);
        for (const g of gals) {
          const lx = focusSc ? g.x * 0.85 : g.x * 0.35 + (g.x > 0 ? 0.1 : -0.1);
          const ly = focusSc ? g.y * 0.85 : g.y * 0.35;
          const { px, py } = toScreen(lx, ly, w, h);
          drawSpiralGalaxy(px, py, 0.7 + g.size * 0.5, g.hue, t, g.morph);
        }
      }

      if (level >= 3 || map.systems.length) {
        for (const s of map.systems) {
          const { px, py } = toScreen(s.x, s.y, w, h);
          if (s.isPlayer) {
            const pulse = 7 + Math.sin(t * 0.007) * 3.5;
            ctx.strokeStyle = 'rgba(250,204,21,0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(253,224,71,0.35)';
            ctx.beginPath();
            ctx.arc(px, py, pulse + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#facc15';
          } else if (s.hasContact) {
            ctx.fillStyle = '#34d399';
            ctx.strokeStyle = 'rgba(52,211,153,0.4)';
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#94a3b8';
          }
          ctx.beginPath();
          ctx.arc(px, py, s.isPlayer ? 4 : 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // minimap
      const mw = 128;
      const mh = 88;
      const mx = w - mw - 14;
      const my = h - mh - 14;
      ctx.fillStyle = 'rgba(15,23,42,0.88)';
      ctx.strokeStyle = 'rgba(125,211,252,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // rounded rect
      ctx.roundRect?.(mx, my, mw, mh, 8);
      if (!ctx.roundRect) {
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeRect(mx, my, mw, mh);
      } else {
        ctx.fill();
        ctx.stroke();
      }
      for (const sc of map.superclusters.slice(0, 28)) {
        const rr = rotXY(sc.x, sc.y);
        ctx.fillStyle = '#a5b4fc';
        ctx.fillRect(mx + (rr.x + 1) * 0.5 * mw - 1, my + (rr.y + 1) * 0.5 * mh - 1, 2, 2);
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
      zoomRef.current = Math.min(4, Math.max(0.45, zoomRef.current * (e.deltaY > 0 ? 0.9 : 1.1)));
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        rot: rotRef.current,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (e.shiftKey) {
        panRef.current = {
          x: d.panX + dx / (canvas.clientWidth * 0.35),
          y: d.panY + dy / (canvas.clientHeight * 0.35),
        };
      } else {
        rotRef.current = d.rot + dx * 0.005;
      }
    };
    const onUp = (e: PointerEvent) => {
      dragRef.current = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [open, map, level, focusSc, autoSpin]);

  const crumbs = useMemo(() => {
    if (!map) return [] as Array<{ label: string; level: number; clear?: 'sc' | 'gal' }>;
    const scName = focusSc
      ? map.superclusters.find((s) => s.id === focusSc)?.name
      : map.player.superclusterHint;
    const galName = focusGal
      ? map.superclusters.flatMap((s) => s.galaxies).find((g) => g.id === focusGal)?.name
      : map.player.galaxyName;
    return [
      { label: map.player.wallHint || 'Стены/войды', level: 0 },
      { label: scName || 'Сверхскопление', level: 1, clear: 'sc' as const },
      { label: galName || map.player.galaxyName, level: 2, clear: 'gal' as const },
      { label: map.player.systemName, level: 3 },
    ];
  }, [map, focusSc, focusGal]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Карта Вселенной">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Карта Вселенной</h2>
            <nav className={styles.crumbs} aria-label="Навигация по слоям">
              {crumbs.map((c, i) => (
                <span key={`${c.level}-${c.label}`}>
                  {i > 0 && <span className={styles.crumbSep}>→</span>}
                  <button
                    type="button"
                    className={styles.crumbBtn}
                    onClick={() => {
                      setLevel(c.level);
                      if (c.level < 1) {
                        setFocusSc(undefined);
                        setFocusGal(undefined);
                      } else if (c.level < 2) {
                        setFocusGal(undefined);
                      }
                    }}
                  >
                    {c.label}
                  </button>
                </span>
              ))}
              <span className={`muted mono ${styles.levelTag}`}>L{level} · {LEVEL_NAMES[level]}</span>
            </nav>
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
            <button
              type="button"
              className={`btn btn-sm ${autoSpin ? 'btn-premium' : 'btn-ghost'}`}
              onClick={() => setAutoSpin((v) => !v)}
              title="Автовращение"
            >
              ⟳
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setHelpOpen(true)}>
              ?
            </button>
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
            Drag — вращение · Shift+drag — пан · колесо — зум · клик по крошке — вверх
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

      {helpOpen && (
        <div className={styles.helpOverlay} onClick={() => setHelpOpen(false)}>
          <div className={styles.helpCard} onClick={(e) => e.stopPropagation()}>
            <h3>Как читать карту</h3>
            <ul>
              <li>
                <strong>L0</strong> — великие стены и войды (масштаб наблюдаемой Вселенной).
              </li>
              <li>
                <strong>L1</strong> — сверхскопления (кластеры). Клик в списке справа — внутрь.
              </li>
              <li>
                <strong>L2</strong> — галактики со спиральными рукавами.
              </li>
              <li>
                <strong>L3</strong> — солнечные системы; жёлтый пульс — вы; зелёный — контакт.
              </li>
              <li>Квазары / ЧД — аккреционные диски, не для колонизации.</li>
              <li>Хлебные крошки сверху — быстрый подъём на уровень выше.</li>
              <li>⟳ автовращение; drag вращает вручную; Shift+drag сдвигает центр.</li>
            </ul>
            <button type="button" className="btn btn-sm" onClick={() => setHelpOpen(false)}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
