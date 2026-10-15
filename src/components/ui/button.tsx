import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Mirrors docs/homepage-design-spec.html §09 "Buttons" exactly: same four
// variants, same hover/active/disabled/loading state transitions.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-rk-pill font-semibold text-sm transition-[transform,box-shadow,background-color] duration-200 ease-out disabled:cursor-not-allowed disabled:bg-rk-n400 disabled:text-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-rk-blue focus-visible:outline-offset-2 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-rk-navy text-white hover:bg-[#262A85] hover:shadow-[0_8px_18px_-8px_rgba(27,30,109,0.5)] active:bg-[#141655]",
        amber:
          "bg-rk-amber text-rk-navy hover:bg-[#D97F18] hover:shadow-[0_8px_18px_-8px_rgba(217,127,24,0.5)]",
        outline:
          "bg-transparent text-rk-navy shadow-[inset_0_0_0_1.5px_var(--rk-navy)] hover:bg-rk-navy-tint",
        ghost: "bg-transparent px-3.5 text-rk-navy hover:bg-rk-lavender-mist",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-4 py-1.5 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    // Radix's Slot requires exactly one React element child (it clones and
    // merges props onto it) — the loading spinner is a second sibling
    // node, so it can only ever render in the native <button> case, never
    // when asChild wraps something like a <Link>.
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          loading && "relative text-transparent",
          className,
        )}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {children}
        {loading && (
          <span
            className="absolute size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
