import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastCtx = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    const id = nextId++;
    const t = {
      id,
      variant: "default",
      duration: 4000,
      ...(typeof opts === "string" ? { title: opts } : opts),
    };
    setToasts((cur) => [...cur, t]);
    if (t.duration) {
      setTimeout(() => dismiss(id), t.duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const variants = {
    default: { Icon: Info, color: "text-text-2" },
    success: { Icon: CheckCircle2, color: "text-success" },
    error: { Icon: AlertCircle, color: "text-danger" },
    warn: { Icon: AlertCircle, color: "text-warn" },
  };
  const { Icon, color } = variants[toast.variant] || variants.default;

  return (
    <div
      className={cn(
        "pointer-events-auto bg-surface-2 border border-border-strong rounded-lg shadow-lg p-3 flex items-start gap-2.5",
        "transition-[transform,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        enter ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      )}
    >
      <Icon size={16} className={cn("mt-0.5 flex-shrink-0", color)} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-[13px] font-medium text-text-1">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-[12px] text-text-2 mt-0.5">{toast.description}</div>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-text-3 hover:text-text-1 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
