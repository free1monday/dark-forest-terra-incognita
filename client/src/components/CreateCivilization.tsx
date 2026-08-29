import { useState, type FormEvent } from 'react';
import { DEFAULT_FOCUSES, type CivilizationFocuses, type FocusKey, FOCUS_KEYS } from '@shared';
import { FOCUS_LABELS } from '../lib/labels';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Slogan } from './Slogan';
import styles from './CreateCivilization.module.css';

export function CreateCivilization() {
  const create = useGameStore((s) => s.createCivilization);
  const actionLoading = useGameStore((s) => s.actionLoading);
  const error = useGameStore((s) => s.error);
  const setHasCivilization = useAuthStore((s) => s.setHasCivilization);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [focuses, setFocuses] = useState<CivilizationFocuses>({ ...DEFAULT_FOCUSES });

  const setFocus = (key: FocusKey, value: number) => {
    setFocuses((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await create(name || 'Новая цивилизация', focuses);
      setHasCivilization(true);
    } catch {
      // store error
    }
  };

  return (
    <div className={styles.page}>
      <Slogan />
      <form className={`glass glow-border ${styles.card}`} onSubmit={onSubmit}>
        <div className={styles.topRow}>
          <h1 className={styles.heading}>Основание цивилизации</h1>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
            Выйти
          </button>
        </div>
        <p className="muted">
          Аккаунт: <span className="mono">{user?.email}</span>. Мир генерируется на сервере
          детерминированно по seed. Окрестности — <strong>Терра Инкогнита</strong>.
        </p>

        <div className="field">
          <label htmlFor="civ-name">Имя цивилизации</label>
          <input
            id="civ-name"
            type="text"
            maxLength={40}
            minLength={3}
            placeholder="Например: Содружество Нуль-Дуги"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <h2 className="panel-title">Начальные константы</h2>
        {FOCUS_KEYS.map((key) => (
          <div className="slider-row" key={key}>
            <label htmlFor={key}>{FOCUS_LABELS[key].name}</label>
            <span className="val">{focuses[key]}</span>
            <input
              id={key}
              type="range"
              min={0}
              max={100}
              value={focuses[key]}
              onChange={(e) => setFocus(key, Number(e.target.value))}
            />
            <span className={styles.hint}>{FOCUS_LABELS[key].desc}</span>
          </div>
        ))}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={actionLoading}>
            {actionLoading ? 'Генерация на сервере…' : 'Создать цивилизацию'}
          </button>
        </div>

        <p className={styles.footnote}>
          Правило тёмного леса: любой контакт потенциально опасен. Сильные сигналы привлекают
          внимание.
        </p>
      </form>
    </div>
  );
}
