import { useState, type FormEvent } from 'react';
import {
  DEFAULT_FOCUSES,
  type CivilizationFocuses,
  type FocusKey,
  FOCUS_KEYS,
  SPECIES_IDS,
  SPECIES_LABELS_RU,
  SPECIES_BONUSES,
  POLITICAL_REGIME_IDS,
  POLITICAL_REGIME_LABELS_RU,
  GOVERNMENTS_BY_SPECIES,
  GOVERNMENT_LABELS_RU,
  defaultGovernment,
  type SpeciesId,
  type PoliticalRegimeId,
  type GovernmentFormId,
} from '@shared';
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
  const [species, setSpecies] = useState<SpeciesId>('HUMAN');
  const [regime, setRegime] = useState<PoliticalRegimeId>('DEMOCRACY');
  const [government, setGovernment] = useState<GovernmentFormId>(defaultGovernment('HUMAN'));

  const setFocus = (key: FocusKey, value: number) => {
    setFocuses((f) => ({ ...f, [key]: value }));
  };

  const onSpecies = (sp: SpeciesId) => {
    setSpecies(sp);
    setGovernment(defaultGovernment(sp));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await create(name || 'Новая цивилизация', focuses, {
        species,
        politicalRegime: regime,
        governmentForm: government,
      });
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
          Аккаунт: <span className="mono">{user?.email}</span>. Мир и солнечная система
          генерируются на сервере по seed. Окрестности — <strong>Терра Инкогнита</strong>.
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

        <h2 className="panel-title">Раса</h2>
        <div className={styles.chipRow}>
          {SPECIES_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`btn btn-sm ${species === id ? 'btn-premium' : 'btn-ghost'}`}
              onClick={() => onSpecies(id)}
              title={SPECIES_BONUSES[id].descriptionRu}
            >
              {SPECIES_LABELS_RU[id]}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          {SPECIES_BONUSES[species].descriptionRu}
        </p>

        <h2 className="panel-title">Форма правления</h2>
        <div className={styles.chipRow}>
          {GOVERNMENTS_BY_SPECIES[species].map((g) => (
            <button
              key={g}
              type="button"
              className={`btn btn-sm ${government === g ? 'btn-premium' : 'btn-ghost'}`}
              onClick={() => setGovernment(g)}
            >
              {GOVERNMENT_LABELS_RU[g]}
            </button>
          ))}
        </div>

        <h2 className="panel-title">Политический режим</h2>
        <div className={styles.chipRow}>
          {POLITICAL_REGIME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`btn btn-sm ${regime === id ? 'btn-premium' : 'btn-ghost'}`}
              onClick={() => setRegime(id)}
            >
              {POLITICAL_REGIME_LABELS_RU[id]}
            </button>
          ))}
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
