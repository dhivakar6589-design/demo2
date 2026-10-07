"use client";

/**
 * Motion primitives.
 *
 * Rules encoded here rather than left to each call site:
 *   • durations stay in the 200–400ms band the brand calls for;
 *   • easing is `easeOut`-family only — nothing overshoots on a luxury site;
 *   • every component honours prefers-reduced-motion by rendering statically;
 *   • animations are transform/opacity only, so they stay on the compositor.
 */

import * as React from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
  useMotionValue,
  useSpring,
  type Transition,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ───────────────────────────── Base easing ───────────────────────────── */

export const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
export const EASE_ENTRANCE: Transition["ease"] = [0.16, 1, 0.3, 1];

/* ─────────────────────────────── Variants ────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_ENTRANCE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: EASE_ENTRANCE } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_ENTRANCE } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_ENTRANCE } },
};

/** Container that staggers its children — the workhorse for card grids. */
export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.075, delayChildren: 0.04 },
  },
};

/* ────────────────────────────── Components ───────────────────────────── */

interface RevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  /** Delay in seconds — use sparingly, prefer `stagger`. */
  delay?: number;
  as?: "div" | "section" | "li" | "article" | "header";
  className?: string;
}

/**
 * Fade-and-rise on scroll into view. Fires once; content that is already in
 * the viewport on load animates immediately after hydration.
 */
export function Reveal({ children, delay = 0, className, as = "div", ...rest }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px -8% 0px" });
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={fadeUp}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/** Staggered container — pair with `StaggerItem`. */
export function StaggerGroup({
  children,
  className,
  amount = 0.15,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  amount?: number;
  as?: "div" | "ul" | "section";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={staggerParent}
      viewport={{ once: true, amount }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <MotionTag className={className} variants={fadeUp}>
      {children}
    </MotionTag>
  );
}

/**
 * Scroll-linked progress bar used at the top of long detail pages.
 * Uses a spring so it tracks momentum without jitter on trackpads.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScrollProgress();
  const scaleX = useSpring(scrollYProgress, { stiffness: 240, damping: 34, mass: 0.4 });
  const reduce = useReducedMotion();

  if (reduce) return null;

  return (
    <motion.div
      style={{ scaleX }}
      className={cn(
        "fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-gold",
        className,
      )}
      aria-hidden
    />
  );
}

function useScrollProgress() {
  const [state, setState] = React.useState({ scrollYProgress: 0 });
  React.useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setState({ scrollYProgress: max > 0 ? window.scrollY / max : 0 });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return state;
}

/**
 * Animated number counter for the trust strip.
 * Uses an Intl formatter so a rupee or a comma lands in the right place.
 */
export function Counter({
  value,
  duration = 1.8,
  format = (n: number) => Math.round(n).toLocaleString("en-IN"),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo — fast arrival, gentle settle
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {format(display)}
    </span>
  );
}

/**
 * Hover-lift wrapper for interactive cards.
 * Transform-only so it never triggers layout.
 */
export function HoverLift({
  children,
  className,
  lift = 6,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      whileHover={{ y: -lift }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Slow infinite drift for decorative background shapes. */
export function Float({
  children,
  className,
  amplitude = 10,
  duration = 8,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [-amplitude, amplitude, -amplitude] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/** Magnetic pull toward the cursor — used once, on the hero CTA. */
export function Magnetic({
  children,
  strength = 0.22,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.3 });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cross-fade page transition wrapper used by the App Router template.
 * Keyed on pathname by the parent so navigation re-triggers the fade.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}