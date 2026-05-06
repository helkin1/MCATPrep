import { useEffect } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/**
 * Dialog — modal surface with backdrop blur, spring scale-in.
 * Replaces the legacy Modal. API is intentionally similar.
 */
export function Dialog({
  open,
  onClose,
  children,
  className,
  size = "md",
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-[dialog-fade_var(--dur-base)_var(--ease-out)]"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full bg-surface-2 border border-border rounded-2xl shadow-xl p-5",
          "animate-[dialog-scale_var(--dur-base)_var(--ease-out)]",
          sizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      <style>{`
        @keyframes dialog-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialog-scale {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function DialogHeader({ children, className }) {
  return (
    <div className={cn("mb-4 space-y-1", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }) {
  return (
    <h2 className={cn("text-[17px] font-semibold tracking-tight text-text-1", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className }) {
  return (
    <p className={cn("text-[13px] text-text-2", className)}>{children}</p>
  );
}

export function DialogFooter({ children, className }) {
  return (
    <div className={cn("mt-5 flex items-center justify-end gap-2", className)}>
      {children}
    </div>
  );
}
