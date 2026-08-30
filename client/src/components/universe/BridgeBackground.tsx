import { useEffect, useRef } from 'react';
import styles from './BridgeBackground.module.css';

type Mode = 'diplomacy' | 'combat' | 'neutral';

/** Animated starfield backdrop for the Bridge (рубка). */
export function BridgeBackground({ mode = 'diplomacy' }: { mode?: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let alive = true;
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      s: 0.4 + Math.random() * 1.6,
    }));
    let ship = { x: -0.1, y: 0.3, vx: 0.00015, life: 0 };

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tint =
      mode === 'combat'
        ? ['#1a0508', '#3a0a12', 'rgba(255,60,60,0.08)']
        : mode === 'diplomacy'
          ? ['#050b1a', '#0a1a3a', 'rgba(56,189,248,0.07)']
          : ['#050812', '#0c1228', 'rgba(129,140,248,0.06)'];

    const draw = (t: number) => {
      if (!alive) return;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, tint[0]!);
      g.addColorStop(1, tint[1]!);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const neb = ctx.createRadialGradient(
        w * 0.7 + Math.sin(t * 0.0001) * 40,
        h * 0.3,
        0,
        w * 0.7,
        h * 0.3,
        w * 0.5
      );
      neb.addColorStop(0, tint[2]!);
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#e2e8f0';
      for (const s of stars) {
        const px = ((s.x + t * 0.00001 * (0.2 + s.z)) % 1) * w;
        const py = s.y * h + Math.sin(t * 0.0003 + s.x * 10) * s.z * 4;
        const a = 0.25 + s.z * 0.75;
        ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.002 + s.x * 20));
        ctx.beginPath();
        ctx.arc(px, py, s.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // rare ship
      if (ship.life <= 0 && Math.random() < 0.002) {
        ship = { x: -0.05, y: 0.2 + Math.random() * 0.5, vx: 0.00012 + Math.random() * 0.0001, life: 1 };
      }
      if (ship.life > 0) {
        ship.x += ship.vx * 16;
        const sx = ship.x * w;
        const sy = ship.y * h;
        ctx.strokeStyle = mode === 'combat' ? 'rgba(255,120,120,0.7)' : 'rgba(125,211,252,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 18, sy + 3);
        ctx.lineTo(sx - 6, sy);
        ctx.lineTo(sx - 18, sy - 3);
        ctx.closePath();
        ctx.stroke();
        if (ship.x > 1.1) ship.life = 0;
      }

      // radar sweep
      ctx.save();
      ctx.translate(w * 0.12, h * 0.82);
      ctx.strokeStyle = mode === 'combat' ? 'rgba(255,80,80,0.25)' : 'rgba(34,211,238,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      const ang = (t * 0.0015) % (Math.PI * 2);
      ctx.strokeStyle = mode === 'combat' ? 'rgba(255,100,100,0.5)' : 'rgba(34,211,238,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 36, Math.sin(ang) * 36);
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode]);

  return <canvas ref={ref} className={styles.canvas} aria-hidden />;
}
