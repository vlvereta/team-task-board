import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'error' | 'success';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastContextValue {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = nextId.current++;
      // Keep at most three; a repeated identical message replaces the old one.
      setToasts((ts) => [
        ...ts
          .filter((t) => t.message !== message && (tone === 'error' ? true : t.tone === 'error'))
          .slice(-1),
        { id, message, tone },
      ]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:top-auto sm:bottom-0 sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Live regions are always rendered so screen readers pick up new text. */}
        <div role="alert" className="contents">
          {toasts
            .filter((t) => t.tone === 'error')
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
        <div role="status" className="contents">
          {toasts
            .filter((t) => t.tone !== 'error')
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const tone =
    toast.tone === 'error'
      ? 'bg-red-700 text-white'
      : toast.tone === 'success'
        ? 'bg-slate-900 text-white'
        : 'bg-slate-900 text-white';
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-lg py-1 pr-1 pl-4 text-sm shadow-lg motion-safe:animate-[toast-in_160ms_ease-out] ${tone}`}
      data-testid="toast"
    >
      {toast.tone === 'success' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-4 shrink-0 text-emerald-300"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <p className="min-w-0 flex-1 py-2 break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="focus-ring-light inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white"
        aria-label="Dismiss message"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
          <path d="M5.3 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.7 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4L10 8.6 5.3 4.3Z" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
