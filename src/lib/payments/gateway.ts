/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENT GATEWAY
 * ═══════════════════════════════════════════════════════════════════════════
 * One interface, two implementations:
 *
 *   StripeGateway — real Stripe Connect split payments (destination charges
 *                   with application_fee_amount) plus webhook reconciliation.
 *   MockGateway   — deterministic test gateway used whenever STRIPE_SECRET_KEY
 *                   is absent. It exercises the SAME downstream code (ledger
 *                   rows, split maths, invoice updates, notifications, payouts),
 *                   so the demo is a real test of the business logic rather
 *                   than a UI mock.
 *
 * `getGateway()` picks the implementation once at module load.
 */

import { computeSplit } from "@/lib/domain/commission";
import { getSettings } from "@/lib/domain/settings";
import { recordPayment } from "@/lib/domain/orders";
import { notifyBookingConfirmed } from "@/lib/domain/notifications";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export interface CreatePaymentIntentInput {
  orderId: string;
  amount: number;
  kind: "DEPOSIT" | "BALANCE";
  customerId: string;
  customerEmail: string;
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string | null;
  provider: "stripe" | "mock";
  /** Mock only: confirms immediately and reports success inline. */
  settled?: boolean;
  message?: string;
}

export interface Gateway {
  name: "stripe" | "mock";
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  refund(paymentId: string, amount: number): Promise<{ ok: boolean; reference?: string }>;
}

function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/* ───────────────────────────── Stripe ─────────────────────────────────── */

class StripeGateway implements Gateway {
  name = "stripe" as const;

  private client: import("stripe").Stripe | null = null;

  private async getClient() {
    if (this.client) return this.client;
    const Stripe = (await import("stripe")).default;
    this.client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
    return this.client;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const client = await this.getClient();

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        vendorProfile: { select: { commissionRate: true, stripeAccountId: true } },
      },
    });

    const split = computeSplit({
      grossAmount: input.amount,
      commissionRate: order?.commissionRate ?? 0.12,
    });

    // Platform fee is charged on the gross and settled to the platform account;
    // the remainder is transferred to the vendor's connected account.
    const applicationFeeAmount = Math.min(
      split.platformFee,
      Math.max(input.amount - 1, 0),
    );

    const intent = await client.paymentIntents.create(
      {
        amount: input.amount,
        currency: "inr",
        automatic_payment_methods: { enabled: true },
        application_fee_amount: applicationFeeAmount,
        metadata: {
          orderId: input.orderId,
          kind: input.kind,
          platformFee: String(split.platformFee),
          vendorNet: String(split.vendorNetAmount),
        },
        receipt_email: input.customerEmail,
        ...(order?.vendorProfile.stripeAccountId
          ? { transfer_data: { destination: order.vendorProfile.stripeAccountId } }
          : {}),
      },
      { idempotencyKey: input.idempotencyKey },
    );

    await prisma.payment.create({
      data: {
        orderId: input.orderId,
        customerId: input.customerId,
        vendorProfileId: order?.vendorProfileId ?? "",
        provider: "STRIPE",
        providerRef: intent.id,
        method: "CARD",
        kind: input.kind,
        status: "PENDING",
        amount: input.amount,
        platformFee: split.platformFee,
        commissionAmount: split.commissionAmount,
        vendorNetAmount: split.vendorNetAmount,
        currency: "INR",
        idempotencyKey: input.idempotencyKey,
      },
    });

    return { id: intent.id, clientSecret: intent.client_secret, provider: "stripe" as const };
  }

  async refund(paymentId: string, amount: number) {
    const client = await this.getClient();
    const refund = await client.refunds.create(
      { payment_intent: paymentId, amount },
      { idempotencyKey: `refund_${paymentId}_${amount}` },
    );
    return { ok: refund.status === "succeeded", reference: refund.id };
  }
}

/* ────────────────────────────── Mock ─────────────────────────────────── */

/**
 * Deterministic test gateway.
 *
 * Every call settles synchronously — no redirect, no waiting — which keeps the
 * demo frictionless while still exercising ledger, split, invoice, status and
 * notification code paths exactly as Stripe's webhook would.
 */
class MockGateway implements Gateway {
  name = "mock" as const;

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const reference = `mock_pi_${input.idempotencyKey.slice(0, 18)}`;

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        eventDate: true,
        guestCount: true,
        totalAmount: true,
        status: true,
        venueName: true,
        customer: { select: { id: true, name: true } },
        vendorProfile: { select: { id: true, businessName: true, userId: true, slug: true } },
      },
    });

    if (!order) throw new Error("Order not found for payment intent.");

    await recordPayment({
      orderId: order.id,
      amount: input.amount,
      kind: input.kind,
      provider: "MOCK",
      providerRef: reference,
      method: "UPI",
      idempotencyKey: input.idempotencyKey,
    });

    if (input.kind === "DEPOSIT") {
      await notifyBookingConfirmed({
        customerUserId: order.customer.id,
        vendorUserId: order.vendorProfile.userId,
        businessName: order.vendorProfile.businessName,
        orderNumber: order.orderNumber,
        eventDate: order.eventDate,
        totalAmount: order.totalAmount,
        orderId: order.id,
        vendorSlug: order.vendorProfile.slug,
        customerName: order.customer.name,
        guestCount: order.guestCount,
        venueName: order.venueName,
      });
    }

    return {
      id: reference,
      clientSecret: null,
      provider: "mock" as const,
      settled: true,
      message: `Captured ${formatDate(new Date())} · test gateway`,
    };
  }

  async refund(paymentId: string) {
    return { ok: true, reference: `mock_re_${paymentId.slice(0, 12)}` };
  }
}

