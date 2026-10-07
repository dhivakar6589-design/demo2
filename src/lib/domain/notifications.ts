/**
 * Notification fan-out.
 *
 * Every call writes an in-app Notification row (the source of truth the bell
 * reads from) and then attempts delivery on the requested channels. Delivery
 * failures never block the transaction — they mark the row failed so ops can
 * see them — because a customer must never lose an order confirmation because
 * an SMTP provider blinked.
 */

import { NotificationChannel, NotificationType, type NotificationChannel as Channel } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";
import { formatMoney, formatDate } from "@/lib/utils";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  data?: Record<string, unknown>;
  channels?: Channel[];
  /** Suppress duplicate sends inside this window (minutes). */
  dedupeMinutes?: number;
}

export async function notify(input: NotifyInput) {
  const channels: Channel[] = input.channels?.length
    ? input.channels
    : [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

  if (input.dedupeMinutes) {
    const since = new Date(Date.now() - input.dedupeMinutes * 60_000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (existing) return { skipped: true };
  }

  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      channel: channels[0],
      dataJson: JSON.stringify(input.data ?? {}),
      sentAt: new Date(),
    },
  });

  // Best-effort out-of-band delivery.
  for (const channel of channels) {
    if (channel === NotificationChannel.IN_APP) continue;
    try {
      if (channel === NotificationChannel.EMAIL) {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { email: true, name: true },
        });
        if (user) {
          await sendEmail({
            to: user.email,
            subject: input.title,
            preview: input.body.slice(0, 140),
            heading: input.title,
            body: input.body,
            actionLabel: input.href ? "View" : undefined,
            actionHref: input.href ?? undefined,
          });
        }
      } else if (channel === NotificationChannel.SMS || channel === NotificationChannel.WHATSAPP) {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { phone: true },
        });
        if (user?.phone) await sendSms({ to: user.phone, body: input.body, channel });
      }
    } catch {
      await prisma.notification.updateMany({
        where: { id: row.id, readAt: null },
        data: { failedAt: new Date() },
      });
    }
  }

  return { id: row.id, skipped: false };
}

/** Notify many users at once (e.g. an admin broadcast). */
export async function notifyMany(inputs: NotifyInput[]) {
  const results = await Promise.allSettled(inputs.map((i) => notify(i)));
  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

/* ─────────────────────── Event-specific templates ─────────────────────── */

export async function notifyQuoteReceived(input: {
  vendorUserId: string;
  customerName: string;
  eventType: string;
  eventDate: Date | null;
  guestCount: number;
  quoteId: string;
  vendorSlug: string;
}) {
  return notify({
    userId: input.vendorUserId,
    type: NotificationType.QUOTE_NEW,
    title: "New quote request",
    body: `${input.customerName} requested a quote for ${
      input.eventType.toLowerCase().replace(/_/g, " ")
    } on ${formatDate(input.eventDate)} — ${input.guestCount} guests.`,
    href: `/vendor/quotes?focus=${input.quoteId}`,
    data: { quoteId: input.quoteId, guestCount: input.guestCount },
  });
}

export async function notifyBookingConfirmed(input: {
  customerUserId: string;
  vendorUserId: string;
  businessName: string;
  orderNumber: string;
  eventDate: Date;
  totalAmount: number;
  orderId: string;
  vendorSlug: string;
  customerName: string;
  guestCount: number;
  venueName?: string | null;
}) {
  const when = formatDate(input.eventDate);

  const [customer, vendor] = await Promise.all([
    notify({
      userId: input.customerUserId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `Booking confirmed — ${input.businessName}`,
      body: `${input.orderNumber} is confirmed for ${when}, ${input.guestCount} guests${
        input.venueName ? ` at ${input.venueName}` : ""
      }. Total ${formatMoney(input.totalAmount)}.`,
      href: `/dashboard/orders/${input.orderId}`,
      data: { orderId: input.orderId, orderNumber: input.orderNumber },
    }),
    notify({
      userId: input.vendorUserId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `New booking — ${input.businessName}`,
      body: `${input.customerName} booked you for ${when} (${input.guestCount} guests). Order ${input.orderNumber}.`,
      href: `/vendor/orders?focus=${input.orderId}`,
      data: { orderId: input.orderId },
    }),
  ]);

  return { customer, vendor };
}

export async function notifyPaymentReceived(input: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  businessName: string;
  vendorUserId: string;
  amount: number;
  kind: "DEPOSIT" | "BALANCE";
}) {
  const kind = input.kind === "DEPOSIT" ? "deposit" : "balance payment";

  return notify({
    userId: input.vendorUserId,
    type: NotificationType.PAYMENT_RECEIVED,
    title: `${formatMoney(input.amount)} received`,
    body: `${input.customerName} paid the ${kind} for ${input.orderNumber} (${input.businessName}).`,
    href: `/vendor/orders?focus=${input.orderId}`,
    data: { orderId: input.orderId, amount: input.amount },
  });
}

