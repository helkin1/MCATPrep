import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap rounded-md transition-[background,color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-strong text-text-inverse hover:bg-accent shadow-sm",
        secondary:
          "bg-surface-3 text-text-1 hover:bg-surface-4",
        ghost:
          "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text-1",
        outline:
          "bg-transparent text-text-1 border border-border-strong hover:bg-surface-2 hover:border-border-focus",
        danger:
          "bg-danger/90 text-text-inverse hover:bg-danger",
        link:
          "bg-transparent text-text-2 hover:text-text-1 px-0 h-auto",
      },
      size: {
        xs: "h-6 px-2 text-[12px]",
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5 text-[13px]",
        lg: "h-10 px-4 text-[14px]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  );
});
