import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import styles from './PremiumPanel.module.css';

export function PremiumPanel() {
  const open = useGameStore((s) => s.shopOpen);
  const close = useGameStore((s) => s.closeShop);
  const state = useGameStore((s) => s.state);
  const purchase = useGameStore((s) => s.purchaseShopItem);
  const addCredits = useGameStore((s) => s.addCreditsDebug);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const error = useGameStore((s) => s.error);
  const lastReport = useGameStore((s) => s.lastReport);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [tab, setTab] = useState<'resource' | 'capacity'>('resource');

  useEffect(() => {
    const onUp = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.premiumCredits != null) setUser(detail);
    };
    window.addEventListener('df-user-update', onUp);
    return () => window.removeEventListener('df-user-update', onUp);
  }, [setUser]);

  const items = useMemo(() => {
    const all = state?.shopCatalog ?? [];
    return all.filter((i) => i.category === tab);
  }, [state, tab]);

  if (!open || !state) return null;

  const credits = state.premiumCredits ?? user?.premiumCredits ?? 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass ${styles.panel}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Магазин · Эфирные кредиты</h2>
            <p className={styles.sub}>
              Премиум-валюта. За кредиты — только высокие энергии и фермионы (+ ёмкости).
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Закрыть
          </button>
        </div>

        <div className={styles.balance}>
          <span className={styles.credits}>◆ {credits} кр.</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void addCredits(1000)}
            title="MVP-заглушка пополнения"
          >
            Пополнить (+1000)
          </button>
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            Реальные платежи не подключены (Этап 7 mock).
          </span>
        </div>
        <p className={styles.rule}>
          Запрещено: антиматерия, тёмная энергия, тёмная материя, покупка уровней.
        </p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${tab === 'resource' ? styles.tabActive : ''}`}
            onClick={() => setTab('resource')}
          >
            Ресурсы
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${tab === 'capacity' ? styles.tabActive : ''}`}
            onClick={() => setTab('capacity')}
          >
            Ёмкость
          </button>
        </div>

        <div className={styles.grid}>
          {items.map((item) => {
            const gold = item.premiumTier === 'gold';
            const can = credits >= item.costCredits && !actionLoading;
            return (
              <div
                key={item.key}
                className={`${styles.card} ${gold ? styles.cardGold : ''}`}
              >
                <div className={styles.cardName}>{item.name}</div>
                <div className={styles.cardDesc}>{item.description}</div>
                <div className={styles.cardMeta}>
                  <span className={styles.cost}>{item.costCredits} кр.</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={!can}
                    onClick={() => void purchase(item.key)}
                  >
                    Купить
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className={styles.warn}>{error}</p>}
        {lastReport && !error && (
          <p className="muted" style={{ fontSize: '0.78rem', margin: 0 }}>
            {lastReport}
          </p>
        )}

        <div className={styles.footer}>
          <span>
            ВЭ {state.resources.highEnergy}/{state.resources.capacities.highEnergy} · ФМ{' '}
            {state.resources.fermions}/{state.resources.capacities.fermions}
          </span>
          <span className="mono">Stage 7 · shop</span>
        </div>
      </div>
    </div>
  );
}