export async function notifyReviewRequest(input: {
  customerUserId: string;
  businessName: string;
  orderNumber: string;
  orderId: string;
  vendorSlug: string;
  eventDate: Date;
}) {
  return notify({
    userId: input.customerUserId,
    type: NotificationType.REVIEW_REQUEST,
    title: `How was ${input.businessName}?`,
    body: `Your ${input.orderNumber} event on ${formatDate(input.eventDate)} is complete. Reviews help other couples choose well.`,
    href: `/dashboard/orders/${input.orderId}?review=1`,
    data: { orderId: input.orderId },
  });
}

export async function notifyVendorReview(input: {
  vendorUserId: string;
  businessName: string;
  rating: number;
  reviewId: string;
}) {
  return notify({
    userId: input.vendorUserId,
    type: NotificationType.REVIEW_RECEIVED,
    title: `New ${input.rating}-star review`,
    body: `${input.businessName} received a new ${input.rating}-star review.`,
    href: `/vendor/reviews?focus=${input.reviewId}`,
    data: { reviewId: input.reviewId, rating: input.rating },
  });
}

export async function notifyStatusChange(input: {
  customerUserId: string;
  vendorUserId: string;
  orderNumber: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
  statusLabel: string;
  note?: string | null;
  actorRole: string;
}) {
  const target = input.actorRole === "VENDOR" ? input.customerUserId : input.vendorUserId;
  return notify({
    userId: target,
    type: NotificationType.ORDER_STATUS,
    title: `${input.orderNumber} · ${input.statusLabel}`,
    body: input.note || `Status moved from ${input.fromStatus} to ${input.statusLabel}.`,
    href: input.actorRole === "VENDOR" ? `/dashboard/orders/${input.orderId}` : `/vendor/orders?focus=${input.orderId}`,
    data: { orderId: input.orderId, status: input.toStatus },
  });
}

export async function notifyMessage(input: {
  recipientUserId: string;
  senderName: string;
  preview: string;
  threadId: string;
  role: "CUSTOMER" | "VENDOR";
}) {
  return notify({
    userId: input.recipientUserId,
    type: NotificationType.MESSAGE_NEW,
    title: `New message from ${input.senderName}`,
    body: input.preview.slice(0, 160),
    href: input.role === "VENDOR" ? `/vendor/messages/${input.threadId}` : `/dashboard/messages/${input.threadId}`,
    data: { threadId: input.threadId },
    channels: [NotificationChannel.IN_APP],
  });
}

/* ─────────────────────────── Reminder sweep ──────────────────────────── */

/**
 * Create the 7-day and 1-day reminders plus balance-due nudges.
 * Idempotent: safe to run on every cron tick.
 */
export async function runEventReminders(now = new Date()) {
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const in1 = new Date(now.getTime() + 1 * 86_400_000);

  const [sevenDay, oneDay, dueSoon] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PREPARATION"] },
        eventDate: { gte: now, lte: in7 },
      },
      select: {
        id: true,
        orderNumber: true,
        eventDate: true,
        guestCount: true,
        customer: { select: { id: true, name: true } },
        vendorProfile: { select: { userId: true, businessName: true, slug: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PREPARATION"] },
        eventDate: { gte: now, lte: in1 },
      },
      select: {
        id: true,
        orderNumber: true,
        eventDate: true,
        balanceStatus: true,
        customer: { select: { id: true } },
        vendorProfile: { select: { userId: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: "CONFIRMED",
        balanceStatus: { in: ["DUE", "PENDING"] },
        balanceDueDate: { lte: in7 },
      },
      select: {
        id: true,
        orderNumber: true,
        balanceAmount: true,
        eventDate: true,
        customer: { select: { id: true } },
      },
    }),
  ]);

  await notifyMany(
    sevenDay.map((o) => ({
      userId: o.customer.id,
      type: NotificationType.EVENT_REMINDER_7D,
      title: `${o.orderNumber} is in 7 days`,
      body: `${o.vendorProfile.businessName} on ${formatDate(o.eventDate)} for ${o.guestCount} guests. Confirm logistics and dietary notes.`,
      href: `/dashboard/orders/${o.id}`,
      dedupeMinutes: 60 * 24,
    })),
  );

  await notifyMany(
    oneDay.map((o) => ({
      userId: o.vendorProfile.userId,
      type: NotificationType.EVENT_REMINDER_1D,
      title: `${o.orderNumber} is tomorrow`,
      body: `Service for ${formatDate(o.eventDate)}. Confirm crew arrival and setup window.`,
      href: `/vendor/orders?focus=${o.id}`,
      dedupeMinutes: 60 * 24,
    })),
  );

  await notifyMany(
    dueSoon.map((o) => ({
      userId: o.customer.id,
      type: NotificationType.PAYMENT_DUE,
      title: `Balance due for ${o.orderNumber}`,
      body: `${formatMoney(o.balanceAmount)} is due before ${formatDate(o.eventDate)}.`,
      href: `/dashboard/orders/${o.id}`,
      dedupeMinutes: 60 * 24,
    })),
  );

  return {
    sevenDay: sevenDay.length,
    oneDay: oneDay.length,
    balanceDue: dueSoon.length,
  };
}