import { civilizationLevelCostHe } from '@shared';
import { formatNumber } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';
import { useEventToasts } from '../hooks/useEventToasts';
import { useGameStore } from '../store/gameStore';
import { AnomaliesPanel } from './AnomaliesPanel';
import { ArtifactsPanel } from './ArtifactsPanel';
import { BuildingsPanel } from './BuildingsPanel';
import { ConstantsPanel } from './ConstantsPanel';
import { ContactsPanel } from './ContactsPanel';
import { DebugPanel } from './DebugPanel';
import { DetailPanel } from './DetailPanel';
import { CombatPanel } from './CombatPanel';
import { DiplomacyPanel } from './DiplomacyPanel';
import { ExpeditionPanel } from './ExpeditionPanel';
import { Journal } from './Journal';
import { LeaderboardPanel } from './LeaderboardPanel';
import { PhysicsLabPanel } from './PhysicsLabPanel';
import { CosmosPanel } from './CosmosPanel';
import { AdminPanel } from './AdminPanel';
import { PremiumPanel } from './PremiumPanel';
import { ResourceBar } from './ResourceBar';
import { Slogan } from './Slogan';
import { SystemPanel } from './SystemPanel';
import styles from './MainScreen.module.css';

export function MainScreen() {
  const [adminOpen, setAdminOpen] = useState(false);
  useEventToasts();
  const civ = useGameStore((s) => s.state?.civilization);
  const resources = useGameStore((s) => s.state?.resources);
  const levelCosts = useGameStore((s) => s.state?.levelCosts);
  const levelUp = useGameStore((s) => s.levelUp);
  const select = useGameStore((s) => s.select);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const openShop = useGameStore((s) => s.openShop);
  const openLeaderboard = useGameStore((s) => s.openLeaderboard);
  const openPhysics = useGameStore((s) => s.openPhysics);
  const openCosmos = useGameStore((s) => s.openCosmos);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!user?.isAdmin;
  const clearGame = useGameStore((s) => s.clear);
  const effRadar = useGameStore((s) => s.state?.effectiveRadar);
  const signalExposure = useGameStore((s) => s.state?.signalExposure);
  const premiumCredits = useGameStore((s) => s.state?.premiumCredits);
  const traveling = useGameStore((s) => s.state?.galaxyTravel?.traveling);

  if (!civ || !resources) return null;

  const nextCost = levelCosts?.highEnergy ?? civilizationLevelCostHe(civ.level);
  const nextDe = levelCosts?.darkEnergy ?? 0;
  const canLevel =
    resources.highEnergy >= nextCost &&
    (nextDe <= 0 || resources.darkEnergy >= nextDe) &&
    civ.level < 100 &&
    !actionLoading;

  const levelTitle =
    nextDe > 0
      ? `Стоимость: ${formatNumber(nextCost, 0)} ВЭ + ${formatNumber(nextDe, 0)} ТЭ`
      : `Стоимость: ${formatNumber(nextCost, 0)} ВЭ`;
  const levelLabel =
    nextDe > 0
      ? `Ур. ↑ (${formatNumber(nextCost, 0)} ВЭ + ${formatNumber(nextDe, 0)} ТЭ)`
      : `Ур. ↑ (${formatNumber(nextCost, 0)} ВЭ)`;

  const onLogout = () => {
    clearGame();
    logout();
  };

  const lateAccent = civ.level >= 90;

  return (
    <div className={`${styles.layout} ${lateAccent ? styles.lateGame : ''}`}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Тёмный Лес: Терра Инкогнита</div>
          <Slogan compact />
        </div>
        <div className={styles.civQuick}>
          <span className={`${styles.user} mono muted`}>{user?.email}</span>
          <span className="tag">радар {effRadar}</span>
          <span
            className="tag"
            title="Чем выше значение, тем легче вашу цивилизацию обнаружить"
          >
            Заметность: {signalExposure?.toFixed(2) ?? '—'}
          </span>
          <span className="tag tag-gold" title="Процветание">
            ★ {formatNumber(civ.prosperityScore, 0)}
          </span>
          <span className="tag" title="Эфирные кредиты">
            ◆ {premiumCredits ?? user?.premiumCredits ?? 0}
          </span>
          {civ.has4DRiftAccess && <span className="tag tag-gold">4D</span>}
          {traveling && <span className="tag">Межгалактика…</span>}
          {(civ.physicsLaws?.length ?? 0) > 0 && (
            <span className="tag" title={civ.physicsLaws.join(', ')}>
              Законы {civ.physicsLaws.length}/3
            </span>
          )}
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${styles.civBtn}`}
            onClick={() => select({ kind: 'civilization' })}
          >
            {civ.name} · ур. {civ.level}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openLeaderboard()}>
            Рейтинг
          </button>
          <button type="button" className="btn btn-sm btn-premium" onClick={() => openShop()}>
            Магазин
          </button>
          {isAdmin && (
            <button type="button" className="btn btn-sm" onClick={() => setAdminOpen(true)}>
              Админ
            </button>
          )}
          {civ.level >= 80 && (
            <button type="button" className="btn btn-sm" onClick={() => openCosmos()}>
              Космос
            </button>
          )}
          {civ.level >= 90 && (
            <button type="button" className="btn btn-sm" onClick={() => openPhysics()}>
              Физика
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm"
            disabled={!canLevel}
            onClick={() => void levelUp()}
            title={levelTitle}
          >
            {levelLabel}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      <ResourceBar />
      <ExpeditionPanel />

      <div className={styles.mainGrid}>
        <SystemPanel />
        <DetailPanel />
      </div>

      <div className={styles.secondaryGrid}>
        <BuildingsPanel />
        <ConstantsPanel />
        <Journal />
      </div>

      <div className={styles.tertiaryGrid}>
        <ArtifactsPanel />
        <AnomaliesPanel />
      </div>

      <div className={styles.contactsRow}>
        <ContactsPanel />
      </div>

      <DebugPanel />
      <DiplomacyPanel />
      <CombatPanel />
      <PremiumPanel />
      <LeaderboardPanel />
      <PhysicsLabPanel />
      <CosmosPanel />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />

      <footer className={styles.footer}>
        <span className="mono muted">
          Этап 9 · launch · sid {civ.seed} · prosperity {civ.prosperityScore} · exposure{' '}
          {signalExposure?.toFixed(3)}
          {civ.level >= 90 ? ' · glitch' : ''}
        </span>
      </footer>
    </div>
  );
}
