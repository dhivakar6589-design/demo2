import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — status, category and verification markers.
 *
 * `tone` is semantic (success/warning/danger), while `outline`, `gold` and
 * `solid` are decorative variants for the places where a status colour would
 * be too loud — verification chips, category labels, price tiers.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium tracking-[-0.002em] transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-sunken text-body",
        outline: "border-line-strong bg-transparent text-body",
        gold: "border-accent/35 bg-accent-soft/70 text-accent-muted",
        solid: "border-transparent bg-primary text-primary-foreground",
        success: "border-success/25 bg-success-soft text-success",
        warning: "border-warning/28 bg-warning-soft text-warning",
        danger: "border-danger/25 bg-danger-soft text-danger",
        info: "border-info/25 bg-info-soft text-info",
        inverse: "border-white/20 bg-white/12 text-white backdrop-blur-sm",
      },
      size: {
        xs: "px-2 py-0.5 text-2xs",
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/** Small pill used for filters, tags and counts. */
function Pill({
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-all duration-200 ease-swift",
        active
          ? "border-accent/50 bg-accent-soft text-accent-muted shadow-xs"
          : "border-line bg-surface text-body hover:border-line-strong hover:text-heading",
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants, Pill };