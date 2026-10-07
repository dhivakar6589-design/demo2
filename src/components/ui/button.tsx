import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button
 *
 * Six variants × four sizes. Two rules the rest of the codebase relies on:
 *   • the default variant is champagne gold on midnight navy — the single
 *     highest-contrast action on any page, used sparingly;
 *   • every size's height is a multiple of 4px and never below 36px, so
 *     inline icon+label pairs stay on the same optical baseline.
 */
const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-swift disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md active:bg-primary/88",
        gold: "bg-accent text-accent-foreground shadow-gold hover:bg-accent/90 hover:shadow-[0_8px_26px_-6px_rgb(201_162_75/0.55)] active:bg-accent/85",
        secondary:
          "bg-surface text-heading border border-line shadow-xs hover:border-line-strong hover:bg-surface-raised hover:shadow-sm",
        outline:
          "border border-line bg-transparent text-heading hover:border-accent/55 hover:bg-accent-soft/45 hover:text-accent-muted",
        ghost:
          "text-body hover:bg-muted hover:text-heading active:bg-muted/80",
        link: "text-accent-muted underline-offset-4 hover:underline hover:text-accent",
        destructive:
          "bg-danger text-danger-foreground shadow-xs hover:bg-danger/90 active:bg-danger/88",
        inverse:
          "bg-white/95 text-[#0F1B2D] shadow-sm hover:bg-white active:bg-white/90",
        "inverse-outline":
          "border border-white/35 text-white hover:border-white/70 hover:bg-white/10",
      },
      size: {
        sm: "h-9 rounded-lg px-3.5 text-xs [&_svg]:size-3.5",
        md: "h-10 rounded-lg px-4.5 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-xl px-6 text-[0.9375rem] [&_svg]:size-[1.125rem]",
        xl: "h-14 rounded-xl px-8 text-base [&_svg]:size-5",
        icon: "size-10 rounded-lg [&_svg]:size-4",
        "icon-sm": "size-9 rounded-lg [&_svg]:size-4",
        "icon-lg": "size-12 rounded-xl [&_svg]:size-5",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Accessible label when the button is icon-only. */
  srLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      block,
      asChild = false,
      loading = false,
      srLabel,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={srLabel}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            <span className="sr-only">Working…</span>
            {asChild ? null : children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };