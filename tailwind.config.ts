import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      screens: {
        xs: "420px",
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
          muted: "hsl(var(--primary-muted) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
          muted: "hsl(var(--accent-muted) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent_static: {
          ivory: "#FAF8F4",
          navy: "#0F1B2D",
          gold: "#C9A24B",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          foreground: "hsl(var(--danger-foreground) / <alpha-value>)",
          soft: "hsl(var(--danger-soft) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground) / <alpha-value>)",
          soft: "hsl(var(--info-soft) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          raised: "hsl(var(--surface-raised) / <alpha-value>)",
          sunken: "hsl(var(--surface-sunken) / <alpha-value>)",
          inverse: "hsl(var(--surface-inverse) / <alpha-value>)",
        },
        // Flat rather than nested under a `text` namespace: a `colors.text.*`
        // entry flattens to the colour name `text-heading`, which would then
        // require `text-text-heading` to apply. Top-level keys give us the
        // readable `text-heading` / `text-body` / `text-subtle` utilities.
        heading: "hsl(var(--text-heading) / <alpha-value>)",
        body: "hsl(var(--text-body) / <alpha-value>)",
        subtle: "hsl(var(--text-subtle) / <alpha-value>)",
        inverted: "hsl(var(--text-inverted) / <alpha-value>)",
        line: {
          DEFAULT: "hsl(var(--line) / <alpha-value>)",
          strong: "hsl(var(--line-strong) / <alpha-value>)",
        },
        chart: {
          1: "hsl(var(--chart-1) / <alpha-value>)",
          2: "hsl(var(--chart-2) / <alpha-value>)",
          3: "hsl(var(--chart-3) / <alpha-value>)",
          4: "hsl(var(--chart-4) / <alpha-value>)",
          5: "hsl(var(--chart-5) / <alpha-value>)",
          grid: "hsl(var(--chart-grid) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.375rem" }],
        base: ["0.9375rem", { lineHeight: "1.6" }],
        md: ["1rem", { lineHeight: "1.65" }],
        lg: ["1.25rem", { lineHeight: "1.75", letterSpacing: "-0.01em" }],
        xl: ["1.5rem", { lineHeight: "1.9", letterSpacing: "-0.015em" }],
        "2xl": ["1.75rem", { lineHeight: "2.1", letterSpacing: "-0.02em" }],
        "3xl": ["2.5rem", { lineHeight: "2.9", letterSpacing: "-0.022em" }],
        "4xl": ["2.625rem", { lineHeight: "3", letterSpacing: "-0.028em" }],
        "5xl": ["3.25rem", { lineHeight: "3.5", letterSpacing: "-0.03em" }],
        "6xl": ["4rem", { lineHeight: "4.2", letterSpacing: "-0.032em" }],
        "7xl": ["4.75rem", { lineHeight: "4.9", letterSpacing: "-0.035em" }],
        "8xl": ["6rem", { lineHeight: "6", letterSpacing: "-0.038em" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
        full: "9999px",
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
        section: "6rem",
        "section-lg": "8rem",
        "section-sm": "4rem",
      },
      maxWidth: {
        container: "80rem",
        prose: "70ch",
        measure: "68ch",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        gold: "var(--shadow-gold)",
        lift: "var(--shadow-lift)",
        nav: "var(--shadow-nav)",
        focus: "var(--shadow-focus)",
      },
      backgroundImage: {
        "gradient-ivory": "var(--gradient-ivory)",
        "gradient-navy": "var(--gradient-navy)",
        "gradient-gold": "var(--gradient-gold)",
        "gradient-hairline":
          "linear-gradient(to right, transparent, hsl(var(--line)) 20%, hsl(var(--line)) 80%, transparent)",
        "grid-fine":
          "linear-gradient(to right, hsl(var(--line) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--line) / 0.5) 1px, transparent 1px)",
        noise:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        // Deliberately not named `grid-fine`: a backgroundSize key identical to
        // the backgroundImage key emits the same class twice and the grid image
        // is silently lost. Usage is `bg-grid-fine bg-grid-tile`.
        "grid-tile": "64px 64px",
      },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.22, 1, 0.36, 1)",
        entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        300: "300ms",
        400: "400ms",
        600: "600ms",
        900: "900ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 18px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.3)", opacity: "0" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "ticker-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Indeterminate progress used by submit buttons — a sweep rather than a
        // spinner, so it reads as part of the button instead of an overlay.
        sweep: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
        "accordion-up": "accordion-up 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 1.8s infinite",
        marquee: "marquee 38s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite",
        float: "float 7s ease-in-out infinite",
        "ticker-in": "ticker-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        sweep: "sweep 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [animate, typography],
};

export default config;