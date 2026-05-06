import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const field = cva(
  "w-full bg-surface-2 text-text-1 placeholder:text-text-3 border border-border rounded-md transition-[border-color,box-shadow,background] duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none focus:border-border-focus focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-[13px]",
        md: "h-9 px-3 text-[13px]",
        lg: "h-10 px-3.5 text-[14px]",
      },
      invalid: {
        true: "border-danger focus:border-danger focus:ring-[color:var(--danger-soft)]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export const Input = forwardRef(function Input(
  { className, size, invalid, type = "text", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(field({ size, invalid }), className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        field({ size: "md", invalid }),
        "h-auto py-2 leading-relaxed resize-y",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select(
  { className, size, invalid, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        field({ size, invalid }),
        "appearance-none bg-[image:var(--select-caret)] bg-no-repeat bg-[length:14px] pr-8",
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%239aa0a6' stroke-width='1.5'><path d='M4 6l4 4 4-4'/></svg>\")",
        backgroundPosition: "right 10px center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "14px",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        "block text-[11px] font-medium tracking-[0.04em] text-text-2 mb-1.5",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <div className="mt-1 text-[12px] text-danger">{children}</div>;
}
