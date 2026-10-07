/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ORDER LIFECYCLE
 * ═══════════════════════════════════════════════════════════════════════════
 * Status machine (only these transitions are legal):
 *
 *   PENDING_PAYMENT ──deposit captured──▶ CONFIRMED
 *   CONFIRMED       ────────────────────▶ IN_PREPARATION
 *   IN_PREPARATION  ────────────────────▶ OUT_FOR_DELIVERY
 *   OUT_FOR_DELIVERY ───────────────────▶ DELIVERED
 *   DELIVERED       ────────────────────▶ COMPLETED
 *   *               ──cancel──▶ CANCELLED / REFUNDED / PARTIALLY_REFUNDED
 *   *               ──dispute──▶ DISPUTED ──▶ (terminal variants)
 *
 * Every transition is funnelled through `transitionOrder`, which is the single
 * place that validates the move, writes the audit row, adjusts the availability
 * ledger, freezes the money split, and fires the customer notification. Callers
 * never write order.status directly.
 */

import {
  HOLDING_STATUSES,
  NotificationChannel,
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  type OrderStatus as OrderStatusT,
} from "@/lib/constants";
import { balanceDueDate, computePrice, depositPlan, type PriceLine } from "@/lib/domain/pricing";
import { computeSplit } from "@/lib/domain/commission";
import { computeTax, isIntraState } from "@/lib/domain/tax";
import { getSettings, resolveCommissionPercent } from "@/lib/domain/settings";
import { quoteRefund, refundSchedule } from "@/lib/domain/refunds";
import { notifyStatusChange } from "@/lib/domain/notifications";
import { buildReference } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { startOfDayUTC } from "@/lib/utils";
import { ApiError } from "@/lib/api";

/* ─────────────────────── Legal state transitions ─────────────────────── */

const TRANSITIONS: Record<OrderStatusT, OrderStatusT[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PREPARATION", "CANCELLED", "DISPUTED"],
  IN_PREPARATION: ["OUT_FOR_DELIVERY", "CANCELLED", "DISPUTED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DISPUTED"],
  DELIVERED: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["DISPUTED"],
  CANCELLED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
  DISPUTED: [
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ],
};

export function canTransition(from: OrderStatusT, to: OrderStatusT) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatusT) {
  return TRANSITIONS[from] ?? [];
}

