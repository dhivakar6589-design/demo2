/**
 * Platform settings with a process-level cache.
 *
 * Admin edits invalidate the cache explicitly (clearSettingsCache) rather than
 * relying on TTL alone, so a commission change takes effect on the next
 * request instead of up to 60 seconds later — which matters when someone is
 * actively reconciling payouts.
 */

import { DEFAULT_REFUND_TIERS, PLATFORM_DEFAULTS, SettingKey, type RefundTier } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/math";

export interface ResolvedSettings {
  commissionDefault: number;
  commissionMin: number;
  commissionMax: number;
  depositDefault: number;
  taxDefault: number;
  payoutLagDays: number;
  payoutMinThreshold: number;
  refundTiers: RefundTier[];
  bookingWindowDays: number;
  autoApproveVendors: boolean;
  reviewModeration: boolean;
  platformName: string;
  supportEmail: string;
}

const DEFAULTS: ResolvedSettings = {
  commissionDefault: 12,
  commissionMin: 5,
  commissionMax: 30,
  depositDefault: 30,
  taxDefault: 18,
  payoutLagDays: 3,
  payoutMinThreshold: 100_000,
  refundTiers: DEFAULT_REFUND_TIERS,
  bookingWindowDays: 365,
  autoApproveVendors: false,
  reviewModeration: false,
  platformName: "Aurelia",
  supportEmail: "concierge@aurelia.events",
};

let cache: { value: ResolvedSettings; expires: number } | null = null;
const TTL_MS = 60_000;

export function clearSettingsCache() {
  cache = null;
}

function num(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function str(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getSettings(): Promise<ResolvedSettings> {
  if (cache && cache.expires > Date.now()) return cache.value;

  const rows = await prisma.platformSetting.findMany();
  const map = new Map<string, unknown>();

  for (const row of rows) {
    try {
      map.set(row.key, JSON.parse(row.valueJson));
    } catch {
      map.set(row.key, row.valueJson);
    }
  }

  const value: ResolvedSettings = {
    commissionDefault: clamp(
      num(map.get(SettingKey.COMMISSION_DEFAULT), DEFAULTS.commissionDefault),
      DEFAULTS.commissionMin,
      DEFAULTS.commissionMax,
    ),
    commissionMin: num(map.get(SettingKey.COMMISSION_MIN), DEFAULTS.commissionMin),
    commissionMax: num(map.get(SettingKey.COMMISSION_MAX), DEFAULTS.commissionMax),
    depositDefault: clamp(
      num(map.get(SettingKey.DEPOSIT_DEFAULT), DEFAULTS.depositDefault),
      0,
      100,
    ),
    taxDefault: clamp(num(map.get(SettingKey.TAX_DEFAULT), DEFAULTS.taxDefault), 0, 40),
    payoutLagDays: Math.max(
      0,
      Math.round(num(map.get(SettingKey.PAYOUT_LAG_DAYS), DEFAULTS.payoutLagDays)),
    ),
    payoutMinThreshold: Math.max(
      0,
      Math.round(num(map.get(SettingKey.PAYOUT_MIN_THRESHOLD), DEFAULTS.payoutMinThreshold)),
    ),
    refundTiers: normaliseTiers(map.get(SettingKey.REFUND_TIERS)),
    bookingWindowDays: Math.max(
      1,
      Math.round(num(map.get(SettingKey.BOOKING_WINDOW_DAYS), DEFAULTS.bookingWindowDays)),
    ),
    autoApproveVendors: bool(map.get(SettingKey.AUTO_APPROVE_VENDORS), DEFAULTS.autoApproveVendors),
    reviewModeration: bool(map.get(SettingKey.REVIEW_MODERATION), DEFAULTS.reviewModeration),
    platformName: str(map.get(SettingKey.PLATFORM_NAME), DEFAULTS.platformName),
    supportEmail: str(map.get(SettingKey.SUPPORT_EMAIL), DEFAULTS.supportEmail),
  };

  cache = { value, expires: Date.now() + TTL_MS };
  return value;
}

function normaliseTiers(raw: unknown): RefundTier[] {
  if (!Array.isArray(raw)) return DEFAULTS.refundTiers;
  const tiers = raw
    .filter(
      (t): t is Record<string, unknown> =>
        typeof t === "object" && t !== null && typeof t.minDaysBefore === "number",
    )
    .map((t) => ({
      minDaysBefore: Math.max(0, Math.round(Number(t.minDaysBefore))),
      percentRefund: clamp(Math.round(Number(t.percentRefund ?? 0)), 0, 100),
      label: str(t.label, `${t.minDaysBefore}+ days before`),
      note: str(t.note, ""),
    }))
    .sort((a, b) => b.minDaysBefore - a.minDaysBefore);

  return tiers.length ? tiers : DEFAULTS.refundTiers;
}

/**
 * Resolve the effective commission percentage for a vendor.
 * Vendor override wins; otherwise category default; otherwise platform default.
 */
export function resolveCommissionPercent(input: {
  vendorOverride?: number | null;
  categoryRate?: number | null;
  settings: ResolvedSettings;
}) {
  const s = input.settings;
  const raw =
    input.vendorOverride != null
      ? input.vendorOverride * 100
      : input.categoryRate != null
        ? input.categoryRate * 100
        : s.commissionDefault;

  return clamp(raw, s.commissionMin, s.commissionMax);
}

export { PLATFORM_DEFAULTS };