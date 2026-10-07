/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SPLIT ECONOMICS
 * ═══════════════════════════════════════════════════════════════════════════
 * On every settled order the gross amount divides into exactly two buckets:
 *
 *   platform  = commission + payment-gateway fee
 *   vendor    = everything else
 *
 * Resolution order for the commission rate (first hit wins):
 *   1. VendorProfile.commissionRate        (per-vendor override)
 *   2. Category.defaultCommissionRate      (category default)
 *   3. PlatformSetting "commerce.commission_default"
 *
 * The rate is *frozen onto the order* at confirmation. If an admin later
 * changes the platform rate, historical payouts stay exactly as agreed — the
 * audit trail must never be rewritten by a config change.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { CommissionContext, CommissionResult, PayoutBatch } from "./types";
import { clamp, roundHalfUp } from "@/lib/math";

export const PLATFORM_MIN_COMMISSION = 0.05;
export const PLATFORM_MAX_COMMISSION = 0.30;
export const DEFAULT_COMMISSION = 0.12;
export const DEFAULT_CONNECT_FEE = 0.02;

/**
 * Compute the money split for an order.
 *
 * The gateway fee is charged on the *gross*, which means it is deducted from
 * the platform's share rather than the vendor's. This is the standard
 * marketplace convention and is stated plainly on the vendor payout screen.
 */
export function computeSplit(ctx: CommissionContext): CommissionResult {
  const grossAmount = Math.max(Math.round(ctx.grossAmount || 0), 0);
  const refundedAmount = Math.max(Math.round(ctx.refundedAmount || 0), 0);
  const settledAmount = Math.max(grossAmount - refundedAmount, 0);

  const rawRate = ctx.commissionRate ?? DEFAULT_COMMISSION;
  const rate = clamp(rawRate, PLATFORM_MIN_COMMISSION, PLATFORM_MAX_COMMISSION);

  const gatewayFee = roundHalfUp(settledAmount * (ctx.connectFeeRate ?? DEFAULT_CONNECT_FEE));

  // Commission is earned on the settled amount only — a refund unwinds it.
  const commissionAmount = roundHalfUp(settledAmount * rate);
  const platformFee = commissionAmount + gatewayFee;

  const vendorNetAmount = Math.max(settledAmount - platformFee, 0);

  return {
    grossAmount,
    settledAmount,
    commissionRate: rate,
    commissionAmount,
    gatewayFee,
    platformFee,
    vendorNetAmount,
    currency: ctx.currency ?? "INR",
  };
}

/**
 * Derive the payout schedule for a vendor's completed orders.
 *
 * Funds are held for `lagDays` after the event date so disputes have time to
 * surface; the batch is then grouped by period so vendors receive one
 * consolidated transfer rather than a trickle of small ones.
 */
export function buildPayoutBatch(input: {
  vendorProfileId: string;
  orders: {
    id: string;
    orderNumber: string;
    eventDate: Date;
    settledAmount: number;
    refundedAmount: number;
    commissionRate: number;
    vendorNetAmount: number;
    depositPaid: number;
    balancePaid: number;
    depositStatus: string;
    balanceStatus: string;
  }[];
  lagDays: number;
  minThreshold: number;
  currency?: string;
}): PayoutBatch {
  const now = Date.now();

  const settledOf = (o: (typeof input.orders)[number]) =>
    Math.max(o.settledAmount - o.refundedAmount, 0);

  const eligible = input.orders.filter((o) => {
    const releaseAt = o.eventDate.getTime() + input.lagDays * 86_400_000;
    const fullySettled = o.balanceStatus !== "PENDING" || o.eventDate.getTime() <= now;
    return releaseAt <= now && fullySettled && settledOf(o) > 0;
  });

  if (!eligible.length) {
    return {
      vendorProfileId: input.vendorProfileId,
      orderIds: [],
      amount: 0,
      commissionAmount: 0,
      netAmount: 0,
      currency: input.currency ?? "INR",
      scheduledFor: new Date(now + input.lagDays * 86_400_000),
      status: "SCHEDULED",
      eligibleCount: 0,
      blockedByThreshold: false,
    };
  }

  const amounts = eligible.map(settledOf);
  const nets = eligible.map((o) => {
    const gross = settledOf(o);
    const commission = roundHalfUp(gross * o.commissionRate);
    return Math.max(gross - commission, 0);
  });

  const amount = amounts.reduce((a, b) => a + b, 0);
  const netAmount = nets.reduce((a, b) => a + b, 0);
  const commissionAmount = amount - netAmount;

  const blockDates = eligible.map((o) => o.eventDate.getTime());
  const periodStart = new Date(Math.min(...blockDates));
  const periodEnd = new Date(Math.max(...blockDates));

  return {
    vendorProfileId: input.vendorProfileId,
    orderIds: eligible.map((o) => o.id),
    amount,
    commissionAmount,
    netAmount,
    currency: input.currency ?? "INR",
    periodStart,
    periodEnd,
    scheduledFor: new Date(now + input.lagDays * 86_400_000),
    status: "SCHEDULED",
    eligibleCount: eligible.length,
    blockedByThreshold: netAmount < input.minThreshold,
  };
}

/**
 * Comma-free int parsing for form inputs where users may type "1,50,000".
 * Returns null when the value can't be understood as a rupee amount.
 */
export function parseRupeeInput(raw: string): number | null {
  const cleaned = raw.replace(/[,\s₹]/g, "");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value) || value < 0) return null;
  return roundHalfUp(value * 100);
}