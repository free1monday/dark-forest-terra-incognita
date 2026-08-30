import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { formatCostParts } from './icons/ResourceIcons';
import {
  IconPositronCannon,
  IconRelativisticDrop,
  IconTranqlucator,
} from './icons/ObjectIcons';
import { useGameStore } from '../store/gameStore';
import { formatNumber } from '../lib/format';
import styles from './WeaponsPanel.module.css';

type CatalogItem = {
  type: string;
  name: string;
  description: string;
  kind: string;
  cost: Record<string, number>;
  buildDurationSec: number;
  minCivLevel: number;
  consumable: boolean;
  requiresContact: boolean;
  effectSummary: string;
  unlocked: boolean;
  reasons: string[];
};

type WeaponRow = {
  id: string;
  type: string;
  name: string;
  status: string;
  readyAt: string;
  usedAt: string | null;
  etaSeconds: number;
};

function WeaponArt({ type }: { type: string }) {
  if (type === 'POSITRON_CANNON') return <IconPositronCannon size={44} />;
  if (type === 'TRANQLUCATOR') return <IconTranqlucator size={44} />;
  if (type === 'RELATIVISTIC_DROP') return <IconRelativisticDrop size={44} />;
  return <IconPositronCannon size={44} />;
}

export function WeaponsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contacts = useGameStore((s) => s.state?.contacts) ?? [];
  const applyState = useGameStore((s) => s.applyState);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [weapons, setWeapons] = useState<WeaponRow[]>([]);
  const [bonus, setBonus] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetId, setTargetId] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{
        catalog: CatalogItem[];
        weapons: WeaponRow[];
        tranqlucatorBonus: number;
      }>('/api/weapons');
      setCatalog(res.catalog);
      setWeapons(res.weapons);
      setBonus(res.tranqlucatorBonus ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal>
      <div className={styles.panel}>
        <header className={styles.head}>
          <div>
            <h2 className={styles.title}>Оружие</h2>
            <div className="muted" style={{ fontSize: '0.78rem' }}>
              Арсенал · транклюкатор: +{bonus} к обороне
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        </header>
        {error && <div className={styles.err}>{error}</div>}

        <div className={styles.section}>Цель для пушки / капли</div>
        <select
          className={styles.select}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">— контакт —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>

        <div className={styles.section}>Каталог</div>
        <div className={styles.grid}>
          {catalog.map((item) => (
            <div key={item.type} className={`${styles.card} ${!item.unlocked ? styles.locked : ''}`}>
              <div className={styles.cardTop}>
                <WeaponArt type={item.type} />
                <div>
                  <div className={styles.name}>{item.name}</div>
                  <div className="muted" style={{ fontSize: '0.72rem' }}>
                    {item.effectSummary}
                  </div>
                </div>
              </div>
              <p className={styles.desc}>{item.description}</p>
              <div className={styles.meta}>
                {formatCostParts(item.cost)}
                <div className="muted mono" style={{ fontSize: '0.72rem', marginTop: '0.35rem' }}>
                  ~{formatNumber(item.buildDurationSec / 3600, 1)} ч · ур. {item.minCivLevel}+
                </div>
              </div>
              {!item.unlocked && item.reasons[0] && (
                <div className="muted" style={{ fontSize: '0.75rem' }}>
                  {item.reasons[0]}
                </div>
              )}
              <button
                type="button"
                className="btn btn-sm btn-premium"
                disabled={!item.unlocked || busy}
                onClick={() => {
                  setBusy(true);
                  void apiFetch<{ state: unknown }>('/api/weapons/build', {
                    method: 'POST',
                    body: JSON.stringify({ type: item.type }),
                  })
                    .then((r) => {
                      applyState(r.state as never);
                      return load();
                    })
                    .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
                    .finally(() => setBusy(false));
                }}
              >
                Построить
              </button>
            </div>
          ))}
        </div>

        <div className={styles.section}>Арсенал</div>
        <div className={styles.list}>
          {weapons.length === 0 && (
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              Пусто. Заложите оружие на верфи.
            </div>
          )}
          {weapons.map((w) => (
            <div key={w.id} className={styles.row}>
              <WeaponArt type={w.type} />
              <div className={styles.rowInfo}>
                <strong>{w.name}</strong>
                <div className="mono muted" style={{ fontSize: '0.75rem' }}>
                  {w.status}
                  {w.status === 'BUILDING' ? ` · ${w.etaSeconds}s` : ''}
                </div>
              </div>
              {w.status === 'READY' && w.type !== 'TRANQLUCATOR' && (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy || !targetId}
                  onClick={() => {
                    setBusy(true);
                    void apiFetch<{ state: unknown }>(`/api/weapons/${w.id}/use`, {
                      method: 'POST',
                      body: JSON.stringify({ contactId: targetId }),
                    })
                      .then((r) => {
                        applyState(r.state as never);
                        return load();
                      })
                      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
                      .finally(() => setBusy(false));
                  }}
                >
                  Применить
                </button>
              )}
              {w.type === 'TRANQLUCATOR' && w.status === 'READY' && (
                <span className="tag">пассивно</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