/* ───────────────────────────── Selector ──────────────────────────────── */

let gateway: Gateway | null = null;

export function getGateway(): Gateway {
  if (gateway) return gateway;
  gateway = stripeEnabled() ? new StripeGateway() : new MockGateway();
  return gateway;
}

export function paymentMode() {
  return getGateway().name;
}

/* ──────────────────────── Webhook reconciliation ──────────────────────── */

/**
 * Stripe calls this after a capture. It is idempotent: a replayed event finds
 * the payment already recorded and returns early, which is what makes Stripe's
 * at-least-once delivery safe.
 */
export async function handleStripeEvent(event: {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}) {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as {
        id: string;
        amount_received: number;
        metadata: { orderId?: string; kind?: "DEPOSIT" | "BALANCE" };
      };
      if (!intent.metadata?.orderId) return { ignored: true };

      const existing = await prisma.payment.findUnique({
        where: { providerRef: intent.id },
        select: { id: true, status: true },
      });
      if (existing?.status === "CAPTURED") return { duplicate: true };

      const order = await prisma.order.findUnique({
        where: { id: intent.metadata.orderId },
        select: {
          id: true,
          orderNumber: true,
          eventDate: true,
          guestCount: true,
          totalAmount: true,
          venueName: true,
          customer: { select: { id: true, name: true } },
          vendorProfile: { select: { businessName: true, userId: true, slug: true } },
        },
      });
      if (!order) return { ignored: true };

      const kind = intent.metadata.kind ?? "DEPOSIT";

      if (!existing) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            customerId: order.customer.id,
            vendorProfileId: (await prisma.order.findUniqueOrThrow({
              where: { id: order.id },
              select: { vendorProfileId: true },
            })).vendorProfileId,
            provider: "STRIPE",
            providerRef: intent.id,
            method: "CARD",
            kind,
            status: "CAPTURED",
            amount: intent.amount_received,
            currency: "INR",
            capturedAt: new Date(),
          },
        });
      } else {
        await prisma.payment.update({
          where: { id: existing.id },
          data: { status: "CAPTURED", capturedAt: new Date() },
        });
      }

      await recordPayment({
        orderId: order.id,
        amount: intent.amount_received,
        kind,
        provider: "STRIPE",
        providerRef: intent.id,
        method: "CARD",
      });

      if (kind === "DEPOSIT") {
        await notifyBookingConfirmed({
          customerUserId: order.customer.id,
          vendorUserId: order.vendorProfile.userId,
          businessName: order.vendorProfile.businessName,
          orderNumber: order.orderNumber,
          eventDate: order.eventDate,
          totalAmount: order.totalAmount,
          orderId: order.id,
          vendorSlug: order.vendorProfile.slug,
          customerName: order.customer.name,
          guestCount: order.guestCount,
          venueName: order.venueName,
        });
      }

      return { captured: intent.amount_received };
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as {
        id: string;
        last_payment_error?: { message?: string };
      };
      await prisma.payment.updateMany({
        where: { providerRef: intent.id, status: "PENDING" },
        data: { status: "FAILED", failureReason: intent.last_payment_error?.message ?? "Declined" },
      });
      return { failed: true };
    }

    case "charge.refunded": {
      const charge = event.data.object as { id: string; amount_refunded: number };
      await prisma.payment.updateMany({
        where: { providerRef: charge.id },
        data: { status: "REFUNDED", refundedAmount: charge.amount_refunded },
      });
      return { refunded: charge.amount_refunded };
    }

    default:
      return { ignored: true, type: event.type };
  }
}

/* ───────────────────────── Payout execution ──────────────────────────── */

/**
 * Release a scheduled payout.
 *
 * With Stripe configured and a connected account present this creates a
 * transfer; otherwise it marks the payout paid with a mock reference. Either
 * way the ledger row is the record of truth.
 */
export async function executePayout(payoutId: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { vendorProfile: { select: { stripeAccountId: true, businessName: true, userId: true } } },
  });
  if (!payout) throw new Error("Payout not found.");
  if (payout.status === "PAID") return payout;

  let reference = `mock_po_${payoutId.slice(-10)}`;

  if (stripeEnabled() && payout.vendorProfile.stripeAccountId) {
    const client = new (await import("stripe")).default(
      process.env.STRIPE_SECRET_KEY!,
      { apiVersion: "2025-08-27.basil" },
    );
    const transfer = await client.transfers.create(
      {
        amount: payout.netAmount,
        currency: payout.currency.toLowerCase(),
        destination: payout.vendorProfile.stripeAccountId,
        metadata: { payoutId: payout.id, orderId: payout.orderId ?? "" },
      },
      { idempotencyKey: `payout_${payout.id}` },
    );
    reference = transfer.id;
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      providerRef: reference,
      provider: stripeEnabled() ? "STRIPE" : "MOCK",
    },
  });

  await prisma.notification.create({
    data: {
      userId: payout.vendorProfile.userId,
      type: "PAYOUT_SENT",
      channel: "IN_APP",
      title: "Payout released",
      body: `${payout.vendorProfile.businessName} · payout reference ${reference}.`,
      href: "/vendor/payouts",
      sentAt: new Date(),
    },
  });

  return updated;
}

export { getSettings };