/** Statuses a vendor may set, in the order the UI should present them. */
export function vendorActionStatuses(from: OrderStatusT): OrderStatusT[] {
  return nextStatuses(from).filter((s) =>
    ["IN_PREPARATION", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(s),
  );
}

/** Progress index for the customer-facing stepper. */
export function flowIndex(status: OrderStatusT) {
  if (status === "CANCELLED" || status === "REFUNDED") return -1;
  if (status === "PARTIALLY_REFUNDED" || status === "DISPUTED") {
    const nearest = ORDER_FLOW.indexOf("DELIVERED");
    return nearest;
  }
  return ORDER_FLOW.indexOf(status);
}

/* ────────────────────────── Order creation ────────────────────────────── */

export interface CreateOrderInput {
  customerId: string;
  vendorProfileId: string;
  packageId: string;
  eventId?: string | null;
  quoteId?: string | null;
  guestCount: number;
  eventDate: Date;
  startTime?: string;
  addOnIds?: { id: string; quantity?: number }[];
  /** Explicit menu item substitutions chosen in the package customiser. */
  menuItemIds?: string[];
  couponCode?: string | null;
  manualDiscountAmount?: number | null;
  venue?: {
    name?: string | null;
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    postal?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  customerNote?: string | null;
  idempotencyKey?: string;
  /** Skip deposit capture — creates the order as PENDING_PAYMENT. */
  instantBook?: boolean;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  status: OrderStatusT;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  depositDue: number;
  invoiceNumber: string;
  priced: ReturnType<typeof computePrice>;
}

/**
 * Create an order from a package + guest count + add-ons.
 *
 * The price is recomputed server-side from the database, never accepted from
 * the client. That is the only way to prevent a tampered cart from underpaid
 * pricing. Coupon validation also happens here so a race can't double-spend a
 * limited-use code.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, orderNumber: true, status: true, totalAmount: true, depositAmount: true, balanceAmount: true, invoice: { select: { number: true } } },
    });
    if (existing) {
      return {
        id: existing.id,
        orderNumber: existing.orderNumber,
        status: existing.status as OrderStatusT,
        totalAmount: existing.totalAmount,
        depositAmount: existing.depositAmount,
        balanceAmount: existing.balanceAmount,
        depositDue: 0,
        invoiceNumber: existing.invoice?.number ?? "",
        priced: computePrice({ guestCount: 0, lines: [], taxPercent: 0 }),
      };
    }
  }

  const [pkg, vendor, settings, customer] = await Promise.all([
    prisma.package.findUnique({
      where: { id: input.packageId },
      include: { addOns: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.vendorProfile.findUnique({
      where: { id: input.vendorProfileId },
      include: {
        primaryCategory: {
          select: {
            defaultTaxPercent: true,
            defaultDepositPercent: true,
            defaultCommissionRate: true,
          },
        },
      },
    }),
    getSettings(),
    prisma.user.findUnique({
      where: { id: input.customerId },
      select: { state: true },
    }),
  ]);

  if (!pkg || !pkg.isActive) throw new ApiError("NOT_FOUND", "That package is no longer available.");
  if (!vendor || vendor.status !== "APPROVED")
    throw new ApiError("BAD_REQUEST", "This vendor is not accepting bookings.");

  const guestCount = Math.max(1, Math.round(input.guestCount));

  /* ── Build price lines ─────────────────────────────────────────────── */
  const addOnMap = new Map(pkg.addOns.map((a) => [a.id, a]));
  const selectedAddOns = (input.addOnIds ?? [])
    .map((sel) => ({ sel, addOn: addOnMap.get(sel.id) }))
    .filter((x): x is { sel: { id: string; quantity?: number }; addOn: NonNullable<typeof x.addOn> } => Boolean(x.addOn));

  const lines: PriceLine[] = [
    {
      kind: "PACKAGE",
      label: pkg.title,
      detail: pkg.summary,
      basis: pkg.pricingModel === "PER_EVENT" ? "PER_EVENT" : "PER_PLATE",
      pricingModel: pkg.pricingModel as never,
      unitPrice: pkg.pricingModel === "PER_EVENT" ? (pkg.basePrice ?? 0) : (pkg.pricePerPlate ?? 0),
      quantity: guestCount,
    },
  ];

  for (const { sel, addOn } of selectedAddOns) {
    const qty = Math.max(1, Math.min(sel.quantity ?? 1, addOn.maxQuantity || 1));
    lines.push({
      kind: "ADDON",
      label: addOn.name,
      detail: addOn.description,
      basis: addOn.pricingModel === "PER_EVENT" ? "PER_EVENT" : "PER_PLATE",
      unitPrice: addOn.price,
      quantity: qty,
      meta: { addOnId: addOn.id },
    });
  }

  /* ── Tax & terms ──────────────────────────────────────────────────── */
  const taxPercent =
    vendor.primaryCategory?.defaultTaxPercent ?? settings.taxDefault;
  const intraState = isIntraState(vendor.baseState, customer?.state);
  const depositPercent = vendor.depositPercent || settings.depositDefault;

  /* ── Coupon ───────────────────────────────────────────────────────── */
  let couponDiscount: { type: "PERCENT" | "FIXED"; value: number; max?: number | null } | null = null;
  if (input.couponCode) {
    const coupon = await validateCoupon(input.couponCode, input.customerId, vendor.id);
    couponDiscount = {
      type: coupon.discountType as "PERCENT" | "FIXED",
      value: coupon.discountValue,
      max: coupon.maxDiscountAmount,
    };
  }

  const priced = computePrice({
    guestCount,
    lines,
    taxPercent,
    intraState,
    depositPercent,
    discount: {
      couponCode: input.couponCode ?? null,
      couponType: couponDiscount?.type ?? null,
      couponValue: couponDiscount?.value ?? null,
      couponMaxDiscount: couponDiscount?.max ?? null,
      manualDiscountAmount: input.manualDiscountAmount ?? null,
    },
  });

  const commissionPercent = resolveCommissionPercent({
    vendorOverride: vendor.commissionRate,
    categoryRate: vendor.primaryCategory?.defaultCommissionRate ?? null,
    settings,
  });

  const split = computeSplit({
    grossAmount: priced.totalAmount,
    commissionRate: commissionPercent / 100,
  });

  const due = balanceDueDate(input.eventDate, settings.payoutLagDays);
  const orderNumber = buildReference("ORD");
  const invoiceNumber = buildReference("INV");

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        vendorProfileId: input.vendorProfileId,
        eventId: input.eventId ?? null,
        quoteId: input.quoteId ?? null,
        packageId: input.packageId,
        status: "PENDING_PAYMENT",
        eventDate: startOfDayUTC(input.eventDate),
        startTime: input.startTime ?? "18:00",
        guestCount,
        subtotalAmount: priced.subtotalAmount,
        discountAmount: priced.discountAmount,
        taxPercent: priced.taxPercent,
        taxAmount: priced.taxAmount,
        totalAmount: priced.totalAmount,
        commissionRate: commissionPercent / 100,
        commissionAmount: split.commissionAmount,
        vendorNetAmount: split.vendorNetAmount,
        currency: priced.currency,
        depositPercent,
        depositAmount: priced.depositAmount,
        depositStatus: "DUE",
        balanceAmount: priced.balanceAmount,
        balanceStatus: "PENDING",
        balanceDueDate: due,
        venueName: input.venue?.name ?? null,
        venueLine1: input.venue?.line1 ?? null,
        venueCity: input.venue?.city ?? null,
        venueState: input.venue?.state ?? customer?.state ?? null,
        venuePostal: input.venue?.postal ?? null,
        latitude: input.venue?.lat ?? null,
        longitude: input.venue?.lng ?? null,
        customerNote: input.customerNote ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        items: {
          create: lines.map((l, i) => ({
            kind: l.kind,
            label: l.label,
            detail: l.detail ?? null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal:
              l.kind === "DISCOUNT"
                ? -Math.abs(l.unitPrice)
                : l.basis === "PER_PLATE"
                  ? l.unitPrice * l.quantity
                  : l.unitPrice,
            sortOrder: i,
            metaJson: JSON.stringify(l.meta ?? {}),
            addOnId: (l.meta?.addOnId as string | undefined) ?? null,
            packageId: i === 0 ? input.packageId : null,
          })),
        },
        statusHistory: {
          create: {
            toStatus: "PENDING_PAYMENT",
            note: input.instantBook
              ? "Instant booking — awaiting deposit capture"
              : "Quote accepted — awaiting deposit capture",
            actorRole: "CUSTOMER",
          },
        },
      },
      select: { id: true },
    });

    // Claim the calendar slot in the same transaction as the order.
    await tx.availabilityLedger.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        date: startOfDayUTC(input.eventDate),
        orderId: created.id,
        eventId: input.eventId ?? null,
        guestCount,
        slotsUsed: 1,
      },
    });

    if (input.couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: input.couponCode.toUpperCase() },
      });
      if (coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: input.customerId,
            orderId: created.id,
            amount: priced.discountAmount,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    await tx.invoice.create({
      data: {
        orderId: created.id,
        number: invoiceNumber,
        currency: priced.currency,
        subtotalAmount: priced.subtotalAmount,
        discountAmount: priced.discountAmount,
        taxPercent: priced.taxPercent,
        taxAmount: priced.taxAmount,
        platformFee: 0,
        totalAmount: priced.totalAmount,
        amountPaid: 0,
        amountDue: priced.totalAmount,
        dueDate: due,
        snapshotJson: JSON.stringify({
          lines,
          taxBreakup: priced.taxBreakup,
          intraState,
          guestCount,
          commissionPercent,
          vendor: { name: vendor.businessName, gstin: vendor.gstNumber },
        }),
      },
    });

    return created;
  });

  return {
    id: order.id,
    orderNumber,
    status: "PENDING_PAYMENT",
    totalAmount: priced.totalAmount,
    depositAmount: priced.depositAmount,
    balanceAmount: priced.balanceAmount,
    depositDue: priced.depositAmount,
    invoiceNumber,
    priced,
  };
}

/* ───────────────────────── Status transitions ─────────────────────────── */

export interface TransitionInput {
  orderId: string;
  to: OrderStatusT;
  actorId: string;
  actorRole: string;
  note?: string | null;
  /** Skip legality checks — admin override, still audited. */
  force?: boolean;
}

export async function transitionOrder(input: TransitionInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      customer: { select: { id: true, name: true } },
      vendorProfile: { select: { id: true, userId: true, businessName: true } },
      invoice: true,
    },
  });

  if (!order) throw new ApiError("NOT_FOUND", "Order not found.");

  const from = order.status as OrderStatusT;

  if (from === input.to) return order;

  if (!input.force && !canTransition(from, input.to)) {
    throw new ApiError(
      "CONFLICT",
      `Cannot move an order from ${ORDER_STATUS_LABELS[from]} to ${ORDER_STATUS_LABELS[input.to]}.`,
    );
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: input.to };

  if (input.to === "CONFIRMED" && !order.confirmedAt) data.confirmedAt = now;
  if (input.to === "COMPLETED") {
    data.completedAt = now;
    data.paidInFullAt = order.depositStatus === "PAID" ? now : order.paidInFullAt;
  }
  if (["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(input.to)) {
    data.cancelledAt = now;
    data.cancellationReason = input.note ?? null;
  }

  // Free the calendar slot the moment the booking can no longer consume it.
  const releasesCapacity = !HOLDING_STATUSES.includes(input.to);
  if (releasesCapacity) {
    await prisma.availabilityLedger.updateMany({
      where: { orderId: order.id, releasedAt: null },
      data: { releasedAt: now },
    });
  }

  if (input.to === "COMPLETED") {
    await prisma.vendorProfile.update({
      where: { id: order.vendorProfileId },
      data: { completedOrders: { increment: 1 } },
    });
    await syncReputation(order.vendorProfileId);
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: from,
        toStatus: input.to,
        note: input.note ?? null,
        actorId: input.actorId,
        actorRole: input.actorRole,
      },
    }),
    ...(order.invoice && ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(input.to)
      ? [
          prisma.invoice.update({
            where: { id: order.invoice.id },
            data: { amountDue: 0 },
          }),
        ]
      : []),
  ]);

  await notifyStatusChange({
    customerUserId: order.customer.id,
    vendorUserId: order.vendorProfile.userId,
    orderNumber: order.orderNumber,
    orderId: order.id,
    fromStatus: from,
    toStatus: input.to,
    statusLabel: ORDER_STATUS_LABELS[input.to],
    note: input.note,
    actorRole: input.actorRole,
  });

  return prisma.order.findUnique({ where: { id: order.id } });
}

