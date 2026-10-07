import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts last-wins. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ───────────────────────────── Money ──────────────────────────────────── */

/**
 * All monetary values in Aurelia are integers in MINOR UNITS (paise).
 * Never use floats for money — see docs/SCHEMA.md.
 */
export function formatMoney(
  minor: number,
  options: { currency?: string; symbol?: string; compact?: boolean; maximumFractionDigits?: number } = {},
) {
  const { currency = "INR", compact = false, maximumFractionDigits } = options;
  const major = (minor ?? 0) / 100;

  if (compact) {
    const abs = Math.abs(major);
    if (abs >= 1e7) return `₹${(major / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
    if (abs >= 1e5) return `₹${(major / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
    if (abs >= 1e3) return `₹${(major / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}k`;
  }

  const digits = maximumFractionDigits ?? (Number.isInteger(major) ? 0 : 2);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    return `₹${major.toLocaleString("en-IN", { maximumFractionDigits: digits })}`;
  }
}

/** Per-plate pricing reads better as a rate: "₹1,850 / plate". */
export function formatRate(minor: number, currency = "INR") {
  return `${formatMoney(minor, { currency })}`;
}

export function toMinor(major: number) {
  return Math.round(major * 100);
}

export function toMajor(minor: number) {
  return (minor ?? 0) / 100;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function sum(values: number[]) {
  return values.reduce((a, b) => a + (b || 0), 0);
}

export function percentage(part: number, whole: number) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

/* ───────────────────────────── Dates ──────────────────────────────────── */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_MIN = ["S", "M", "T", "W", "T", "F", "S"];

/** Normalise any Date to UTC midnight — the canonical key for a calendar day. */
export function startOfDayUTC(input: Date | string) {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(input: Date | string, days: number) {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addMonths(input: Date, months: number) {
  const d = new Date(input);
  const targetMonth = d.getUTCMonth() + months;
  const anchor = new Date(Date.UTC(d.getUTCFullYear(), targetMonth, 1));
  const lastDay = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  anchor.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return anchor;
}

export function daysBetween(from: Date | string, to: Date | string) {
  const a = startOfDayUTC(from).getTime();
  const b = startOfDayUTC(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(
  input: Date | string | null | undefined,
  style: "short" | "medium" | "long" | "weekday" = "medium",
) {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();

  switch (style) {
    case "short":
      return `${day} ${MONTHS[month]}`;
    case "long":
      return `${day} ${MONTHS_LONG[month]} ${year}`;
    case "weekday":
      return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${day} ${MONTHS_LONG[month]} ${year}`;
    default:
      return `${day} ${MONTHS[month]} ${year}`;
  }
}

export function formatDateTime(input: Date | string | null | undefined) {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return `${formatDate(d)}, ${time}`;
}

/** "in 7 days" / "tomorrow" / "3 days ago" — used across dashboards. */
export function relativeTime(input: Date | string | null | undefined) {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  if (abs < MIN) return "just now";
  if (abs < HOUR) return rtf.format(Math.round(diffMs / MIN), "minute");
  if (abs < DAY) return rtf.format(Math.round(diffMs / HOUR), "hour");
  if (abs < 30 * DAY) return rtf.format(Math.round(diffMs / DAY), "day");
  if (abs < 365 * DAY) return rtf.format(Math.round(diffMs / (30 * DAY)), "month");
  return rtf.format(Math.round(diffMs / (365 * DAY)), "year");
}

/** Countdown label for an upcoming event. */
export function countdownLabel(input: Date | string | null | undefined) {
  if (!input) return "";
  const days = daysBetween(new Date(), input);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

export function monthLabel(year: number, monthIndex: number) {
  return `${MONTHS_LONG[monthIndex]} ${year}`;
}

export { MONTHS, MONTHS_LONG };

/* ───────────────────────────── Strings ────────────────────────────────── */

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(input: string) {
  return input
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export function truncate(input: string, max: number) {
  if (!input) return "";
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}

export function pluralise(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function humaniseEnum(value: string) {
  return titleCase(value.toLowerCase().replace(/_/g, " "));
}

/** Mask an account number for display: "•••• 4821". */
export function maskAccount(value?: string | null, last4?: string | null) {
  const tail = last4 || value?.slice(-4);
  return tail ? `•••• ${tail}` : "••••";
}

/* ─────────────────────────── JSON helpers ─────────────────────────────── */

export function parseJsonArray<T = string>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function parseJsonObject<T extends object>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? ({ ...fallback, ...parsed } as T)
      : fallback;
  } catch {
    return fallback;
  }
}

export function toJsonArray(values: string[] | undefined | null) {
  return JSON.stringify(values ?? []);
}

/* ────────────────────────────── Geo ───────────────────────────────────── */

/** Haversine distance in kilometres. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ──────────────────────────── References ──────────────────────────────── */

/**
 * Human-readable, sortable reference codes.
 * Format: AUR-ORD-7K3F-2X9Q  — customers quote these over the phone.
 */
export function buildReference(prefix: "ORD" | "QTE" | "INV" | "DSP") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const chunk = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
      "",
    );
  return `AUR-${prefix}-${chunk(4)}-${chunk(4)}`;
}

export function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

/**
 * Post-authentication return path.
 *
 * Only a same-origin absolute path is accepted: `//evil.com` and
 * `https://evil.com` both parse as "starts with /" or "looks fine" in the
 * naive check, and an open redirect on a login form is a phishing vector.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("..")) return fallback;
  return trimmed;
}