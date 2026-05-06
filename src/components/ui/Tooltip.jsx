import { useState, useRef, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip — minimal, no portal. Wraps a single child element and
 * shows a small floating label on hover/focus after a 400ms delay.
 *
 * Usage:
 *   <Tooltip label="Delete" side="top">
 *     <button>×</button>
 *   </Tooltip>
 */
export function Tooltip({
  label,
  side = "top",
  delay = 400,
  className,
  children,
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  if (!isValidElement(children)) return children;

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  const sideClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }[side];

  const trigger = cloneElement(children, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <span className="relative inline-flex">
      {trigger}
      {open && label && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-surface-4 px-2 py-1 text-[11px] font-medium text-text-1 shadow-md border border-border-strong",
            "animate-[tt-in_var(--dur-fast)_var(--ease-out)]",
            sideClass,
            className
          )}
        >
          {label}
        </span>
      )}
      <style>{`
        @keyframes tt-in {
          from { opacity: 0; transform: translate(var(--tx,-50%), 2px); }
          to { opacity: 1; }
        }
      `}</style>
    </span>
  );
}
