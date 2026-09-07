import { useMemo } from 'react';
import {
  BUILDING_ORDER,
  BUILDINGS,
  buildingUpgradeCost,
  civilizationLevelCostHe,
  computeNextGoal,
  type BuildingId,
} from '@shared';
import { formatTime } from '../lib/format';
import { useGameStore } from '../store/gameStore';
import styles from './Journal.module.css';

const TYPE_META: Record<string, { label: string; icon: string; tone: string }> = {
  system: { label: 'Система', icon: '⚙️', tone: 'neutral' },
  production: { label: 'Производство', icon: '⚡', tone: 'neutral' },
  upgrade: { label: 'Улучшение', icon: '🔧', tone: 'ok' },
  level_up: { label: 'Уровень', icon: '⬆️', tone: 'ok' },
  expedition: { label: 'Экспедиция', icon: '🚀', tone: 'info' },
  discovery: { label: 'Открытие', icon: '✨', tone: 'info' },
  debug: { label: 'Отладка', icon: '🛠', tone: 'mute' },
  warning: { label: 'Внимание', icon: '⚠️', tone: 'warn' },
  artifact: { label: 'Артефакт', icon: '💎', tone: 'gold' },
  trap: { label: 'Ловушка', icon: '☠️', tone: 'danger' },
  rift: { label: 'Разлом', icon: '🌀', tone: 'weird' },
  signal: { label: 'Сигнал', icon: '📶', tone: 'danger' },
  boost: { label: 'Усиление', icon: '📈', tone: 'ok' },
  paradox: { label: 'Парадокс', icon: '∞', tone: 'weird' },
  CASUS: { label: 'Казус', icon: '🎭', tone: 'gold' },
  casus: { label: 'Казус', icon: '🎭', tone: 'gold' },
  meteor: { label: 'Метеорит', icon: '☄️', tone: 'warn' },
  foreign_scan: { label: 'Сканирование', icon: '📡', tone: 'danger' },
  narrative: { label: 'Событие', icon: '📜', tone: 'info' },
};

export function Journal({
  onGoalAction,
  highlight,
}: {
  onGoalAction?: (action: 'build' | 'explore' | 'scan' | 'level' | 'contacts' | 'wait') => void;
  highlight?: boolean;
}) {
  const state = useGameStore((s) => s.state);
  const journal = state?.journal ?? [];
  const error = useGameStore((s) => s.error);
  const effRadar = state?.effectiveRadar;

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

  const rewardHint = (kind: string | undefined) => {
    switch (kind) {
      case 'build_collider':
        return 'Награда: стабильный приток высоких энергий.';
      case 'level_up':
        return 'Награда: новый уровень и открытый контент.';
      case 'send_expedition':
        return 'Награда: шанс ресурсов, находок или сигнала.';
      case 'check_contact':
        return 'Награда: понимание, кто рядом (и меньше сюрпризов).';
      case 'upgrade_building':
        return 'Награда: сильнее производство или радар.';
      default:
        return 'Награда: готовность к следующему шагу.';
    }
  };

  return (
    <div
      className={`glass ${styles.panel} ${highlight ? styles.highlight : ''}`}
      data-tutorial="journal"
    >
      <header className={styles.top}>
        <div>
          <h2 className={styles.heading}>Журнал · рассказчик</h2>
          <p className={styles.sub}>
            Главный канал связи игры с вами. Рядом — радар мира.
          </p>
        </div>
        <div className={styles.radarChip} title="Эффективный радар">
          <span aria-hidden>📡</span>
          <span className="mono">{effRadar ?? '—'}</span>
          <span className={styles.radarLabel}>радар</span>
        </div>
      </header>

      {goal && (
        <section className={styles.quest} data-tutorial="next-goal">
          <div className={styles.questKicker}>Текущая цель</div>
          <div className={styles.questTitle}>{goal.titleRu}</div>
          <p className={styles.questBody}>
            <strong>Что сделать:</strong> {goal.bodyRu}
          </p>
          <p className={styles.questReward}>{rewardHint(goal.kind)}</p>
          {goal.action !== 'wait' && onGoalAction && (
            <button
              type="button"
              className={`btn btn-primary btn-sm ${styles.questCta}`}
              onClick={() => onGoalAction(goal.action)}
            >
              К цели
            </button>
          )}
        </section>
      )}

      {error && (
        <div className={styles.liveError} role="alert">
          {error}
        </div>
      )}

      <div className={`scroll-y ${styles.list}`}>
        {journal.length === 0 && (
          <div className={styles.empty}>
            Пока тихо. События, предупреждения и нежданчики появятся здесь.
          </div>
        )}
        {journal.map((e) => {
          const meta = TYPE_META[e.type] ?? {
            label: e.type,
            icon: '📜',
            tone: 'neutral',
          };
          return (
            <article
              key={e.id}
              className={`${styles.card} ${styles[`tone_${meta.tone}`] ?? ''}`}
              data-type={e.type}
            >
              <div className={styles.cardIcon} aria-hidden>
                {meta.icon}
              </div>
              <div className={styles.cardBody}>
                <header className={styles.cardHead}>
                  <span className={styles.badge}>{meta.label}</span>
                  <span className={`${styles.time} mono`}>
                    {formatTime(new Date(e.createdAt).getTime())}
                  </span>
                </header>
                <div className={styles.cardTitle}>{e.title || meta.label}</div>
                <p className={styles.cardText}>{e.message}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
