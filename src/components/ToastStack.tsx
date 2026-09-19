import type { ToastMessage } from '../types';

interface Props {
  toasts: ToastMessage[];
}

const ICONS: Record<ToastMessage['kind'], string> = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️',
};

export default function ToastStack({ toasts }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span>{ICONS[t.kind]}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
