/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MONEY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * One module owns every arithmetic rule that turns a menu selection into an
 * amount a customer is charged, an invoice is printed from, and a vendor is
 * paid. Keeping it pure (no I/O, no Prisma) makes it trivially unit-testable
 * and guarantees the quote builder, the checkout page, the webhook handler and
 * the seed script can never disagree about a total.
 *
 * Invariants enforced here:
 *  • All amounts are integer MINOR UNITS (paise). No floats.
 *  • Tax is computed on the discounted subtotal, never on fees.
 *  • The customer-facing total is the sum of its own parts — we recompute
 *    rather than trust a passed-in total, so a stale client can't underpay.
 *  • Rounding is half-up at every step and reconciliation is explicit.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { PricingModel } from "@/lib/constants";
import { clamp, roundHalfUp } from "@/lib/math";

/* ─────────────────────────────── Inputs ───────────────────────────────── */

export interface PriceLine {
  kind:
    | "PACKAGE"
    | "ADDON"
    | "MENU_ITEM"
    | "SERVICE_FEE"
    | "DELIVERY"
    | "DISCOUNT";
  label: string;
  detail?: string | null;
  /** Per-guest lines multiply by guestCount; per-event lines do not. */
  basis: "PER_PLATE" | "PER_EVENT";
  unitPrice: number;
  quantity: number;
  /** Overrides the basis for this line only (add-ons are often hybrid). */
  pricingModel?: PricingModel;
  meta?: Record<string, unknown>;
}

export interface DiscountInput {
  couponCode?: string | null;
  couponType?: "PERCENT" | "FIXED" | null;
  couponValue?: number | null;
  couponMaxDiscount?: number | null;
  manualDiscountAmount?: number | null;
}

export interface PriceContext {
  guestCount: number;
  lines: PriceLine[];
  taxPercent: number;
  discount?: DiscountInput;
  /** Platform fee shown to the customer at checkout (0 = hidden). */
  platformFeeAmount?: number;
  /** Same-region (intra-state) → CGST+SGST, else IGST. */
  intraState?: boolean;
  depositPercent?: number;
}

export interface ComputedPrice {
  guestCount: number;
  lines: PriceLine[];
  subtotalAmount: number;
  discountAmount: number;
  discountLabel: string | null;
  taxPercent: number;
  taxAmount: number;
  taxBreakup: { label: string; percent: number; amount: number }[];
  platformFeeAmount: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  perPlateEffective: number;
  intraState: boolean;
  currency: string;
}

/* ─────────────────────────────── Helpers ──────────────────────────────── */

function lineTotal(line: PriceLine) {
  if (line.kind === "DISCOUNT") return -Math.abs(line.unitPrice);
  const basis =
    line.pricingModel && line.pricingModel !== "BOTH"
      ? line.pricingModel
      : line.basis;
  const multiplier = basis === "PER_PLATE" ? line.quantity || 1 : 1;
  return roundHalfUp(line.unitPrice * Math.max(multiplier, 0));
}

function resolveDiscount(
  subtotal: number,
  discount: DiscountInput | undefined,
): { amount: number; label: string | null } {
  if (!discount) return { amount: 0, label: null };

  // Explicit manual discount always wins — it is an admin/vendor concession.
  if (discount.manualDiscountAmount && discount.manualDiscountAmount > 0) {
    return {
      amount: Math.min(roundHalfUp(discount.manualDiscountAmount), subtotal),
      label: "Concession",
    };
  }

  if (!discount.couponType || !discount.couponValue) {
    return { amount: 0, label: null };
  }

  let amount =
    discount.couponType === "PERCENT"
      ? roundHalfUp((subtotal * discount.couponValue) / 100)
      : roundHalfUp(discount.couponValue);

  if (discount.couponMaxDiscount && amount > discount.couponMaxDiscount) {
    amount = discount.couponMaxDiscount;
  }

  amount = clamp(amount, 0, subtotal);
  return { amount, label: discount.couponCode ? `${discount.couponCode}` : "Discount" };
}

/* ──────────────────────────── Main computation ────────────────────────── */

/**
 * Compute the authoritative price for a selection.
 *
 * GST note: intra-state supply is split evenly into CGST + SGST; inter-state
 * supply is a single IGST line at the same total rate. The customer-visible
 * total is identical either way, but the invoice breakup differs, so we model
 * it properly.
 */
export function computePrice(ctx: PriceContext): ComputedPrice {
  const guestCount = Math.max(1, Math.round(ctx.guestCount || 1));
  const lines = ctx.lines ?? [];

  const subtotalAmount = roundHalfUp(lines.reduce((acc, l) => acc + lineTotal(l), 0));
  const positiveSubtotal = Math.max(subtotalAmount, 0);

  const { amount: discountAmount, label: discountLabel } = resolveDiscount(
    positiveSubtotal,
    ctx.discount,
  );

  const taxableAmount = Math.max(positiveSubtotal - discountAmount, 0);

  // Tax on the discounted subtotal — never on the platform fee.
  const taxPercent = Math.max(ctx.taxPercent || 0, 0);
  const taxAmount = roundHalfUp((taxableAmount * taxPercent) / 100);

  const intraState = ctx.intraState ?? true;
  const taxBreakup = taxAmount
    ? intraState
      ? [
          { label: "CGST", percent: taxPercent / 2, amount: roundHalfUp(taxAmount / 2) },
          { label: "SGST", percent: taxPercent / 2, amount: taxAmount - roundHalfUp(taxAmount / 2) },
        ]
      : [{ label: "IGST", percent: taxPercent, amount: taxAmount }]
    : [];

  const platformFeeAmount = Math.max(ctx.platformFeeAmount || 0, 0);

  const totalAmount = roundHalfUp(taxableAmount + taxAmount + platformFeeAmount);

  const depositPercent = clamp(Math.round(ctx.depositPercent ?? 30), 0, 100);
  const depositAmount = roundHalfUp((totalAmount * depositPercent) / 100);
  const balanceAmount = totalAmount - depositAmount;

  return {
    guestCount,
    lines,
    subtotalAmount,
    discountAmount,
    discountLabel,
    taxPercent,
    taxAmount,
    taxBreakup,
    platformFeeAmount,
    totalAmount,
    depositAmount,
    balanceAmount,
    perPlateEffective: guestCount > 0 ? roundHalfUp(taxableAmount / guestCount) : 0,
    intraState,
    currency: "INR",
  };
}

