import { useToastStore } from '../store/toastStore';
import styles from './ToastStack.module.css';

export function ToastStack() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  if (!items.length) return null;
  return (
    <div className={styles.stack} aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.kind] ?? ''} ${t.kind}`}>
          <div className={styles.msg}>
            {t.title && <div className={styles.title}>{t.title}</div>}
            <div>{t.message}</div>
          </div>
          <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
