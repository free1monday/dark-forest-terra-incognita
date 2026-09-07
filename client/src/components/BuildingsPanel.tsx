import { BUILDING_ORDER, BUILDINGS, buildingUpgradeCost } from '@shared';
import type { BuildingId } from '@shared';
import { formatNumber } from '../lib/format';
import { BUILDING_LABELS } from '../lib/labels';
import { buildingTip } from '../lib/tooltips';
import { useGameStore } from '../store/gameStore';
import { ActionRow } from './ActionCost';
import { InfoTip } from './InfoTip';
import { BuildingIcon } from './icons/ObjectIcons';
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
  const hePerSec = useGameStore((s) => s.state?.production.highEnergyPerSec ?? 0);
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
          const tip = buildingTip(id, level, {
            hePerSec: id === 'high_energy_collider' ? hePerSec : undefined,
            radarBonus: id === 'dark_sensor' ? level * 5 : undefined,
          });

          return (
            <div
              key={id}
              className={`${styles.row} clickable ${isSelected ? 'selected' : ''} ${canAfford ? styles.afford : lockedByLevel ? styles.lockedRow : styles.cantAfford}`}
              onClick={() => select({ kind: 'building', id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') select({ kind: 'building', id });
              }}
              role="button"
              tabIndex={0}
            >
              <div className={styles.iconWrap}>
                <BuildingIcon id={id} size={36} />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>
                  <InfoTip title={tip.title} body={tip.body} links={tip.links}>
                    <span>{labels.name}</span>
                  </InfoTip>
                  {lockedByLevel && <span className="tag">ур. {def.unlockedAtLevel}+</span>}
                </div>
                <div className={styles.sub}>
                  Уровень <strong className="mono">{level}</strong>
                  <span className="muted"> · </span>
                  <span className={styles.effectLine}>{tip.body.split('.')[0]}.</span>
                </div>
                <ActionRow
                  cost={{ highEnergy: cost }}
                  have={resources}
                  disabled={lockedByLevel}
                  loading={actionLoading}
                  onClick={() => void upgrade(id)}
                  title={
                    lockedByLevel
                      ? `Нужен ур. цивилизации ${def.unlockedAtLevel}+`
                      : `Улучшить · ${formatNumber(cost, 0)} ВЭ`
                  }
                >
                  Улучшить
                </ActionRow>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
