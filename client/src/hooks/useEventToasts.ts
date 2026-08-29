import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';

/** Notify on expedition finish, new contacts, combat reports, diplomacy delivery. */
export function useEventToasts() {
  const state = useGameStore((s) => s.state);
  const prev = useRef<{
    expActive?: boolean;
    contactCount?: number;
    combatReports?: number;
    journalHead?: string;
  }>({});

  useEffect(() => {
    if (!state) return;
    const toast = useToastStore.getState();
    const p = prev.current;
    const expActive = !!state.expedition?.active;
    if (p.expActive && !expActive) {
      toast.success('Экспедиция завершена. Проверьте журнал.', 'Терра Инкогнита');
    }
    const contacts = state.contacts?.length ?? 0;
    if (p.contactCount != null && contacts > p.contactCount) {
      toast.info('Обнаружен новый сигнал / контакт.', 'Сенсоры');
    }
    const reports = state.combatReports?.length ?? 0;
    if (p.combatReports != null && reports > p.combatReports) {
      toast.info('Боевой отчёт получен.', 'Бой');
    }
    const head = state.journal?.[0]?.id;
    if (p.journalHead && head && head !== p.journalHead) {
      const j = state.journal[0];
      if (j?.type === 'diplomacy' || j?.type === 'signal') {
        toast.info(j.title, 'Дипломатия');
      }
    }
    prev.current = {
      expActive,
      contactCount: contacts,
      combatReports: reports,
      journalHead: head,
    };
  }, [state]);
}
