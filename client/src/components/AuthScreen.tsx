import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/authStore';
import { Slogan } from './Slogan';
import styles from './AuthScreen.module.css';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!email.trim() || password.length < 8) {
      setLocalError('Email обязателен, пароль — минимум 8 символов.');
      return;
    }
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password);
    } catch {
      // error already in store
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    clearError();
    setLocalError(null);
  };

  return (
    <div className={styles.page}>
      <Slogan />
      <form className={`glass glow-border ${styles.card}`} onSubmit={onSubmit}>
        <h1 className={styles.heading}>
          {mode === 'login' ? 'Вход в систему' : 'Регистрация'}
        </h1>
        <p className="muted">
          Сервер — источник истины. Прогресс цивилизации хранится в базе данных.
        </p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => switchMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => switchMode('register')}
          >
            Регистрация
          </button>
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="founder@darkforest.local"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 8 символов"
            minLength={8}
            required
          />
        </div>

        {(localError || error) && (
          <div className={styles.error} role="alert">
            {localError || error}
          </div>
        )}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Синхронизация…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </div>

        <p className={styles.footnote}>
          MVP: один аккаунт — одна цивилизация. JWT хранится локально.
        </p>
      </form>
    </div>
  );
}
