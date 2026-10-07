/** Small, dependency-free numeric helpers used across the money engine. */

/** Half-up rounding to an integer. Avoids float drift like 1.005 → 1.00. */
export function roundHalfUp(value: number) {
  if (!Number.isFinite(value)) return 0;
  // The epsilon nudge pushes binary-representable edges (e.g. 1.005 → 1.00499…)
  // back over the line before flooring, which is what "half-up" means to users.
  return Math.floor(value + 0.5 + Number.EPSILON * Math.sign(value || 1));
}

export function roundTo(value: number, dp = 2) {
  const f = 10 ** dp;
  return roundHalfUp(value * f) / f;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function percent(part: number, whole: number, dp = 1) {
  if (!whole) return 0;
  return roundTo((part / whole) * 100, dp);
}

export function sum(values: number[]) {
  return values.reduce((acc, v) => acc + (v || 0), 0);
}

export function safeDivide(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

/** Percentage change from a → b, as a signed number. */
export function growthPercent(a: number, b: number) {
  if (a === 0) return b === 0 ? 0 : 100;
  return roundTo(((b - a) / Math.abs(a)) * 100, 1);
}