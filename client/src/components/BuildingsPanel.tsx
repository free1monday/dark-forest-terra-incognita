import { BUILDING_ORDER, BUILDINGS, buildingUpgradeCost } from '@shared';
import type { BuildingId } from '@shared';
import { formatNumber } from '../lib/format';
import { BUILDING_LABELS } from '../lib/labels';
import { useGameStore } from '../store/gameStore';
import { ResourceCost } from './icons/ResourceIcons';
import styles from './BuildingsPanel.module.css';

function levelOf(
  buildings: Array<{ type: string; level: number }> | undefined,
  id: BuildingId
): number {
  return buildings?.find((b) => b.type === id)?.level ?? 0;
}

export function BuildingsPanel() {
  const buildings = useGameStore((s) => s.state?.buildings);
  const resources = useGameStore((s) => s.state?.resources);
  const civ = useGameStore((s) => s.state?.civilization);
  const upgrade = useGameStore((s) => s.upgradeBuilding);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const select = useGameStore((s) => s.select);
  const selected = useGameStore((s) => s.selected);
  if (!civ || !resources) return null;

  return (
    <div className={`glass ${styles.panel}`}>
      <h2 className="panel-title">Постройки</h2>
      <div className={styles.list}>
        {BUILDING_ORDER.map((id) => {
          const def = BUILDINGS[id];
          const level = levelOf(buildings, id);
          const cost = buildingUpgradeCost(id, level);
          const lockedByLevel = civ.level < def.unlockedAtLevel;
          const canAfford = resources.highEnergy >= cost && !lockedByLevel && !actionLoading;
          const isSelected = selected?.kind === 'building' && selected.id === id;
          const labels = BUILDING_LABELS[id];

          return (
            <div
              key={id}
              className={`${styles.row} clickable ${isSelected ? 'selected' : ''}`}
              title={`${labels.desc}\nЭффект: ${labels.effect}\nУр. ${level} · улучшение: ${formatNumber(cost, 0)} ВЭ`}
              onClick={() => select({ kind: 'building', id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') select({ kind: 'building', id });
              }}
              role="button"
              tabIndex={0}
            >
              <div className={styles.info}>
                <div className={styles.name}>
                  {labels.name}
                  {lockedByLevel && <span className="tag">ур. {def.unlockedAtLevel}+</span>}
                </div>
                <div className={styles.sub}>
                  Уровень <strong className="mono">{level}</strong>
                  <span className="muted"> · </span>
                  след. <ResourceCost id="highEnergy" amount={cost} />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!canAfford}
                onClick={(e) => {
                  e.stopPropagation();
                  void upgrade(id);
                }}
              >
                Улучшить
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
