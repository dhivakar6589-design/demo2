"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Image with a guaranteed fallback.
 *
 * Remote photography (Unsplash/Pexels) is throttled and sometimes returns a 404
 * in constrained networks, which would otherwise leave a broken tile on a
 * marketplace card. Every image therefore renders through this component:
 * native optimisation when the host answers, a duotone placeholder while
 * loading, and a deterministic brand-tinted glyph if it never does.
 */

type SmartImageProps = Omit<React.ComponentProps<typeof Image>, "onError" | "src"> & {
  /** Accepts null so a listing without photography degrades instead of crashing. */
  src?: string | null;
  /** Two-letter monogram shown when nothing loads. */
  fallbackLabel?: string;
  /** Aspect ratio preset; omit to respect the parent's sizing. */
  ratio?: "media" | "card" | "portrait" | "tile" | "hero";
  /** Seed for the placeholder hue so cards don't all look identical. */
  seed?: string;
  priorityImage?: boolean;
  className?: string;
  wrapperClassName?: string;
};

const RATIO_CLASS: Record<NonNullable<SmartImageProps["ratio"]>, string> = {
  media: "aspect-media",
  card: "aspect-card",
  portrait: "aspect-portrait",
  tile: "aspect-tile",
  hero: "aspect-hero",
};

export function SmartImage({
  src,
  alt,
  ratio,
  fallbackLabel,
  seed,
  priorityImage,
  className,
  wrapperClassName,
  fill = true,
  ...props
}: SmartImageProps) {
  const [state, setState] = React.useState<"loading" | "ready" | "failed">(
    src ? "loading" : "failed",
  );

  // `next/image` allows static imports; only the string form can key a
  // placeholder hash, and null means "there is nothing to load".
  const source = typeof src === "string" ? src : null;

  // A new src deserves a fresh attempt; no src means the fallback is final.
  React.useEffect(() => {
    setState(source ? "loading" : "failed");
  }, [source]);

  const monogram = (fallbackLabel ?? (typeof alt === "string" ? alt : null) ?? "Aurelia")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // Deterministic tilt so a grid of fallbacks doesn't look like one flat block.
  const tilt = React.useMemo(() => {
    const key = seed ?? source ?? "";
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 360;
    return hash;
  }, [seed, source]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-surface-sunken",
        ratio && RATIO_CLASS[ratio],
        wrapperClassName,
      )}
      data-state={state}
    >
      {state !== "ready" ? (
        <div
          aria-hidden
          style={{ rotate: `${tilt > 180 ? -(tilt - 180) : tilt}deg` }}
          className={cn(
            "absolute -inset-1/4 grid place-items-center",
            "bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.14),transparent_58%)]",
            "bg-grid-fine bg-grid-tile opacity-60",
            state === "loading" && "skeleton",
          )}
        >
          {state === "failed" ? (
            <span className="font-display text-lg tracking-[0.08em] text-accent-muted/70">
              {monogram || "A"}
            </span>
          ) : null}
        </div>
      ) : null}

      {state !== "failed" && source ? (
        <Image
          {...props}
          src={source}
          alt={alt}
          fill={fill}
          priority={priorityImage}
          sizes={props.sizes ?? (ratio === "hero" ? "100vw" : "(max-width: 768px) 100vw, 33vw")}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
          className={cn(
            "object-cover transition-opacity duration-500 ease-swift",
            state === "ready" ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      ) : null}
    </div>
  );
}