import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Mirrors docs/homepage-design-spec.html §09 "Badges & tags" — the same
// semantic colour pairings used for stock status, verticals and promos
// throughout the earlier mockups.
const badgeVariants = cva(
  "inline-flex items-center rounded-rk-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-rk-success-tint text-rk-success",
        alert: "bg-rk-alert-tint text-rk-alert",
        amber: "bg-rk-amber-tint text-rk-amber-deep",
        navy: "bg-rk-navy-tint text-rk-navy",
        lavender: "bg-rk-lavender-mist text-rk-lavender-deep",
        neutral: "bg-rk-n200 text-rk-n600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
