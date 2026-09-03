import { civilizationLevelCostHe, formatPopulation } from '@shared';
import { ResourceCost } from './icons/ResourceIcons';
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
import { UniverseMap } from './universe/UniverseMap';
import { Bridge } from './universe/Bridge';
import { SolarSystemView } from './universe/SolarSystemView';
import { CivilizationProfile } from './universe/CivilizationProfile';
import { WeaponsPanel } from './WeaponsPanel';
import { NextGoalBanner } from './NextGoalBanner';
import { Tutorial } from './Tutorial';
import styles from './MainScreen.module.css';

type PrimaryTab = 'build' | 'explore' | 'scan';

export function MainScreen() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [weaponsOpen, setWeaponsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [primary, setPrimary] = useState<PrimaryTab>('build');
  const [tutorialForce, setTutorialForce] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

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

  const onLogout = () => {
    clearGame();
    logout();
  };

  const lateAccent = civ.level >= 90;

  const onGoalAction = (action: 'build' | 'explore' | 'scan' | 'level' | 'contacts' | 'wait') => {
    if (action === 'build') setPrimary('build');
    else if (action === 'explore') setPrimary('explore');
    else if (action === 'scan' || action === 'contacts') setPrimary('scan');
    else if (action === 'level' && canLevel) void levelUp();
  };

  return (
    <div className={`${styles.layout} ${lateAccent ? styles.lateGame : ''}`}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Тёмный Лес: Терра Инкогнита</div>
          <Slogan compact />
        </div>
        <div className={styles.civQuick}>
          <span className={`${styles.user} mono muted`}>{user?.email}</span>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${styles.civBtn}`}
            data-tutorial="level-up"
            onClick={() => select({ kind: 'civilization' })}
          >
            {civ.name} · ур. {civ.level}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!canLevel}
            data-tutorial="level-up"
            onClick={() => void levelUp()}
            title="Стоимость повышения уровня"
          >
            Ур. ↑ <ResourceCost id="highEnergy" amount={nextCost} />
            {nextDe > 0 ? (
              <>
                {' '}
                <ResourceCost id="darkEnergy" amount={nextDe} />
              </>
            ) : null}
          </button>
          <div className={styles.moreWrap}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
            >
              Ещё ▾
            </button>
            {moreOpen && (
              <div className={styles.moreMenu} role="menu">
                <button type="button" role="menuitem" onClick={() => { setMapOpen(true); setMoreOpen(false); }}>
                  🌌 Вселенная
                </button>
                <button type="button" role="menuitem" onClick={() => { setBridgeOpen(true); setMoreOpen(false); }}>
                  🛰️ Рубка
                </button>
                <button type="button" role="menuitem" onClick={() => { setWeaponsOpen(true); setMoreOpen(false); }}>
                  ⚔️ Оружие
                </button>
                <button type="button" role="menuitem" onClick={() => { setSystemOpen(true); setMoreOpen(false); }}>
                  ☀️ Система
                </button>
                <button type="button" role="menuitem" onClick={() => { setProfileOpen(true); setMoreOpen(false); }}>
                  👤 Профиль
                </button>
                <button type="button" role="menuitem" onClick={() => { openShop(); setMoreOpen(false); }}>
                  🛒 Магазин
                </button>
                <button type="button" role="menuitem" onClick={() => { openLeaderboard(); setMoreOpen(false); }}>
                  🏆 Рейтинг
                </button>
                {civ.level >= 80 && (
                  <button type="button" role="menuitem" onClick={() => { openCosmos(); setMoreOpen(false); }}>
                    Космос
                  </button>
                )}
                {civ.level >= 90 && (
                  <button type="button" role="menuitem" onClick={() => { openPhysics(); setMoreOpen(false); }}>
                    Физика
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTutorialForce(true);
                    setMoreOpen(false);
                  }}
                >
                  🎓 Обучение
                </button>
                <button type="button" role="menuitem" onClick={() => setShowExtras((v) => !v)}>
                  {showExtras ? 'Скрыть детали' : 'Показать детали'}
                </button>
                {isAdmin && (
                  <button type="button" role="menuitem" onClick={() => { setAdminOpen(true); setMoreOpen(false); }}>
                    Админ
                  </button>
                )}
                <button type="button" role="menuitem" onClick={onLogout}>
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.metaRow}>
        <span className="tag" title="Радар">
          📡 {effRadar}
        </span>
        <span className="tag" title="Заметность">
          👁 {signalExposure?.toFixed(2) ?? '—'}
        </span>
        <span className="tag tag-gold" title="Процветание">
          ★ {formatNumber(civ.prosperityScore, 0)}
        </span>
        <span className="tag" title="Население">
          {formatPopulation(civ.population ?? 1_000_000)}
        </span>
        {traveling && <span className="tag">Межгалактика…</span>}
        <span className="tag" title="Кредиты">
          ◆ {premiumCredits ?? user?.premiumCredits ?? 0}
        </span>
      </div>

      <div data-tutorial="resources">
        <ResourceBar />
      </div>

      <NextGoalBanner onAction={onGoalAction} />

      <div className={styles.primaryRow} role="tablist" aria-label="Главные действия">
        <button
          type="button"
          role="tab"
          aria-selected={primary === 'build'}
          data-tutorial="primary-build"
          className={`${styles.primaryBtn} ${primary === 'build' ? styles.primaryActive : ''}`}
          onClick={() => setPrimary('build')}
        >
          <span className={styles.primaryIcon} aria-hidden>
            🏗️
          </span>
          <span className={styles.primaryLabel}>Строить</span>
          <span className={styles.primaryHint}>здания</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={primary === 'explore'}
          data-tutorial="primary-explore"
          className={`${styles.primaryBtn} ${primary === 'explore' ? styles.primaryActive : ''}`}
          onClick={() => setPrimary('explore')}
        >
          <span className={styles.primaryIcon} aria-hidden>
            🚀
          </span>
          <span className={styles.primaryLabel}>Исследовать</span>
          <span className={styles.primaryHint}>экспедиции</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={primary === 'scan'}
          data-tutorial="primary-scan"
          className={`${styles.primaryBtn} ${primary === 'scan' ? styles.primaryActive : ''}`}
          onClick={() => setPrimary('scan')}
        >
          <span className={styles.primaryIcon} aria-hidden>
            📡
          </span>
          <span className={styles.primaryLabel}>Сканировать</span>
          <span className={styles.primaryHint}>радар / контакты</span>
        </button>
      </div>

      <div className={styles.primaryPanel}>
        {primary === 'build' && (
          <div data-tutorial="building-collider">
            <BuildingsPanel />
          </div>
        )}
        {primary === 'explore' && <ExpeditionPanel />}
        {primary === 'scan' && (
          <div data-tutorial="contacts">
            <ContactsPanel />
            <div style={{ marginTop: '0.75rem' }}>
              <SystemPanel />
            </div>
          </div>
        )}
      </div>

      {showExtras && (
        <>
          <div className={styles.mainGrid}>
            <SystemPanel />
            <DetailPanel />
          </div>
          <div className={styles.secondaryGrid}>
            <ConstantsPanel />
            <Journal />
          </div>
          <div className={styles.tertiaryGrid}>
            <ArtifactsPanel />
            <AnomaliesPanel />
          </div>
        </>
      )}

      {!showExtras && (
        <div className={styles.compactExtras}>
          <DetailPanel />
          <Journal />
        </div>
      )}

      <DebugPanel />
      <DiplomacyPanel />
      <CombatPanel />
      <PremiumPanel />
      <LeaderboardPanel />
      <PhysicsLabPanel />
      <CosmosPanel />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
      <UniverseMap open={mapOpen} onClose={() => setMapOpen(false)} />
      <Bridge open={bridgeOpen} onClose={() => setBridgeOpen(false)} />
      <SolarSystemView
        open={systemOpen}
        onClose={() => setSystemOpen(false)}
        onColonized={() => void useGameStore.getState().refresh()}
      />
      <CivilizationProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
      <WeaponsPanel open={weaponsOpen} onClose={() => setWeaponsOpen(false)} />
      <Tutorial forceOpen={tutorialForce} onCloseForce={() => setTutorialForce(false)} />

      <footer className={styles.footer}>
        <span className="mono muted">
          Этап 12 · sid {civ.seed} · pop {formatPopulation(civ.population ?? 0)} · ★{' '}
          {civ.prosperityScore}
          {civ.level >= 90 ? ' · glitch' : ''}
        </span>
      </footer>
    </div>
  );
}
