import { useCallback, useEffect, useState } from 'react';
import * as adminApi from '../api/admin';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import styles from './AdminPanel.module.css';

type Tab = 'stats' | 'users' | 'civs' | 'detail';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminPanel({ open, onClose }: Props) {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const toast = useToastStore();
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.adminStats>> | null>(null);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof adminApi.adminUsers>> | null>(null);
  const [civs, setCivs] = useState<Awaited<ReturnType<typeof adminApi.adminCivilizations>> | null>(
    null
  );
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminApi.adminCivilization>> | null>(
    null
  );
  const [patch, setPatch] = useState({
    level: '',
    highEnergy: '',
    darkEnergy: '',
    fermions: '',
    premiumCredits: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await adminApi.adminStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminApi.adminUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCivs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCivs(await adminApi.adminCivilizations(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [q]);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.adminCivilization(id);
      setDetail(d);
      setSelectedId(id);
      setTab('detail');
      const m = d.meta as {
        level?: number;
        premiumCredits?: number;
        resources?: { highEnergy?: number; darkEnergy?: number; fermions?: number };
      };
      setPatch({
        level: String(m.level ?? ''),
        highEnergy: String(m.resources?.highEnergy ?? ''),
        darkEnergy: String(m.resources?.darkEnergy ?? ''),
        fermions: String(m.resources?.fermions ?? ''),
        premiumCredits: String(m.premiumCredits ?? ''),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !isAdmin) return;
    if (tab === 'stats') void loadStats();
    if (tab === 'users') void loadUsers();
    if (tab === 'civs') void loadCivs();
  }, [open, isAdmin, tab, loadStats, loadUsers, loadCivs]);

  if (!open || !isAdmin) return null;

  const onModify = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const body: Record<string, number> = {};
      if (patch.level !== '') body.level = Number(patch.level);
      if (patch.highEnergy !== '') body.highEnergy = Number(patch.highEnergy);
      if (patch.darkEnergy !== '') body.darkEnergy = Number(patch.darkEnergy);
      if (patch.fermions !== '') body.fermions = Number(patch.fermions);
      if (patch.premiumCredits !== '') body.premiumCredits = Number(patch.premiumCredits);
      const res = await adminApi.adminModify(selectedId, body);
      toast.success(res.message, 'Админ');
      await loadDetail(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка правки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.panel}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Админ-панель · Stage 9</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className={styles.tabs}>
          {(
            [
              ['stats', 'Статистика'],
              ['users', 'Пользователи'],
              ['civs', 'Цивилизации'],
              ['detail', 'Детали'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-sm ${tab === id ? 'btn-primary' : ''}`}
              onClick={() => setTab(id)}
              disabled={id === 'detail' && !selectedId}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className={styles.warn}>{error}</p>}
        {loading && <p className="muted mono">Загрузка…</p>}

        <div className={styles.body}>
          {tab === 'stats' && stats && (
            <div className={styles.stats}>
              {(
                [
                  ['users', 'Юзеры'],
                  ['civilizations', 'Цивилизации'],
                  ['destroyed', 'Уничтожено'],
                  ['expeditions', 'Экспедиции'],
                  ['combatActions', 'Бои'],
                  ['contacts', 'Контакты'],
                  ['purchases', 'Покупки'],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className={styles.stat}>
                  <b>{stats[k]}</b>
                  {label}
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && users && (
            <>
              <div className="muted">Всего: {users.total}</div>
              {users.users.map((u) => (
                <div key={u.id} className={styles.row}>
                  <div>
                    <div className="mono">{u.email}</div>
                    <div className="muted">
                      кр. {u.premiumCredits}
                      {u.isAdmin ? ' · ADMIN' : ''}
                      {u.civilization
                        ? ` · ${u.civilization.name} L${u.civilization.level}`
                        : ' · без цивилизации'}
                    </div>
                  </div>
                  {u.civilization && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void loadDetail(u.civilization!.id)}
                    >
                      Открыть
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'civs' && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="field"
                  style={{ flex: 1, margin: 0, padding: '0.45rem 0.6rem' }}
                  placeholder="Поиск имени / email / id"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button type="button" className="btn btn-sm" onClick={() => void loadCivs()}>
                  Искать
                </button>
              </div>
              {civs && (
                <>
                  <div className="muted">Всего: {civs.total}</div>
                  {civs.civilizations.map((c) => (
                    <div key={c.id} className={styles.row}>
                      <div>
                        <div>
                          {c.name} · L{c.level} · ★ {c.prosperityScore}
                        </div>
                        <div className="muted mono">
                          {c.user.email} · {c.galaxyName}
                          {c.isDestroyed ? ' · DESTROYED' : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => void loadDetail(c.id)}
                      >
                        Детали
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {tab === 'detail' && detail && (
            <>
              <div className="mono muted" style={{ fontSize: '0.75rem' }}>
                {(detail.meta as { name?: string }).name} · id {selectedId}
              </div>
              <div className={styles.form}>
                {(
                  [
                    ['level', 'Уровень'],
                    ['highEnergy', 'ВЭ'],
                    ['darkEnergy', 'ТЭ'],
                    ['fermions', 'ФМ'],
                    ['premiumCredits', 'Кредиты'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k}>
                    {label}
                    <input
                      value={patch[k]}
                      onChange={(e) => setPatch((p) => ({ ...p, [k]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={() => void onModify()}
              >
                Применить правки
              </button>
              <h3 className="panel-title">Журнал</h3>
              <div className={styles.journal}>
                {detail.journal.map((j) => (
                  <div key={j.id} style={{ marginBottom: 6 }}>
                    <strong>{j.title}</strong> · {j.type}
                    <div>{j.message}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
