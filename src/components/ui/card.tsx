import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — the primary surface.
 *
 * Elevation is expressed with a warm-tinted shadow plus a 1px hairline rather
 * than a heavier border, which is what keeps a dense marketplace page calm.
 * `interactive` adds the hover lift used on vendor and package cards.
 */

const cardBase =
  "relative rounded-2xl border border-line bg-surface text-body transition-[box-shadow,border-color,transform] duration-300 ease-swift";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    interactive?: boolean;
    padded?: boolean;
  }
>(({ className, interactive, padded = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      cardBase,
      padded && "p-6",
      interactive &&
        "cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift focus-visible:-translate-y-0.5 focus-visible:shadow-lift",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-display text-lg font-medium text-heading", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("measure text-sm text-body", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mt-4", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-5 flex items-center gap-3 border-t border-line pt-4", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

/** Elevated panel used for sticky booking cards and premium callouts. */
const CardPremium = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-accent/25 bg-surface shadow-[inset_0_0_0_1px_rgb(201_162_75/0.16),var(--shadow-lg)]",
        className,
      )}
      {...props}
    />
  ),
);
CardPremium.displayName = "CardPremium";

/** Dark, cinematic panel — used for stat hero strips and quote callouts. */
const CardInverse = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grain relative overflow-hidden rounded-2xl bg-gradient-navy text-[rgb(250_248_244)]",
        className,
      )}
      {...props}
    />
  ),
);
CardInverse.displayName = "CardInverse";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardPremium,
  CardInverse,
  cardBase,
};