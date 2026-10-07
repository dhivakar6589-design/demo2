/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANCELLATION & REFUND POLICY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Refunds are tiered by how much notice the customer gives, measured in days
 * before the event date. The ladder is data, not code — admins edit the tiers
 * in Settings and the tiers below are simply the shipped defaults.
 *
 * Guarantees:
 *  • Refunds are computed against AMOUNT PAID, never the order total. A
 *    cancelled unpaid order refunds nothing and must not create a negative
 *    payable.
 *  • A vendor-caused cancellation (admin or dispute resolution) refunds 100%
 *    and additionally flags the vendor's reliability counters.
 *  • The customer is always shown the exact amount before they confirm, and
 *    the same function that previews it executes it.
 */

import { DEFAULT_REFUND_TIERS, type RefundTier } from "@/lib/constants";
import { roundHalfUp } from "@/lib/math";
import { daysBetween } from "@/lib/utils";

export interface RefundQuote {
  tier: RefundTier;
  daysBefore: number;
  /** Sum of successfully captured payments, minus prior refunds. */
  paidAmount: number;
  refundableBase: number;
  refundAmount: number;
  retainedAmount: number;
  percentRefund: number;
  headline: string;
  detail: string;
  /** True when the vendor's own failure triggered this refund. */
  vendorFault: boolean;
}

export interface RefundPolicyInput {
  eventDate: Date;
  paidAmount: number;
  priorRefundedAmount?: number;
  tiers?: RefundTier[];
  /** Admin-initiated / dispute refund — bypasses the ladder entirely. */
  fullRefund?: boolean;
  /** Optional fixed cap, e.g. an admin goodwill credit. */
  capAmount?: number | null;
}

function selectTier(daysBefore: number, tiers: RefundTier[]): RefundTier {
  const sorted = [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  // Tiers are [21, 14, 7, 3, 0]: pick the first whose threshold we clear.
  return (
    sorted.find((t) => daysBefore >= t.minDaysBefore) ??
    sorted[sorted.length - 1] ?? DEFAULT_REFUND_TIERS[DEFAULT_REFUND_TIERS.length - 1]
  );
}

export function quoteRefund(input: RefundPolicyInput): RefundQuote {
  const tiers = (input.tiers?.length ? input.tiers : DEFAULT_REFUND_TIERS).map((t) => ({
    ...t,
    percentRefund: Math.max(0, Math.min(100, t.percentRefund)),
  }));

  const daysBefore = daysBetween(new Date(), input.eventDate);
  const paidAmount = Math.max(Math.round(input.paidAmount || 0), 0);
  const priorRefunded = Math.max(Math.round(input.priorRefundedAmount || 0), 0);
  const refundableBase = Math.max(paidAmount - priorRefunded, 0);

  const vendorFault = Boolean(input.fullRefund);
  const tier: RefundTier = vendorFault
    ? {
        minDaysBefore: 9999,
        percentRefund: 100,
        label: "Vendor fault",
        note: "Full refund — the vendor was unable or unwilling to deliver as agreed.",
      }
    : selectTier(daysBefore, tiers);

  const percentRefund = vendorFault ? 100 : tier.percentRefund;

  let refundAmount = roundHalfUp((refundableBase * percentRefund) / 100);
  if (input.capAmount != null) {
    refundAmount = Math.min(refundAmount, Math.max(Math.round(input.capAmount), 0));
  }
  refundAmount = Math.min(refundAmount, refundableBase);

  const retainedAmount = refundableBase - refundAmount;

  const headline = vendorFault
    ? "Full refund"
    : refundAmount === 0
      ? "No refund under the cancellation policy"
      : `${percentRefund}% refund`;

  const detail = vendorFault
    ? tier.note
    : `${tier.note} You are ${daysBefore} day${Math.abs(daysBefore) === 1 ? "" : "s"} ${
        daysBefore >= 0 ? "ahead of" : "past"
      } the event date.`;

  return {
    tier,
    daysBefore,
    paidAmount,
    refundableBase,
    refundAmount,
    retainedAmount,
    percentRefund,
    headline,
    detail,
    vendorFault,
  };
}

/** Present the full ladder for display on the cancellation dialog. */
export function refundSchedule(
  paidAmount: number,
  eventDate: Date,
  tiers: RefundTier[] = DEFAULT_REFUND_TIERS,
) {
  return [...tiers]
    .sort((a, b) => b.minDaysBefore - a.minDaysBefore)
    .map((tier) => ({
      ...tier,
      amount: roundHalfUp((Math.max(paidAmount, 0) * tier.percentRefund) / 100),
    }));
}

/* ───────────────────────────── Disputes ───────────────────────────────── */

export interface DisputeResolutionInput {
  claimedAmount: number;
  paidAmount: number;
  /** Admin's decision. */
  awardToCustomer: boolean;
  /** Share of the claim awarded to the customer, 0–1. */
  customerShare?: number;
  capPercent?: number;
}

export function resolveDispute(input: DisputeResolutionInput) {
  const paidAmount = Math.max(Math.round(input.paidAmount || 0), 0);
  const claimed = Math.min(Math.max(Math.round(input.claimedAmount || 0), 0), paidAmount);
  const capPercent = Math.max(0, Math.min(input.capPercent ?? 1, 1));

  if (!input.awardToCustomer) {
    return {
      refundAmount: 0,
      vendorPayoutAmount: paidAmount,
      customerShare: 0,
      summary: "Claim dismissed — full settlement released to the vendor.",
    };
  }

  const share = Math.max(0, Math.min(input.customerShare ?? claimed / (paidAmount || 1), 1));
  const refundAmount = roundHalfUp(claimed * share);
  const capped = roundHalfUp(paidAmount * capPercent);

  const finalRefund = Math.min(refundAmount, capped);

  return {
    refundAmount: finalRefund,
    vendorPayoutAmount: paidAmount - finalRefund,
    customerShare: share,
    summary:
      finalRefund === claimed
        ? `Claim upheld in full — ${finalRefund} refunded.`
        : `Partially upheld — ${finalRefund} of ${claimed} refunded.`,
  };
}