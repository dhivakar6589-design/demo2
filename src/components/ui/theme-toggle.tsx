"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/**
 * Theme switch. Rendered as a 3-up segmented control rather than a toggle so
 * "system" is reachable — a simple light/dark toggle strands users who want
 * their OS preference.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // The server can't know the resolved theme; render the control unselected
  // until hydration instead of guessing and flashing the wrong icon.
  React.useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        const showFallbackRing = mounted && value === "system" && resolvedTheme;
        return (
          <Tooltip key={value} label={label}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                "grid size-8 place-items-center rounded-md text-subtle transition-colors duration-200",
                "hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active && "bg-primary text-primary-foreground hover:text-primary-foreground",
                showFallbackRing && !active && "text-heading",
              )}
            >
              <Icon className="size-4" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}