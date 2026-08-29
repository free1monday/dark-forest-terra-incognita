import { useEffect, useState } from 'react';
import styles from './OnboardingModal.module.css';

const STEPS = [
  {
    title: 'Вы — бог новой цивилизации',
    body: 'Задайте имя и константы развития. Вселенная детерминирована seed’ом сервера — каждое решение оставляет след.',
  },
  {
    title: 'Стройте и добывайте',
    body: 'Улучшайте коллайдер, узлы исследований и сенсоры. Высокие энергии — кровь прогресса до 60 уровня.',
  },
  {
    title: 'Исследуйте Терру Инкогниту',
    body: 'Экспедиции открывают артефакты, аномалии и чужие сигналы. Светимость растёт — вас могут заметить.',
  },
  {
    title: 'В Тёмном лесу вы не одни',
    body: 'Дипломатия с задержкой света, асинхронные удары, поздняя физика и межгалактика. Действуйте осторожно.',
  },
];

const KEY = 'df_onboarding_v1';

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;
  const s = STEPS[step];

  const finish = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`glass glow-border ${styles.card}`}>
        <div className={styles.step}>
          Обучение · {step + 1}/{STEPS.length}
        </div>
        <h2 className={styles.title}>{s.title}</h2>
        <p className={styles.body}>{s.body}</p>
        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === step ? styles.dotOn : ''}`} />
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={finish}>
            Пропустить
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep((x) => x + 1)}>
              Далее
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
              Начать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
