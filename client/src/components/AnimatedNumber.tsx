import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../lib/format';

interface Props {
  value: number;
  digits?: number;
  className?: string;
  durationMs?: number;
}

/** Smoothly ticks displayed number toward target value. */
export function AnimatedNumber({ value, digits = 1, className, durationMs = 450 }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      setDisplay(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, durationMs]);

  return <span className={className}>{formatNumber(display, digits)}</span>;
}
