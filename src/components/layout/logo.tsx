import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Wordmark.
 *
 * The mark is drawn rather than shipped as an asset: a champagne hairline
 * bracket around the "A" reads as a monogram at 24px and stays legible in
 * dark mode without a second file. `variant="mark"` renders the glyph alone
 * for the collapsed mobile header.
 */
export function Logo({
  variant = "full",
  className,
  href = "/",
}: {
  variant?: "full" | "mark";
  className?: string;
  href?: string | null;
}) {
  const glyph = (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          "relative grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-gold",
          "after:absolute after:inset-[3px] after:rounded-[7px] after:border after:border-accent/45",
        )}
      >
        <span className="font-display text-[15px] leading-none text-accent">A</span>
      </span>
      {variant === "full" ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.0625rem] font-medium tracking-[0.01em] text-heading">
            Aurelia
          </span>
          <span className="mt-1 text-[0.5625rem] font-medium uppercase tracking-[0.22em] text-subtle">
            Event Concierge
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return <span className={className}>{glyph}</span>;

  return (
    <Link
      href={href}
      aria-label="Aurelia — home"
      className={cn(
        "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {glyph}
    </Link>
  );
}