/* ───────────────────────── Package price ladder ───────────────────────── */

export interface PackageLike {
  pricingModel: string;
  pricePerPlate?: number | null;
  basePrice?: number | null;
  perEventPrice?: number | null;
  minGuests: number;
  maxGuests?: number | null;
}

export interface PackageQuote {
  guestCount: number;
  withinRange: boolean;
  basis: "PER_PLATE" | "PER_EVENT";
  subtotalAmount: number;
  perPlateEffective: number;
  minGuests: number;
  maxGuests: number | null;
  note: string | null;
}

/**
 * Resolve how a package prices at a given guest count.
 *
 * Per-plate packages below their minimum are floored at the minimum (a caterer
 * will not cook for eight people), and the difference is surfaced as a note so
 * the UI can explain the jump rather than silently inflating the cart.
 */
export function pricePackage(
  pkg: PackageLike,
  guestCount: number,
  addOnPerPlateAmount = 0,
): PackageQuote {
  const guests = Math.max(1, Math.round(guestCount || 1));
  const perPlate = pkg.pricePerPlate ?? 0;
  const base = pkg.basePrice ?? 0;

  const canPerPlate =
    (pkg.pricingModel === "PER_PLATE" || pkg.pricingModel === "BOTH") && perPlate > 0;
  const canPerEvent =
    (pkg.pricingModel === "PER_EVENT" || pkg.pricingModel === "BOTH") && base > 0;

  const minGuests = Math.max(1, pkg.minGuests || 1);
  const maxGuests = pkg.maxGuests ?? null;
  const withinRange = guests >= minGuests && (!maxGuests || guests <= maxGuests);

  let basis: "PER_PLATE" | "PER_EVENT" = "PER_PLATE";
  let subtotalAmount = 0;
  let perPlateEffective = 0;
  let note: string | null = null;

  if (canPerPlate) {
    const effectiveGuests = Math.max(guests, minGuests);
    subtotalAmount = roundHalfUp((perPlate + addOnPerPlateAmount) * effectiveGuests);
    perPlateEffective = perPlate + addOnPerPlateAmount;
    basis = "PER_PLATE";

    if (guests < minGuests) {
      note = `Priced for the ${minGuests}-guest minimum`;
    } else if (maxGuests && guests > maxGuests) {
      note = `Above the ${maxGuests}-guest maximum — the vendor will confirm capacity`;
    }
  } else if (canPerEvent) {
    subtotalAmount = roundHalfUp(base + (canPerPlate ? 0 : addOnPerPlateAmount * guests));
    basis = "PER_EVENT";
    perPlateEffective = roundHalfUp(subtotalAmount / effectiveGuestsSafe(guests, minGuests));
  } else {
    subtotalAmount = 0;
    note = "Pricing on request";
  }

  return {
    guestCount: guests,
    withinRange,
    basis,
    subtotalAmount,
    perPlateEffective,
    minGuests,
    maxGuests,
    note,
  };
}

function effectiveGuestsSafe(guests: number, minGuests: number) {
  return Math.max(guests, minGuests);
}

/* ──────────────────────────── Deposit ladder ──────────────────────────── */

/**
 * Balance falls due a configurable number of days before the event.
 * Returns null when the event is too close for a balance window to exist.
 */
export function balanceDueDate(
  eventDate: Date,
  leadDays = 3,
): Date | null {
  const due = new Date(eventDate);
  due.setUTCDate(due.getUTCDate() - leadDays);
  return due.getTime() > Date.now() ? due : null;
}

export function depositPlan(
  totalAmount: number,
  depositPercent: number,
): { depositAmount: number; balanceAmount: number } {
  const pct = clamp(Math.round(depositPercent || 0), 0, 100);
  const depositAmount = roundHalfUp((totalAmount * pct) / 100);
  return { depositAmount, balanceAmount: totalAmount - depositAmount };
}

/* ────────────────────────────── Reconciliation ────────────────────────── */

/**
 * Verify that a persisted order's money fields agree with the computed price.
 * Returns null when consistent, or a human-readable drift description.
 * Used by the checkout guard and by an admin integrity check.
 */
export function reconcile(
  computed: Pick<
    ComputedPrice,
    "subtotalAmount" | "discountAmount" | "taxAmount" | "totalAmount" | "depositAmount" | "balanceAmount"
  >,
  stored: {
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    depositAmount: number;
    balanceAmount: number;
  },
) {
  const drift: string[] = [];
  const keys: (keyof typeof stored)[] = [
    "subtotalAmount",
    "discountAmount",
    "taxAmount",
    "totalAmount",
    "depositAmount",
    "balanceAmount",
  ];
  for (const key of keys) {
    if (computed[key] !== stored[key]) {
      drift.push(`${key}: expected ${computed[key]}, stored ${stored[key]}`);
    }
  }
  return drift.length ? drift.join("; ") : null;
}