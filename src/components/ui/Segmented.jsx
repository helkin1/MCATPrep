import { cn } from "@/lib/utils";

/**
 * Segmented control — small group of mutually exclusive options.
 * Items: [{ value, label, icon? }]. Controlled via value/onChange.
 */
export function Segmented({ items, value, onChange, className, size = "md" }) {
  const sizeClass = {
    sm: "h-7 text-[12px] px-2",
    md: "h-8 text-[13px] px-2.5",
    lg: "h-9 text-[13px] px-3",
  }[size];

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 bg-surface-2 border border-border rounded-md",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-[5px] font-medium transition-[background,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
              sizeClass,
              active
                ? "bg-surface-4 text-text-1 shadow-sm"
                : "text-text-2 hover:text-text-1"
            )}
          >
            {Icon && <Icon size={13} />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
