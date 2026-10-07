"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

/**
 * Range slider with one or two thumbs.
 *
 * Built on Radix rather than a native range input so the two-thumb budget
 * control gets real keyboard support (arrow keys step each handle) and the
 * same track/rail treatment as everything else on the site.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  minStepsBetweenThumbs = 0,
  className,
  "aria-label": ariaLabel,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  minStepsBetweenThumbs?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const count = Math.max(value.length, 1);

  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={minStepsBetweenThumbs}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      aria-label={ariaLabel}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-sunken">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={cn(
            "block size-4 rounded-full border-2 border-accent bg-surface shadow-sm transition-shadow duration-150",
            "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}