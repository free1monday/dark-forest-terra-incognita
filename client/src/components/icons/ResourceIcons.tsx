import type { CSSProperties, ReactNode } from 'react';
import type { ResourceId } from '@shared';

const base = {
  width: '1.15em',
  height: '1.15em',
  display: 'inline-block',
  verticalAlign: '-0.2em',
  flexShrink: 0,
} as const;

function Svg({
  children,
  title,
  style,
  className,
}: {
  children: ReactNode;
  title: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="1.15em"
      height="1.15em"
      style={{ ...base, ...style }}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Высокие энергии — термометр + тепловые волны */
export function IconHighEnergy({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Svg title="Высокие энергии" className={className} style={style}>
      <defs>
        <linearGradient id="heGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <filter id="heGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M14 4h4v14.2a5 5 0 1 1-4 0V4z"
        fill="none"
        stroke="#fb923c"
        strokeWidth="1.6"
      />
      <path d="M15.2 18.5V10h1.6v8.5a2.4 2.4 0 1 1-1.6 0z" fill="url(#heGrad)" filter="url(#heGlow)" />
      <path d="M22 8c2 1 3 2.5 2 4M24 6c2.5 1.2 3.5 3 2.5 5" fill="none" stroke="#fb923c" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M8 8c-2 1-3 2.5-2 4M6 6c-2.5 1.2-3.5 3-2.5 5" fill="none" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </Svg>
  );
}

/** Антиматерия — ± в круге */
export function IconAntimatter({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Svg title="Антиматерия" className={className} style={style}>
      <defs>
        <linearGradient id="amGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="amGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="12" fill="rgba(14,165,233,0.12)" stroke="url(#amGrad)" strokeWidth="1.8" filter="url(#amGlow)" />
      <path d="M16 8v10M12 13h8" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22h8" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Тёмная материя — серп луны */
export function IconDarkMatter({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Svg title="Тёмная материя" className={className} style={style}>
      <defs>
        <linearGradient id="dmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="rgba(76,29,149,0.25)" stroke="#6d28d9" strokeWidth="1" />
      <path
        d="M18.5 6.5a10 10 0 1 0 0 19 8.2 8.2 0 1 1 0-19z"
        fill="url(#dmGrad)"
        opacity="0.95"
      />
      <circle cx="21" cy="11" r="1.1" fill="#ede9fe" opacity="0.7" />
    </Svg>
  );
}

/** Тёмная энергия — тильда в круге */
export function IconDarkEnergy({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Svg title="Тёмная энергия" className={className} style={style}>
      <defs>
        <linearGradient id="deGrad" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <filter id="deGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="12" fill="rgba(49,46,129,0.35)" stroke="#6366f1" strokeWidth="1.5" filter="url(#deGlow)" />
      <path
        d="M7 16c2.5-4 5-4 7 0s4.5 4 7 0"
        fill="none"
        stroke="url(#deGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        filter="url(#deGlow)"
      />
    </Svg>
  );
}

/** Фермионы — упрощённый спин / орбиталь */
export function IconFermions({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Svg title="Фермионы" className={className} style={style}>
      <defs>
        <linearGradient id="fmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#2dd4bf" strokeWidth="1.2" transform="rotate(30 16 16)" />
      <ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#5eead4" strokeWidth="1.2" transform="rotate(-40 16 16)" opacity="0.8" />
      <circle cx="16" cy="16" r="3.2" fill="url(#fmGrad)" />
    </Svg>
  );
}

const MAP: Record<ResourceId, (p: { className?: string; style?: CSSProperties }) => ReactNode> = {
  highEnergy: IconHighEnergy,
  antimatter: IconAntimatter,
  darkMatter: IconDarkMatter,
  darkEnergy: IconDarkEnergy,
  fermions: IconFermions,
};

export function ResourceIcon({
  id,
  className,
  style,
}: {
  id: ResourceId | string;
  className?: string;
  style?: CSSProperties;
}) {
  const Comp = MAP[id as ResourceId] ?? IconHighEnergy;
  return <Comp className={className} style={style} />;
}

/** Compact cost chip: icon + amount */
export function ResourceCost({
  id,
  amount,
  className,
}: {
  id: ResourceId | string;
  amount: number;
  className?: string;
}) {
  if (!amount) return null;
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2em',
        whiteSpace: 'nowrap',
      }}
      title={String(id)}
    >
      <ResourceIcon id={id} />
      <span className="mono">{amount.toLocaleString('ru-RU')}</span>
    </span>
  );
}

export function formatCostParts(
  cost: Partial<Record<ResourceId, number>> & Record<string, number | undefined>
): ReactNode {
  const order: ResourceId[] = ['highEnergy', 'antimatter', 'darkEnergy', 'darkMatter', 'fermions'];
  const parts = order
    .filter((k) => (cost[k] ?? 0) > 0)
    .map((k) => <ResourceCost key={k} id={k} amount={Number(cost[k])} />);
  if (!parts.length) return null;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
      {parts}
    </span>
  );
}