/* ───────────────────────────── Refunds ────────────────────────────────── */

export interface RefundPreview {
  refundAmount: number;
  retainedAmount: number;
  percentRefund: number;
  headline: string;
  detail: string;
  paidAmount: number;
  tiers: ReturnType<typeof refundSchedule>;
}

export async function previewRefund(orderId: string, fullRefund = false): Promise<RefundPreview> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { where: { status: "CAPTURED", kind: { not: "REFUND" } } },
    },
  });
  if (!order) throw new ApiError("NOT_FOUND", "Order not found.");

  const paidAmount = order.payments.reduce((a, p) => a + p.amount, 0);
  const priorRefunded = order.refundAmount;
  const settings = await getSettings();

  const quote = quoteRefund({
    eventDate: order.eventDate,
    paidAmount,
    priorRefundedAmount: priorRefunded,
    tiers: settings.refundTiers,
    fullRefund,
  });

  return {
    refundAmount: quote.refundAmount,
    retainedAmount: quote.retainedAmount,
    percentRefund: quote.percentRefund,
    headline: quote.headline,
    detail: quote.detail,
    paidAmount,
    tiers: refundSchedule(paidAmount, order.eventDate, settings.refundTiers),
  };
}

export async function executeRefund(orderId: string, options: { fullRefund?: boolean; note?: string } = {}) {
  const preview = await previewRefund(orderId, options.fullRefund);
  if (preview.refundAmount <= 0) {
    throw new ApiError("BAD_REQUEST", "This order has nothing left to refund.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { vendorProfile: true, invoice: true },
  });
  if (!order) throw new ApiError("NOT_FOUND", "Order not found.");

  const settings = await getSettings();
  const split = computeSplit({
    grossAmount: order.totalAmount,
    refundedAmount: order.refundAmount + preview.refundAmount,
    commissionRate: order.commissionRate,
  });

  const collected = order.depositPaid + order.balancePaid;
  const totalRefunded = order.refundAmount + preview.refundAmount;
  const fullyRefunded = totalRefunded >= collected;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        vendorProfileId: order.vendorProfileId,
        provider: "MOCK",
        kind: "REFUND",
        status: "CAPTURED",
        method: "OFFLINE",
        amount: preview.refundAmount,
        currency: order.currency,
        capturedAt: new Date(),
        refundedAt: new Date(),
        metaJson: JSON.stringify({ reason: options.note ?? "Customer cancellation" }),
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        refundAmount: { increment: preview.refundAmount },
        commissionAmount: split.commissionAmount,
        vendorNetAmount: split.vendorNetAmount,
        depositStatus: "REFUNDED",
        balanceStatus: fullyRefunded ? "REFUNDED" : order.balanceStatus,
      },
    });

    if (order.invoice) {
      const invoice = await tx.invoice.findUnique({ where: { orderId: order.id } });
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            refundedAmount: { increment: preview.refundAmount },
            amountDue: 0,
          },
        });
      }
    }
  });

  await transitionOrder({
    orderId,
    to: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
    actorId: order.customerId,
    actorRole: "CUSTOMER",
    note: options.note ?? "Refund processed",
    force: true,
  });

  return { refunded: preview.refundAmount, split, settings };
}

