import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Info, XCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Custom toast library. Drop-in for the subset of sonner's API used by this
// codebase: toast.success / toast.error / toast.info / toast.dismiss, with
// `duration` as the only supported option (use `Infinity` for persistent).
// ---------------------------------------------------------------------------

type Variant = 'success' | 'error' | 'info';

type ToastOptions = { duration?: number };

type ToastItem = {
  id: number;
  message: string;
  variant: Variant;
  duration: number;
};

// --- Minimal external store ------------------------------------------------
let nextId = 1;
let state: { toasts: ToastItem[] } = { toasts: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const addToast = (variant: Variant, message: string, options?: ToastOptions): number => {
  const id = nextId++;
  const duration = options?.duration ?? 4000;
  state = { toasts: [...state.toasts, { id, message, variant, duration }] };
  emit();
  return id;
};

const removeToast = (id: number) => {
  state = { toasts: state.toasts.filter((t) => t.id !== id) };
  emit();
};

// --- Public API ------------------------------------------------------------
export const toast = {
  success: (message: string, options?: ToastOptions) => addToast('success', message, options),
  error: (message: string, options?: ToastOptions) => addToast('error', message, options),
  info: (message: string, options?: ToastOptions) => addToast('info', message, options),
  dismiss: (id?: number) => {
    if (id == null) {
      state = { toasts: [] };
      emit();
    } else {
      removeToast(id);
    }
  },
};

// --- Toaster ---------------------------------------------------------------
export const Toaster = () => {
  const [snap, setSnap] = useState(() => state);
  useEffect(() => subscribe(() => setSnap(state)), []);

  return (
    <>
      <style>{`
        @keyframes ignite-toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div
        aria-live="polite"
        role="region"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[9999] flex flex-col items-center gap-2 px-4"
      >
        {snap.toasts.map((t) => (
          <ToastItemView key={t.id} item={t} />
        ))}
      </div>
    </>
  );
};

// --- Per-toast view --------------------------------------------------------
const VARIANTS: Record<Variant, { icon: React.ReactNode; bar: string }> = {
  success: {
    icon: <CheckCircle size={18} weight="fill" className="shrink-0 text-green-500" />,
    bar: 'bg-green-500',
  },
  error: {
    icon: <XCircle size={18} weight="fill" className="shrink-0 text-destructive" />,
    bar: 'bg-destructive',
  },
  info: {
    icon: <Info size={18} weight="fill" className="shrink-0 text-primary" />,
    bar: 'bg-primary',
  },
};

const ANIM_MS = 180;

const ToastItemView = ({ item }: { item: ToastItem }) => {
  const { icon, bar } = VARIANTS[item.variant];
  const persistent = !isFinite(item.duration);

  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(item.duration);

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => removeToast(item.id), ANIM_MS);
  };

  const arm = () => {
    if (persistent) return;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    startedAtRef.current = Date.now();
    // setTimeout keeps ticking in background tabs (throttled, but it fires),
    // which is the whole point of the custom lib.
    timeoutRef.current = window.setTimeout(close, remainingRef.current);
  };

  const onEnter = () => {
    if (persistent || timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    remainingRef.current -= Date.now() - startedAtRef.current;
    setPaused(true);
  };

  const onLeave = () => {
    if (persistent || timeoutRef.current !== null) return;
    setPaused(false);
    arm();
  };

  // Mount: trigger enter transition + start the dismissal timer
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    arm();
    return () => {
      cancelAnimationFrame(raf);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dataState = leaving ? 'leaving' : entered ? 'entered' : 'entering';

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      data-state={dataState}
      className={cn(
        'pointer-events-auto relative flex w-[380px] max-w-full items-center gap-3 overflow-hidden rounded-lg border border-border bg-popover px-4 py-3 font-main text-sm text-popover-foreground shadow-lg transition-[opacity,transform] ease-out',
        'data-[state=entering]:translate-y-2 data-[state=entering]:opacity-0',
        'data-[state=entered]:translate-y-0 data-[state=entered]:opacity-100',
        'data-[state=leaving]:translate-y-2 data-[state=leaving]:opacity-0',
      )}
      style={{ transitionDuration: `${ANIM_MS}ms` }}
    >
      {icon}
      <span className="min-w-0 flex-1 break-words">{item.message}</span>
      <button
        type="button"
        onClick={close}
        className="shrink-0 rounded-md border border-border/70 bg-transparent px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
      >
        Dismiss
      </button>
      {!persistent && (
        <span
          aria-hidden
          className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-70', bar)}
          style={{
            animation: `ignite-toast-progress ${item.duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}
    </div>
  );
};
