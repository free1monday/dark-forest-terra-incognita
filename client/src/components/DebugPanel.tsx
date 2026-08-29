import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import styles from './DebugPanel.module.css';

export function DebugPanel() {
  const [open, setOpen] = useState(import.meta.env.DEV);
  const debugAddHighEnergy = useGameStore((s) => s.debugAddHighEnergy);
  const debugAddFermions = useGameStore((s) => s.debugAddFermions);
  const debugGrantAllResources = useGameStore((s) => s.debugGrantAllResources);
  const debugLevelUp = useGameStore((s) => s.debugLevelUp);
  const debugSetLevel = useGameStore((s) => s.debugSetLevel);
  const debugGrantArtifact = useGameStore((s) => s.debugGrantArtifact);
  const debugOpen4D = useGameStore((s) => s.debugOpen4D);
  const debugRandomContact = useGameStore((s) => s.debugRandomContact);
  const debugBumpExposure = useGameStore((s) => s.debugBumpExposure);
  const debugSimulateDetected = useGameStore((s) => s.debugSimulateDetected);
  const debugDiplomacyDeliverAll = useGameStore((s) => s.debugDiplomacyDeliverAll);
  const debugDiplomacyResetMetrics = useGameStore((s) => s.debugDiplomacyResetMetrics);
  const debugDiplomacyResources = useGameStore((s) => s.debugDiplomacyResources);
  const debugCombatResolveAll = useGameStore((s) => s.debugCombatResolveAll);
  const debugCombatResources = useGameStore((s) => s.debugCombatResources);
  const addCreditsDebug = useGameStore((s) => s.addCreditsDebug);
  const recalculateProsperity = useGameStore((s) => s.recalculateProsperity);
  const openCombat = useGameStore((s) => s.openCombat);
  const openShop = useGameStore((s) => s.openShop);
  const openLeaderboard = useGameStore((s) => s.openLeaderboard);
  const openPhysics = useGameStore((s) => s.openPhysics);
  const openCosmos = useGameStore((s) => s.openCosmos);
  const debugGrantDarkEnergy = useGameStore((s) => s.debugGrantDarkEnergy);
  const debugCompleteGalaxyTravel = useGameStore((s) => s.debugCompleteGalaxyTravel);
  const resetSave = useGameStore((s) => s.resetSave);
  const setHasCivilization = useAuthStore((s) => s.setHasCivilization);
  const state = useGameStore((s) => s.state);

  if (!state || !import.meta.env.DEV) return null;

  return (
    <div className={`glass ${styles.wrap}`}>
      <button
        type="button"
        className={`btn btn-ghost btn-sm ${styles.toggle}`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Скрыть DEBUG' : 'DEBUG'}
      </button>
      {open && (
        <div className={styles.row}>
          <button type="button" className="btn btn-sm" onClick={() => void debugAddHighEnergy(500)}>
            +500 ВЭ
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugAddFermions(25)}>
            +25 ФМ
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugGrantAllResources()}>
            Дать все ресурсы
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugLevelUp()}>
            +1 уровень
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugSetLevel(15)}>
            Ур. 15
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugSetLevel(25)}>
            Ур. 25
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugSetLevel(60)}>
            Ур. 60
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugSetLevel(80)}>
            Ур. 80
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugSetLevel(90)}>
            Ур. 90
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugGrantDarkEnergy(50000)}>
            +50k ТЭ
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openPhysics()}>
            Physics Lab
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openCosmos()}>
            Космос
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugCompleteGalaxyTravel()}>
            Finish travel
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugGrantArtifact()}>
            Случайный артефакт
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugOpen4D()}>
            Открыть 4D-разлом
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugRandomContact()}>
            Случайный контакт
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugBumpExposure()}>
            +signalExposure
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugSimulateDetected()}>
            Нас обнаружили (sim)
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugDiplomacyResources()}>
            Diplo ресурсы
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugDiplomacyDeliverAll()}>
            Deliver all diplo
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugDiplomacyResetMetrics()}>
            Reset trust/tension
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugCombatResources()}>
            Combat ресурсы
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void debugCombatResolveAll()}>
            Resolve all combat
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openCombat(null)}>
            Combat (self)
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void addCreditsDebug(1000)}>
            +1000 кредитов
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void recalculateProsperity()}>
            Recalc prosperity
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openShop()}>
            Магазин
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openLeaderboard()}>
            Рейтинг
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (confirm('Сбросить цивилизацию на сервере?')) {
                void resetSave().then(() => setHasCivilization(false));
              }
            }}
          >
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}