/* ────────────────────────── Payment settlement ────────────────────────── */

export async function recordPayment(input: {
  orderId: string;
  amount: number;
  kind: "DEPOSIT" | "BALANCE";
  provider: string;
  providerRef?: string | null;
  method: string;
  idempotencyKey?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      vendorProfile: { select: { userId: true, commissionRate: true } },
    },
  });
  if (!order) throw new ApiError("NOT_FOUND", "Order not found.");

  if (input.idempotencyKey) {
    const dupe = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (dupe) return dupe;
  }

  const split = computeSplit({
    grossAmount: input.amount,
    commissionRate: order.commissionRate,
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      customerId: order.customerId,
      vendorProfileId: order.vendorProfileId,
      provider: input.provider,
      providerRef: input.providerRef ?? null,
      method: input.method,
      kind: input.kind,
      status: "CAPTURED",
      amount: input.amount,
      platformFee: split.platformFee,
      commissionAmount: split.commissionAmount,
      vendorNetAmount: split.vendorNetAmount,
      currency: order.currency,
      idempotencyKey: input.idempotencyKey ?? null,
      capturedAt: new Date(),
    },
  });

  const isDeposit = input.kind === "DEPOSIT";
  const newDepositPaid = order.depositPaid + input.amount;
  const newBalancePaid = isDeposit ? order.balancePaid : order.balancePaid + input.amount;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      depositPaid: newDepositPaid,
      ...(isDeposit ? { depositStatus: "PAID" } : {}),
      balanceStatus: newBalancePaid >= order.balanceAmount ? "PAID" : "DUE",
      ...(newBalancePaid >= order.balanceAmount ? { paidInFullAt: new Date() } : {}),
    },
  });

  await prisma.invoice.updateMany({
    where: { orderId: order.id },
    data: {
      amountPaid: { increment: input.amount },
      amountDue: { decrement: input.amount },
    },
  });

  // The deposit is what converts a pending order into a confirmed booking.
  if (isDeposit && order.status === "PENDING_PAYMENT") {
    await transitionOrder({
      orderId: order.id,
      to: "CONFIRMED",
      actorId: order.customerId,
      actorRole: "CUSTOMER",
      note: "Deposit received — booking confirmed",
    });
  }

  await prisma.notification.create({
    data: {
      userId: order.vendorProfile.userId,
      type: "PAYMENT_RECEIVED",
      channel: NotificationChannel.IN_APP,
      title: "Payment received",
      body: `${order.orderNumber} · ${input.kind.toLowerCase()} captured`,
      href: `/vendor/orders?focus=${order.id}`,
      sentAt: new Date(),
    },
  });

  return payment;
}

