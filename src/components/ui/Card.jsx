import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Surface — generic elevated background.
 * Use `level` to pick from the surface ramp.
 */
const surface = cva("transition-colors duration-[var(--dur-fast)]", {
  variants: {
    level: {
      0: "bg-bg",
      1: "bg-surface-1",
      2: "bg-surface-2",
      3: "bg-surface-3",
    },
    bordered: {
      true: "border border-border",
    },
    radius: {
      none: "",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    },
  },
  defaultVariants: { level: 1, radius: "lg" },
});

export const Surface = forwardRef(function Surface(
  { className, level, bordered, radius, as: Tag = "div", ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={cn(surface({ level, bordered, radius }), className)}
      {...props}
    />
  );
});

/**
 * Card — opinionated surface with padding + soft shadow.
 * Hover lift opt-in via `interactive`.
 */
const card = cva(
  "bg-surface-1 rounded-xl border border-border shadow-sm transition-[transform,background,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      interactive: {
        true: "cursor-pointer hover:bg-surface-2 hover:-translate-y-px hover:shadow-md",
      },
    },
    defaultVariants: { padding: "md" },
  }
);

export const Card = forwardRef(function Card(
  { className, padding, interactive, as: Tag = "div", ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={cn(card({ padding, interactive }), className)}
      {...props}
    />
  );
});

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-[15px] font-semibold tracking-tight text-text-1", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-[13px] text-text-2", className)} {...props}>
      {children}
    </p>
  );
}

export function SectionLabel({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "text-[11px] font-medium tracking-[0.04em] text-text-3 mb-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
