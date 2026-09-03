import { useMemo } from 'react';
import {
  BUILDING_ORDER,
  BUILDINGS,
  buildingUpgradeCost,
  civilizationLevelCostHe,
  computeNextGoal,
  type BuildingId,
} from '@shared';
import { useGameStore } from '../store/gameStore';
import styles from './NextGoalBanner.module.css';

export function NextGoalBanner({
  onAction,
}: {
  onAction: (action: 'build' | 'explore' | 'scan' | 'level' | 'contacts' | 'wait') => void;
}) {
  const state = useGameStore((s) => s.state);
  const goal = useMemo(() => {
    if (!state) return null;
    const civ = state.civilization;
    const res = state.resources;
    const buildings = state.buildings ?? [];
    const collider =
      buildings.find((b) => b.type === 'high_energy_collider')?.level ?? 0;
    const totalLv = buildings.reduce((s, b) => s + (b.level ?? 0), 0);
    const levelCostHe = state.levelCosts?.highEnergy ?? civilizationLevelCostHe(civ.level);
    const levelCostDe = state.levelCosts?.darkEnergy ?? 0;
    let canAfford = false;
    for (const id of BUILDING_ORDER) {
      const def = BUILDINGS[id as BuildingId];
      if (civ.level < def.unlockedAtLevel) continue;
      const lv = buildings.find((b) => b.type === id)?.level ?? 0;
      const cost = buildingUpgradeCost(id as BuildingId, lv);
      if (res.highEnergy >= cost) {
        canAfford = true;
        break;
      }
    }
    const unhandled =
      state.contacts?.filter(
        (c) => c.status === 'detected' || c.status === 'monitored'
      ).length ?? 0;
    return computeNextGoal({
      civLevel: civ.level,
      highEnergy: res.highEnergy,
      darkEnergy: res.darkEnergy,
      levelCostHe,
      levelCostDe,
      colliderLevel: collider,
      buildingsTotalLevels: totalLv,
      hasActiveExpedition: !!state.expedition?.active,
      unhandledContacts: unhandled,
      canAffordAnyBuildingUpgrade: canAfford,
    });
  }, [state]);

  if (!goal) return null;

  return (
    <div className={styles.banner} data-tutorial="next-goal">
      <div className={styles.kicker}>Что делать дальше?</div>
      <div className={styles.title}>{goal.titleRu}</div>
      <p className={styles.body}>{goal.bodyRu}</p>
      {goal.action !== 'wait' && (
        <button
          type="button"
          className={`btn btn-primary ${styles.cta}`}
          onClick={() => onAction(goal.action)}
        >
          Перейти
        </button>
      )}
    </div>
  );
}