/* ───────────────────────────── Coupons ────────────────────────────────── */

export async function validateCoupon(code: string, userId: string, vendorProfileId: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new ApiError("BAD_REQUEST", "That code is not valid.");
  }

  const now = new Date();
  if (coupon.startsAt > now) throw new ApiError("BAD_REQUEST", "That code is not active yet.");
  if (coupon.endsAt < now) throw new ApiError("BAD_REQUEST", "That code has expired.");
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError("BAD_REQUEST", "That code has been fully redeemed.");
  }
  if (!coupon.appliesToAll && coupon.vendorProfileId !== vendorProfileId) {
    throw new ApiError("BAD_REQUEST", "That code does not apply to this vendor.");
  }

  if (coupon.perUserLimit > 0) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (used >= coupon.perUserLimit) {
      throw new ApiError("BAD_REQUEST", "You have already used that code.");
    }
  }

  return coupon;
}

/* ─────────────────────────── Reputation ───────────────────────────────── */

/**
 * Recompute a vendor's cached rating from published reviews.
 * Called after publish, edit, hide and delete — never incrementally, so the
 * aggregate can never drift out of sync with its source rows.
 */
export async function syncReputation(vendorProfileId: string) {
  const agg = await prisma.review.aggregate({
    where: { vendorProfileId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.vendorProfile.update({
    where: { id: vendorProfileId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
      ratingCount: agg._count._all,
    },
  });

  return { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all };
}

/** Recalculate the invoice snapshot after any money-affecting change. */
export async function refreshInvoiceTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { where: { status: "CAPTURED" } }, invoice: true },
  });
  if (!order?.invoice) return null;

  const paid = order.payments
    .filter((p) => p.kind !== "REFUND")
    .reduce((a, p) => a + p.amount, 0);
  const refunded = order.payments
    .filter((p) => p.kind === "REFUND")
    .reduce((a, p) => a + p.amount, 0);

  return prisma.invoice.update({
    where: { id: order.invoice.id },
    data: {
      amountPaid: paid,
      amountDue: Math.max(order.totalAmount - paid, 0),
      refundedAmount: refunded,
    },
  });
}

export { depositPlan, computeTax, computePrice };