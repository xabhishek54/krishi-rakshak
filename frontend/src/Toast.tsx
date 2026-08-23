import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-500', text: 'text-green-800' },
  error:   { bg: 'bg-red-50',   border: 'border-red-200',   icon: 'bg-red-500',   text: 'text-red-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-500', text: 'text-amber-800' },
  info:    { bg: 'bg-blue-50',  border: 'border-blue-200',  icon: 'bg-blue-500',  text: 'text-blue-800' },
};

function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);
  const c = COLORS[toast.type];

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onRemove, 300);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg max-w-sm w-full ${c.bg} ${c.border}
        transition-all duration-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <div className={`${c.icon} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
        {ICONS[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${c.text}`}>{toast.title}</p>
        {toast.message && <p className={`text-xs mt-0.5 opacity-80 ${c.text}`}>{toast.message}</p>}
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onRemove, 300); }}
        className={`text-xs font-bold opacity-50 hover:opacity-100 transition-opacity ${c.text} shrink-0`}>✕</button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toast = {
    success: (title: string, message?: string) => addToast('success', title, message),
    error:   (title: string, message?: string) => addToast('error',   title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
    info:    (title: string, message?: string) => addToast('info',    title, message),
  };

  return { toasts, removeToast, toast };
}
