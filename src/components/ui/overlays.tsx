import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────── Dialog ──────────────────────────────── */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[rgb(15_27_45/0.55)] backdrop-blur-[3px]",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

/**
 * Content is centred, max 34rem by default. The title is rendered inside a
 * header with a hairline rather than using the built-in Title element, because
 * every dialog here has a compact two-line header, not a giant centred heading.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: "sm" | "md" | "lg" | "xl";
    hideClose?: boolean;
  }
>(({ className, children, size = "md", hideClose, ...props }, ref) => {
  const widths = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-bottom-2",
          "duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]",
          widths,
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose ? (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("shrink-0 border-b border-line px-6 py-5 pr-14", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 flex flex-col-reverse gap-2.5 border-t border-line bg-surface-raised/60 px-6 py-4 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-xl font-medium text-heading", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("mt-1 text-sm leading-relaxed text-body", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

/* ────────────────────────── AlertDialog ─────────────────────────────── */

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(15_27_45/0.55)] backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-2xl",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-300",
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg font-medium text-heading", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("mt-2 text-sm leading-relaxed text-body", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-transform duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
      className,
    )}
    {...props}
  />
));
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-heading transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = "AlertDialogCancel";

/* ─────────────────────────────── Tabs ───────────────────────────────── */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: "underline" | "pill" }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center",
      variant === "underline"
        ? "no-scrollbar gap-6 overflow-x-auto border-b border-line"
        : "gap-1 rounded-xl border border-line bg-surface-sunken p-1",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { variant?: "underline" | "pill" }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative whitespace-nowrap text-sm font-medium text-subtle transition-colors duration-200 hover:text-heading",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:text-heading",
      variant === "underline"
        ? "px-0.5 pb-3 pt-1 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:ease-swift data-[state=active]:after:scale-x-100"
        : "h-9 rounded-lg px-3.5 data-[state=active]:bg-surface data-[state=active]:text-heading data-[state=active]:shadow-xs",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-6 focus-visible:outline-none data-[state=active]:animate-fade-up",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

/* ──────────────────────────── Accordion ─────────────────────────────── */

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("group border-b border-line last:border-b-0", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between gap-4 py-4 text-left text-[0.9375rem] font-medium text-heading transition-colors hover:text-accent-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&[data-state=open]]:text-accent-muted",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 text-subtle transition-transform duration-300 ease-swift group-data-[state=open]:rotate-180" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("measure pb-5 text-sm leading-relaxed text-body", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

/* ───────────────────────────── Tooltip ───────────────────────────────── */

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-64 overflow-hidden rounded-lg bg-primary px-2.5 py-1.5 text-2xs font-medium leading-snug text-primary-foreground shadow-lg",
        "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

function Tooltip({
  label,
  children,
  side = "top",
  asChild,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  asChild?: boolean;
}) {
  if (!label) return <>{children}</>;
  return (
    <TooltipRoot>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </TooltipRoot>
  );
}

/* ───────────────────────────── Popover ──────────────────────────────── */

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-xl border border-line bg-surface p-4 text-body shadow-[var(--shadow-xl)] outline-none",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

/* ───────────────────────────── Avatar ───────────────────────────────── */

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: "xs" | "sm" | "md" | "lg" | "xl" }
>(({ className, size = "md", ...props }, ref) => {
  const sizes = {
    xs: "size-6",
    sm: "size-8",
    md: "size-10",
    lg: "size-14",
    xl: "size-20",
  }[size];
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full border border-line bg-surface-sunken",
        sizes,
        className,
      )}
      {...props}
    />
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-accent-soft font-display text-xs font-medium text-accent-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

/* ──────────────────────────── Progress ──────────────────────────────── */

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { tone?: string }
>(({ className, value, tone, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value}
    className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 rounded-full bg-accent transition-transform duration-500 ease-swift", tone)}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

/* ──────────────────────────── Separator ─────────────────────────────── */

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-line",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Progress,
  Separator,
};