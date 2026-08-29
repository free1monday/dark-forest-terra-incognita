export function formatNumber(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(digits) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(digits) + 'M';
  if (abs >= 10_000) return (n / 1_000).toFixed(digits) + 'k';
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  if (abs === 0) return '0';
  return n.toFixed(3);
}

export function formatRate(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${formatNumber(n)}/с`;
}

export function formatCoords(c: { x: number; y: number; z: number }): string {
  return `(${c.x}, ${c.y}, ${c.z})`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatEta(msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return `${s} с`;
}
