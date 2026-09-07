import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styles from './InfoTip.module.css';

/**
 * Hover (desktop) / tap ⓘ (mobile) explanation bubble.
 * Keeps body short — plain language, no spoilers.
 */
export function InfoTip({
  title,
  body,
  links,
  children,
  label = 'Справка',
  compact,
}: {
  title: string;
  body: string;
  links?: string;
  children?: ReactNode;
  label?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={`${styles.wrap} ${compact ? styles.compact : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <button
        type="button"
        className={styles.btn}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⓘ
      </button>
      {open && (
        <span className={styles.bubble} id={id} role="tooltip">
          <strong className={styles.title}>{title}</strong>
          <span className={styles.body}>{body}</span>
          {links && <span className={styles.links}>{links}</span>}
        </span>
      )}
    </span>
  );
}

/** Inline metric chip with built-in tip. */
export function MetricChip({
  icon,
  value,
  tip,
  gold,
  className,
}: {
  icon: string;
  value: string | number;
  tip: { title: string; body: string; links?: string };
  gold?: boolean;
  className?: string;
}) {
  return (
    <span className={`tag ${gold ? 'tag-gold' : ''} ${className ?? ''}`}>
      <InfoTip title={tip.title} body={tip.body} links={tip.links} compact>
        <span className={styles.metricInner}>
          <span aria-hidden>{icon}</span>
          <span className="mono">{value}</span>
        </span>
      </InfoTip>
    </span>
  );
}
