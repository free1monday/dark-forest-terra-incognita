import type { ReactNode } from 'react';
import type { ResourceId } from '@shared';
import { formatNumber } from '../lib/format';
import { RESOURCE_LABELS } from '../lib/labels';
import { ResourceIcon, formatCostParts } from './icons/ResourceIcons';
import styles from './ActionCost.module.css';

export type CostMap = Partial<Record<ResourceId, number>> & Record<string, number | undefined>;

/** Resource bag from game state (may include capacities etc.). */
export type HaveMap = Partial<Record<ResourceId, number>> | null | undefined;

function shortName(id: string): string {
  const meta = RESOURCE_LABELS[id as ResourceId];
  return meta?.short ?? id;
}

function haveOf(have: HaveMap, id: ResourceId): number | undefined {
  if (!have) return undefined;
  const v = (have as Record<string, unknown>)[id];
  return typeof v === 'number' ? v : undefined;
}

/** Large cost chip next to an action button; red when unaffordable. */
export function ActionCost({
  cost,
  have,
  className,
}: {
  cost: CostMap;
  /** Current player resources (only keys that matter). */
  have?: HaveMap;
  className?: string;
}) {
  const order: ResourceId[] = ['highEnergy', 'antimatter', 'darkEnergy', 'darkMatter', 'fermions'];
  const entries = order
    .map((id) => ({ id, need: Number(cost[id] ?? 0) }))
    .filter((e) => e.need > 0);

  if (entries.length === 0) {
    return <span className={`${styles.free} ${className ?? ''}`}>бесплатно</span>;
  }

  const shortages = entries
    .map((e) => {
      const haveAmt = haveOf(have, e.id);
      if (haveAmt == null) return null;
      const miss = e.need - haveAmt;
      return miss > 0 ? { id: e.id, miss } : null;
    })
    .filter(Boolean) as Array<{ id: ResourceId; miss: number }>;

  const ok = shortages.length === 0;

  return (
    <span className={`${styles.wrap} ${ok ? styles.ok : styles.bad} ${className ?? ''}`}>
      <span className={styles.row}>
        {entries.map((e) => {
          const haveAmt = haveOf(have, e.id);
          const can = haveAmt == null || haveAmt >= e.need;
          return (
            <span key={e.id} className={`${styles.chip} ${can ? '' : styles.chipBad}`}>
              <ResourceIcon id={e.id} />
              <span className="mono">{formatNumber(e.need, 0)}</span>
            </span>
          );
        })}
      </span>
      {!ok && (
        <span className={styles.short}>
          не хватает:{' '}
          {shortages.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? ', ' : ''}
              {formatNumber(s.miss, 0)} {shortName(s.id)}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** Action row: cost (large) + button. */
export function ActionRow({
  cost,
  have,
  disabled,
  loading,
  onClick,
  children,
  buttonClassName,
  title,
}: {
  cost: CostMap;
  have?: HaveMap;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: ReactNode;
  buttonClassName?: string;
  title?: string;
}) {
  const order: ResourceId[] = ['highEnergy', 'antimatter', 'darkEnergy', 'darkMatter', 'fermions'];
  const canCost =
    !have ||
    order.every((id) => {
      const need = Number(cost[id] ?? 0);
      if (need <= 0) return true;
      const h = haveOf(have, id);
      return h == null || h >= need;
    });

  return (
    <div className={styles.actionRow}>
      <ActionCost cost={cost} have={have} />
      <button
        type="button"
        className={`btn btn-sm ${canCost ? 'btn-primary' : ''} ${buttonClassName ?? ''}`}
        disabled={disabled || loading || !canCost}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {children}
      </button>
    </div>
  );
}

/** Credits-only cost (shop). */
export function CreditsCost({
  amount,
  have,
}: {
  amount: number;
  have: number;
}) {
  const ok = have >= amount;
  return (
    <span className={`${styles.wrap} ${ok ? styles.ok : styles.bad}`}>
      <span className={styles.row}>
        <span className={`${styles.chip} ${ok ? '' : styles.chipBad}`}>
          <span aria-hidden>◆</span>
          <span className="mono">{formatNumber(amount, 0)}</span>
          <span className={styles.cr}>кр.</span>
        </span>
      </span>
      {!ok && (
        <span className={styles.short}>
          не хватает: {formatNumber(amount - have, 0)} кр.
        </span>
      )}
    </span>
  );
}

export { formatCostParts };
