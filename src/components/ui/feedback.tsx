import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────── Skeleton ────────────────────────────── */

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton h-4 w-full", className)} {...props} />;
}

/** Card-shaped placeholder that matches the vendor card's exact geometry. */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-surface", className)}>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="flex gap-4 border-b border-line bg-surface-raised px-5 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-40" : "w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/* ──────────────────────────────── Alert ─────────────────────────────── */

const alertVariants = cva("relative flex gap-3.5 rounded-xl border p-4", {
  variants: {
    tone: {
      info: "border-info/25 bg-info-soft/70 text-info",
      success: "border-success/25 bg-success-soft/70 text-success",
      warning: "border-warning/28 bg-warning-soft/70 text-warning",
      danger: "border-danger/25 bg-danger-soft/70 text-danger",
      neutral: "border-line bg-surface-sunken/70 text-body",
      gold: "border-accent/30 bg-accent-soft/60 text-accent-muted",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const ALERT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
  gold: Info,
} as const;

interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

function Alert({ className, tone = "neutral", title, icon, action, children, ...props }: AlertProps) {
  const Icon = ALERT_ICON[tone ?? "neutral"];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <span className="mt-px shrink-0 [&_svg]:size-[1.125rem]" aria-hidden>
        {icon ?? <Icon />}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-medium leading-snug">{title}</p> : null}
        <div className={cn("text-sm leading-relaxed opacity-95", title && "mt-1")}>{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ───────────────────────────── EmptyState ───────────────────────────── */

/**
 * Illustrated empty state. The illustration is drawn in SVG using brand
 * tokens rather than shipped as bitmap art, so it stays crisp at any size and
 * inherits theme colours automatically.
 */
function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-10 rounded-full bg-accent-soft blur-2xl" aria-hidden />
        {IconComponent ? (
          <div className="flex size-14 items-center justify-center rounded-2xl border border-line bg-surface shadow-sm">
            <IconComponent className="size-6 text-accent-muted" />
          </div>
        ) : (
          <EmptyGlyph />
        )}
      </div>
      <h3 className="font-display text-lg font-medium text-heading">{title}</h3>
      {description ? (
        <p className="measure mt-2 text-sm leading-relaxed text-body">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function EmptyGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="size-14" fill="none" aria-hidden>
      <rect x="8" y="14" width="32" height="24" rx="3" className="stroke-line-strong" strokeWidth="1.4" />
      <path d="M8 20h32" className="stroke-line-strong" strokeWidth="1.4" />
      <circle cx="24" cy="29" r="4" className="stroke-accent" strokeWidth="1.4" strokeDasharray="2 2" />
      <path d="M14 10v4M24 8v6M34 10v4" className="stroke-accent" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ──────────────────────────── ErrorState ────────────────────────────── */

function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-danger/25 bg-danger-soft/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-soft">
        <AlertCircle className="size-5 text-danger" />
      </div>
      <h3 className="font-display text-lg font-medium text-heading">{title}</h3>
      {description ? (
        <p className="measure mt-2 text-sm leading-relaxed text-body">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/* ─────────────────────────────── Divider ────────────────────────────── */

function Divider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  if (!label) return <div className={cn("h-px w-full bg-line", className)} />;
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-2xs font-medium uppercase tracking-[0.16em] text-subtle">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/* ───────────────────────────── StatBlock ────────────────────────────── */

function StatBlock({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "gold";
  className?: string;
}) {
  const tones = {
    neutral: "text-heading",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    gold: "text-accent-muted",
  };
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-overline">{label}</p>
      <p className={cn("tnum mt-1.5 font-display text-2xl font-medium leading-none tracking-tight", tones[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs leading-snug text-subtle">{hint}</p> : null}
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonStat,
  Alert,
  EmptyState,
  ErrorState,
  Divider,
  StatBlock,
  alertVariants,
};