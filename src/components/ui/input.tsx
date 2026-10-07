import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────── Label ────────────────────────────────── */

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "flex items-center gap-1.5 text-xs font-medium tracking-[0.01em] text-heading",
      className,
    )}
    {...props}
  >
    {children}
    {required ? (
      <span className="text-danger" aria-hidden>
        *
      </span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";

/* ─────────────────────────── Input family ────────────────────────────── */

const fieldBase =
  "flex w-full rounded-lg border border-input bg-surface text-sm text-heading shadow-xs transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-subtle focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-danger/55 aria-[invalid=true]:shadow-[0_0_0_3px_rgb(161_60_60/0.12)]";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon rendered at the leading edge; reserves 2.25rem of padding. */
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  inputSize?: "sm" | "md" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, trailing, inputSize = "md", ...props }, ref) => {
    const heights = {
      sm: "h-9",
      md: "h-11",
      lg: "h-12",
    }[inputSize];

    return (
      <div className="relative w-full">
        {icon ? (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-subtle [&_svg]:size-4"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          ref={ref}
          className={cn(
            fieldBase,
            heights,
            "px-3.5",
            icon && "pl-10.5",
            trailing && "pr-10.5",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(fieldBase, "min-h-[6rem] resize-y px-3.5 py-3 leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* ────────────────────────────── Select ───────────────────────────────── */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: "sm" | "md" | "lg" }
>(({ className, children, size = "md", ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      fieldBase,
      size === "sm" ? "h-9" : size === "lg" ? "h-12" : "h-11",
      "items-center justify-between gap-2 px-3.5 text-left [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 text-subtle transition-transform duration-200 data-[state=open]:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "relative z-50 max-h-96 min-w-[9rem] overflow-hidden rounded-xl border border-line bg-surface text-body shadow-[var(--shadow-xl)]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-3 pr-8 text-sm text-body outline-none transition-colors",
      "focus:bg-muted focus:text-heading data-[state=checked]:text-heading data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
      <Check className="size-3.5 text-accent-muted" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-3 py-1.5 text-2xs font-medium uppercase tracking-[0.14em] text-subtle", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-line", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

/* ───────────────────────────── Checkbox ──────────────────────────────── */

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-[1.125rem] shrink-0 rounded-[5px] border border-input bg-surface shadow-xs transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground",
      "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-foreground",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === "indeterminate" ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : (
        <Check className="size-3" strokeWidth={3.5} />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

/* ────────────────────────────── Switch ───────────────────────────────── */

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[1.375rem] w-[2.5rem] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      "data-[state=unchecked]:bg-line-strong data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-swift data-[state=checked]:translate-x-[1.125rem] data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/* ──────────────────────────── RadioGroup ─────────────────────────────── */

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2.5", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square size-[1.125rem] shrink-0 rounded-full border border-input bg-surface text-accent-muted shadow-xs transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      "data-[state=checked]:border-accent disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="size-2 rounded-full bg-accent" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";

/* ──────────────────────── Selectable card row ────────────────────────── */

function SelectableCard({
  selected,
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ease-swift",
        selected
          ? "border-accent/50 bg-accent-soft/50 shadow-[inset_0_0_0_1px_rgb(201_162_75/0.2)]"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-raised",
        className,
      )}
      {...props}
    />
  );
}

export {
  Label,
  Input,
  Textarea,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  Checkbox,
  Switch,
  RadioGroup,
  RadioGroupItem,
  SelectableCard,
  fieldBase,
};