import type { CSSProperties, ReactNode } from 'react';
import type { BuildingId } from '@shared';

function Svg({
  children,
  title,
  style,
  className,
  size = 40,
}: {
  children: ReactNode;
  title: string;
  style?: CSSProperties;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, ...style }}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function IconCollider({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Коллайдер" size={size} className={className}>
      <defs>
        <linearGradient id="colRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id="colGlow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="32" r="22" fill="none" stroke="url(#colRing)" strokeWidth="3" filter="url(#colGlow)" />
      <circle cx="32" cy="32" r="14" fill="none" stroke="#a5b4fc" strokeWidth="1.5" opacity="0.7" />
      <circle cx="32" cy="10" r="3" fill="#fde68a" filter="url(#colGlow)" />
      <circle cx="50" cy="40" r="2.5" fill="#f97316" />
      <circle cx="14" cy="38" r="2.5" fill="#38bdf8" />
      <path d="M32 32 L48 20" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8" />
      <path d="M32 32 L18 44" stroke="#22d3ee" strokeWidth="1.5" opacity="0.8" />
    </Svg>
  );
}

export function IconResearch({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Исследовательский узел" size={size} className={className}>
      <defs>
        <linearGradient id="resG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect x="22" y="28" width="20" height="26" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      <path d="M18 28h28l-4-12H22z" fill="url(#resG)" opacity="0.9" />
      <circle cx="32" cy="18" r="5" fill="#7dd3fc" opacity="0.9" />
      <path d="M32 8v5M26 12l4 3M38 12l-4 3" stroke="#bae6fd" strokeWidth="1.2" />
      <rect x="26" y="34" width="5" height="5" fill="#22d3ee" opacity="0.7" />
      <rect x="33" y="34" width="5" height="5" fill="#818cf8" opacity="0.7" />
      <rect x="26" y="42" width="12" height="3" fill="#334155" />
    </Svg>
  );
}

export function IconProbe({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Зонд" size={size} className={className}>
      <defs>
        <linearGradient id="probeG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <filter id="probeGlow">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="32" cy="30" rx="14" ry="8" fill="url(#probeG)" />
      <path d="M18 30h-8M14 26l-4-4M14 34l-4 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="40" cy="28" r="3" fill="#38bdf8" filter="url(#probeGlow)" />
      <path d="M46 30l10 2-10 2z" fill="#f97316" filter="url(#probeGlow)" />
      <path d="M28 38l-2 10M36 38l2 10" stroke="#64748b" strokeWidth="1.2" />
      <circle cx="26" cy="48" r="1.5" fill="#94a3b8" />
      <circle cx="38" cy="48" r="1.5" fill="#94a3b8" />
    </Svg>
  );
}

export function IconFermionSynth({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Фермионный синтезатор" size={size} className={className}>
      <defs>
        <linearGradient id="fsG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="14" y="20" width="36" height="28" rx="4" fill="#022c22" stroke="#34d399" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="10" fill="none" stroke="url(#fsG)" strokeWidth="2" />
      <circle cx="32" cy="34" r="4" fill="#34d399" />
      <path d="M32 24v6M32 38v6M22 34h6M36 34h6" stroke="#6ee7b7" strokeWidth="1.2" />
      <path d="M20 16h24l-4 4H24z" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
    </Svg>
  );
}

export function IconDarkSensor({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Тёмный сенсор" size={size} className={className}>
      <defs>
        <radialGradient id="radarG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="36" r="20" fill="url(#radarG)" stroke="#a78bfa" strokeWidth="1.2" />
      <circle cx="32" cy="36" r="12" fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.7" />
      <circle cx="32" cy="36" r="5" fill="none" stroke="#ddd6fe" strokeWidth="1" />
      <path d="M32 36 L48 22" stroke="#e9d5ff" strokeWidth="2" strokeLinecap="round" />
      <rect x="28" y="8" width="8" height="12" rx="2" fill="#1e1b4b" stroke="#a78bfa" />
      <circle cx="32" cy="10" r="2" fill="#f5d0fe" />
    </Svg>
  );
}

export function IconSiphon({ size, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Сифон вакуума" size={size} className={className}>
      <defs>
        <linearGradient id="sipG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <filter id="sipGlow">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M20 50h24l-4-22H24z" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
      <ellipse cx="32" cy="26" rx="14" ry="6" fill="url(#sipG)" filter="url(#sipGlow)" opacity="0.9" />
      <path d="M32 12c8 6 8 14 0 20c-8-6-8-14 0-20z" fill="none" stroke="#818cf8" strokeWidth="1.5" opacity="0.8" />
      <circle cx="32" cy="22" r="3" fill="#c7d2fe" filter="url(#sipGlow)" />
    </Svg>
  );
}

const BUILDING_ICONS: Record<BuildingId, (p: { size?: number; className?: string }) => ReactNode> = {
  high_energy_collider: IconCollider,
  research_node: IconResearch,
  probe_factory: IconProbe,
  fermion_synthesizer: IconFermionSynth,
  dark_sensor: IconDarkSensor,
  dark_energy_siphon: IconSiphon,
};

export function BuildingIcon({
  id,
  size = 40,
  className,
}: {
  id: BuildingId | string;
  size?: number;
  className?: string;
}) {
  const Comp = BUILDING_ICONS[id as BuildingId] ?? IconCollider;
  return <Comp size={size} className={className} />;
}

/** Weapon icons (Stage 11 layer 4) */
export function IconPositronCannon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Позитронная пушка" size={size} className={className}>
      <defs>
        <linearGradient id="posG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <rect x="8" y="26" width="36" height="12" rx="3" fill="#1c1917" stroke="#f97316" strokeWidth="1.5" />
      <path d="M44 28h12l-4 4 4 4H44z" fill="url(#posG)" />
      <circle cx="18" cy="32" r="4" fill="#fdba74" />
      <path d="M10 22h8M10 42h8" stroke="#78716c" strokeWidth="2" />
    </Svg>
  );
}

export function IconTranqlucator({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Транклюкатор" size={size} className={className}>
      <defs>
        <radialGradient id="trG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
      </defs>
      <path d="M32 8 L52 52 H12 Z" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="10" fill="url(#trG)" opacity="0.85" />
      <path d="M32 20v28M20 34h24" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.7" />
    </Svg>
  );
}

export function IconRelativisticDrop({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Svg title="Релятивистская капля" size={size} className={className}>
      <defs>
        <linearGradient id="dropG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="40%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="dropGlow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M32 6c0 0 16 22 16 34a16 16 0 0 1-32 0C16 28 32 6 32 6z"
        fill="url(#dropG)"
        filter="url(#dropGlow)"
      />
      <circle cx="28" cy="28" r="3" fill="#fff" opacity="0.5" />
    </Svg>
  );
}
