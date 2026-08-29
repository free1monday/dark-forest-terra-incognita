import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; z: number; s: number; layer: number };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

/** Lightweight animated starfield: parallax drift, nebulae, rare meteors. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let running = true;
    const stars: Star[] = [];
    const meteors: Meteor[] = [];
    let lastMeteor = 0;

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      stars.length = 0;
      const count = Math.min(220, Math.floor((w * h) / 10000));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(),
          s: Math.random(),
          layer: Math.random() < 0.35 ? 0 : Math.random() < 0.7 ? 1 : 2,
        });
      }
    };

    resize();
    init();

    const draw = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.32,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.75
      );
      g.addColorStop(0, '#0c1a3a');
      g.addColorStop(0.4, '#070f24');
      g.addColorStop(1, '#030712');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      const nx = w * 0.72 + Math.sin(t * 0.00008) * 50;
      const ny = h * 0.28 + Math.cos(t * 0.00006) * 30;
      const nebula = ctx.createRadialGradient(nx, ny, 0, nx, ny, w * 0.38);
      nebula.addColorStop(0, 'rgba(99, 102, 241, 0.09)');
      nebula.addColorStop(0.5, 'rgba(139, 92, 246, 0.04)');
      nebula.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, w, h);

      const n2x = w * 0.22 + Math.cos(t * 0.00005) * 40;
      const n2y = h * 0.72;
      const nebula2 = ctx.createRadialGradient(n2x, n2y, 0, n2x, n2y, w * 0.32);
      nebula2.addColorStop(0, 'rgba(34, 211, 238, 0.06)');
      nebula2.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, w, h);

      const n3 = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.9, w * 0.4);
      n3.addColorStop(0, 'rgba(14, 165, 233, 0.03)');
      n3.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = n3;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      const speeds = [0.012, 0.028, 0.055];
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.0018 + star.s * 24);
        const r = (0.35 + star.z * 1.7) * twinkle * (0.7 + star.layer * 0.2);
        const col =
          star.s > 0.75 ? '165,243,252' : star.s > 0.45 ? '226,232,240' : '196,181,253';
        ctx.beginPath();
        ctx.fillStyle = `rgba(${col}, ${0.28 + star.z * 0.6})`;
        ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
        ctx.fill();
        star.y += speeds[star.layer] * (0.6 + star.z);
        star.x += Math.sin(t * 0.00015 + star.s * 10) * 0.01 * (star.layer + 1);
        if (star.y > h + 3) {
          star.y = -3;
          star.x = Math.random() * w;
        }
        if (star.x < -3) star.x = w + 3;
        if (star.x > w + 3) star.x = -3;
      }

      if (t - lastMeteor > 4200 + Math.random() * 8000 && meteors.length < 2) {
        lastMeteor = t;
        const fromTop = Math.random() > 0.3;
        meteors.push({
          x: Math.random() * w * 0.8,
          y: fromTop ? -10 : Math.random() * h * 0.4,
          vx: 2.2 + Math.random() * 2.5,
          vy: 1.4 + Math.random() * 1.8,
          life: 1,
        });
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life -= 0.012;
        if (m.life <= 0 || m.x > w + 40 || m.y > h + 40) {
          meteors.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 8, m.y - m.vy * 8);
        grad.addColorStop(0, `rgba(226,232,240,${0.85 * m.life})`);
        grad.addColorStop(1, 'rgba(125,211,252,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 8, m.y - m.vy * 8);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        running = false;
        cancelAnimationFrame(raf);
      } else {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    const onResize = () => {
      resize();
      init();
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden />;
}
