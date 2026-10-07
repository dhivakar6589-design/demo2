/**
 * Quote lifecycle.
 *
 *   customer drafts a request  →  DRAFT → SENT
 *   vendor prices it           →  SENT → ACCEPTED | REJECTED | WITHDRAWN
 *   customer accepts           →  ACCEPTED → converted to an Order
 *
 * A quote is never "priced" by the client. The vendor's quote builder posts
 * line items; this module owns the totals using the same money engine as
 * orders, so a quote and its resulting order can never disagree.
 */

import { type QuoteStatus as QuoteStatusT } from "@/lib/constants";
import { computePrice, type PriceLine } from "@/lib/domain/pricing";
import { getSettings } from "@/lib/domain/settings";
import { isIntraState } from "@/lib/domain/tax";
import { notify, notifyQuoteReceived } from "@/lib/domain/notifications";
import { buildReference } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export interface QuoteLineInput {
  kind: PriceLine["kind"];
  label: string;
  detail?: string | null;
  basis: "PER_PLATE" | "PER_EVENT";
  unitPrice: number;
  quantity: number;
  packageId?: string | null;
  menuItemId?: string | null;
  addOnId?: string | null;
}

export interface CreateQuoteInput {
  customerId: string;
  vendorProfileId: string;
  eventId?: string | null;
  packageId?: string | null;
  guestCount: number;
  eventDate?: Date | null;
  lines: QuoteLineInput[];
  note?: string | null;
  terms?: string | null;
  validUntil?: Date | null;
  status?: QuoteStatusT;
  manualDiscountAmount?: number | null;
  depositPercentOverride?: number | null;
}

/** Create (or replace) a quote and price it server-side. */
export async function createQuote(input: CreateQuoteInput) {
  const [vendor, customer, settings] = await Promise.all([
    prisma.vendorProfile.findUnique({
      where: { id: input.vendorProfileId },
      select: {
        id: true,
        baseState: true,
        depositPercent: true,
        userId: true,
        businessName: true,
        primaryCategory: { select: { defaultTaxPercent: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: input.customerId },
      select: { state: true, name: true },
    }),
    getSettings(),
  ]);

  if (!vendor) throw new ApiError("NOT_FOUND", "Vendor not found.");
  if (!input.lines.length) throw new ApiError("BAD_REQUEST", "A quote needs at least one line.");

  const taxPercent = vendor.primaryCategory?.defaultTaxPercent ?? settings.taxDefault;
  const depositPercent = input.depositPercentOverride ?? vendor.depositPercent ?? settings.depositDefault;

  const priced = computePrice({
    guestCount: input.guestCount,
    lines: input.lines,
    taxPercent,
    intraState: isIntraState(vendor.baseState, customer?.state),
    depositPercent,
    discount: { manualDiscountAmount: input.manualDiscountAmount ?? null },
  });

  const status = input.status ?? "DRAFT";

  const quote = await prisma.quote.create({
    data: {
      reference: buildReference("QTE"),
      customerId: input.customerId,
      vendorProfileId: input.vendorProfileId,
      eventId: input.eventId ?? null,
      packageId: input.packageId ?? null,
      status,
      source: status === "SENT" ? "VENDOR_INITIATED" : "REQUEST",
      guestCount: Math.max(1, input.guestCount),
      eventDate: input.eventDate ?? null,
      subtotalAmount: priced.subtotalAmount,
      discountAmount: priced.discountAmount,
      taxAmount: priced.taxAmount,
      totalAmount: priced.totalAmount,
      depositAmount: priced.depositAmount,
      currency: priced.currency,
      note: input.note ?? null,
      terms: input.terms ?? null,
      validUntil: input.validUntil ?? defaultExpiry(),
      items: {
        create: input.lines.map((l, i) => ({
          kind: l.kind,
          label: l.label,
          detail: l.detail ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal:
            l.basis === "PER_PLATE" ? l.unitPrice * l.quantity : l.unitPrice,
          sortOrder: i,
          packageId: l.packageId ?? null,
          menuItemId: l.menuItemId ?? null,
          addOnId: l.addOnId ?? null,
        })),
      },
    },
    include: { items: true },
  });

  if (status === "SENT") {
    await notifyQuoteReceived({
      vendorUserId: vendor.userId,
      customerName: customer?.name ?? "A customer",
      eventType: "event",
      eventDate: input.eventDate ?? null,
      guestCount: input.guestCount,
      quoteId: quote.id,
      vendorSlug: "",
    });
  }

  return { quote, priced };
}

/* ─────────────────────────── Customer requests ────────────────────────────── */

/**
 * A browse enquiry: "I'd like a quote for 120 guests on 12 Dec".
 *
 * Deliberately creates a quote with **no priced lines**. The customer has not
 * chosen a menu and we must never imply a price they were not shown, so every
 * amount stays at zero until the vendor prices it through `reviseQuote`. The
 * quote arrives as SENT because from the vendor's side it is an inbound
 * request awaiting a response, not a draft the customer is still editing.
 */
export interface RequestQuoteInput {
  customerId: string;
  vendorProfileId: string;
  guestCount: number;
  eventDate: Date;
  eventType?: string | null;
  packageId?: string | null;
  message?: string | null;
  /** Reuse this event instead of matching/creating one. */
  eventId?: string | null;
}

export async function requestQuote(input: RequestQuoteInput) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: input.vendorProfileId },
    select: {
      id: true,
      slug: true,
      status: true,
      businessName: true,
      instantBookable: true,
      userId: true,
      minGuests: true,
      maxGuests: true,
      baseCity: true,
      baseState: true,
    },
  });

  if (!vendor || vendor.status !== "APPROVED") {
    // Deliberately the same 404 as a missing vendor: an enquiry endpoint that
    // distinguishes "exists but not approved" tells scrapers who is pending.
    throw new ApiError("NOT_FOUND", "That vendor is not accepting enquiries.");
  }

  const pack = input.packageId
    ? await prisma.package.findFirst({
        where: { id: input.packageId, vendorProfileId: vendor.id, isActive: true },
        select: { id: true, title: true, minGuests: true, maxGuests: true },
      })
    : null;

  // A supplied package that doesn't belong to this vendor is a client bug or
  // an attempt to price against someone else's menu — reject rather than
  // silently drop it, so the caller sees the real problem.
  if (input.packageId && !pack) {
    throw new ApiError("NOT_FOUND", "That package is no longer available.");
  }

  const minGuests = pack ? pack.minGuests : vendor.minGuests;
  const maxGuests = pack ? pack.maxGuests : vendor.maxGuests;
  if (input.guestCount < minGuests || (maxGuests && input.guestCount > maxGuests)) {
    throw new ApiError(
      "VALIDATION_FAILED",
      `${vendor.businessName} takes ${minGuests}–${maxGuests ?? "unlimited"} guests for this selection.`,
      { guestCount: [`Must be between ${minGuests} and ${maxGuests ?? "∞"}`] },
    );
  }

  const customer = await prisma.user.findUnique({
    where: { id: input.customerId },
    select: { id: true, name: true },
  });
  if (!customer) throw new ApiError("UNAUTHORIZED", "Sign in to send an enquiry.");

  const dayKey = input.eventDate.toISOString().slice(0, 10);

  const event = await (async () => {
    if (input.eventId) {
      const owned = await prisma.event.findFirst({
        where: { id: input.eventId, customerId: input.customerId },
        select: { id: true },
      });
      if (owned) return owned.id;
    }

    // One customer planning one date should end up with one Event, however many
    // vendors they enquire with — otherwise the dashboard fills with duplicates.
    const candidates = await prisma.event.findMany({
      where: { customerId: input.customerId, status: { in: ["PLANNING", "QUOTED"] } },
      select: { id: true, eventDate: true },
    });
    const sameDay = candidates.find((e) => e.eventDate.toISOString().slice(0, 10) === dayKey);
    if (sameDay) return sameDay.id;

    const created = await prisma.event.create({
      data: {
        customerId: input.customerId,
        title: input.eventType
          ? `${input.eventType.replace(/_/g, " ").toLowerCase()} enquiry`
          : "Event enquiry",
        eventType: input.eventType ?? "OTHER",
        eventDate: input.eventDate,
        guestCount: input.guestCount,
        budgetAmount: 0,
        venueCity: vendor.baseCity,
        venueState: vendor.baseState,
        status: "PLANNING",
      },
      select: { id: true },
    });
    return created.id;
  })();

  const quote = await prisma.quote.create({
    data: {
      reference: buildReference("QTE"),
      customerId: input.customerId,
      vendorProfileId: vendor.id,
      eventId: event,
      packageId: pack?.id ?? null,
      status: "SENT",
      source: "REQUEST",
      guestCount: input.guestCount,
      eventDate: input.eventDate,
      note: input.message ?? null,
      validUntil: defaultExpiry(),
    },
    select: { id: true, reference: true, status: true, createdAt: true },
  });

  // The enquiry text belongs in the conversation, not only on the quote note —
  // that is where the vendor will reply.
  let threadId: string | null = null;
  if (input.message?.trim()) {
    const existing = await prisma.messageThread.findFirst({
      where: { customerId: input.customerId, vendorProfileId: vendor.id, isArchived: false },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    });

    threadId = existing?.id ?? null;
    if (!threadId) {
      const thread = await prisma.messageThread.create({
        data: {
          customerId: input.customerId,
          vendorProfileId: vendor.id,
          eventId: event,
          subject: `Enquiry for ${input.guestCount} guests`,
        },
        select: { id: true },
      });
      threadId = thread.id;
    }

    await prisma.message.create({
      data: {
        threadId,
        senderId: input.customerId,
        senderRole: "CUSTOMER",
        body: input.message.trim(),
      },
    });

    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: input.message.trim().slice(0, 140),
        vendorUnread: { increment: 1 },
      },
    });
  }

  await notifyQuoteReceived({
    vendorUserId: vendor.userId,
    customerName: customer.name,
    eventType: input.eventType ?? "event",
    eventDate: input.eventDate,
    guestCount: input.guestCount,
    quoteId: quote.id,
    vendorSlug: vendor.slug,
  });

  return { quote, eventId: event, threadId, vendorInstantBookable: vendor.instantBookable };
}

/** Vendor re-prices an existing DRAFT/ SENT quote, creating a new revision. */
export async function reviseQuote(input: {
  quoteId: string;
  lines: QuoteLineInput[];
  note?: string | null;
  terms?: string | null;
  validUntil?: Date | null;
  manualDiscountAmount?: number | null;
  actorId: string;
}) {
  const existing = await prisma.quote.findUnique({
    where: { id: input.quoteId },
    select: { id: true, status: true, customerId: true, vendorProfileId: true, packageId: true, eventId: true, guestCount: true, eventDate: true },
  });

  if (!existing) throw new ApiError("NOT_FOUND", "Quote not found.");
  if (!["DRAFT", "SENT"].includes(existing.status)) {
    throw new ApiError("CONFLICT", "This quote can no longer be revised.");
  }

  const { quote } = await createQuote({
    customerId: existing.customerId,
    vendorProfileId: existing.vendorProfileId,
    eventId: existing.eventId,
    packageId: existing.packageId,
    guestCount: existing.guestCount,
    eventDate: existing.eventDate,
    lines: input.lines,
    note: input.note ?? null,
    terms: input.terms ?? null,
    validUntil: input.validUntil ?? null,
    status: "SENT",
    manualDiscountAmount: input.manualDiscountAmount ?? null,
  });

  await prisma.quote.update({
    where: { id: existing.id },
    data: { status: "WITHDRAWN", respondedAt: new Date() },
  });

  return quote;
}

const QUOTE_TRANSITIONS: Record<QuoteStatusT, QuoteStatusT[]> = {
  DRAFT: ["SENT", "WITHDRAWN"],
  SENT: ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  WITHDRAWN: ["SENT"],
};

function canTransition(from: string, to: string): boolean {
  return (QUOTE_TRANSITIONS[from as QuoteStatusT] ?? []).includes(to as QuoteStatusT);
}

export async function respondToQuote(input: {
  quoteId: string;
  to: Extract<QuoteStatusT, "ACCEPTED" | "REJECTED" | "WITHDRAWN">;
  actorId: string;
  actorRole: "CUSTOMER" | "VENDOR" | "ADMIN";
  reason?: string | null;
}) {
  const quote = await prisma.quote.findUnique({
    where: { id: input.quoteId },
    select: {
      id: true,
      reference: true,
      status: true,
      validUntil: true,
      customerId: true,
      customer: { select: { name: true } },
      vendorProfile: { select: { userId: true, businessName: true } },
    },
  });

  if (!quote) throw new ApiError("NOT_FOUND", "Quote not found.");

  // Helper takes plain strings on purpose: inlining `.includes(input.to)` lets
  // TypeScript's inclusion narrowing reduce `input.to` to never inside the
  // guard, which then poisons every later use of it in this function.
  if (!canTransition(quote.status, input.to)) {
    throw new ApiError("CONFLICT", `Cannot ${input.to.toLowerCase()} a ${quote.status.toLowerCase()} quote.`);
  }
  if (quote.status === "SENT" && quote.validUntil && quote.validUntil < new Date()) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "EXPIRED" },
    });
    throw new ApiError("CONFLICT", "This quote has expired. Ask the vendor for a revision.");
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: input.to,
      respondedAt: new Date(),
      declineReason: input.reason ?? null,
    },
  });

  await notify({
    userId: input.actorRole === "CUSTOMER" ? quote.vendorProfile.userId : quote.customerId,
    type:
      input.to === "ACCEPTED"
        ? "QUOTE_ACCEPTED"
        : input.to === "REJECTED"
          ? "QUOTE_DECLINED"
          : "QUOTE_NEW",
    title: `Quote ${quote.reference} ${input.to.toLowerCase()}`,
    body:
      input.reason ||
      (input.to === "ACCEPTED"
        ? "Your quote was accepted — review the booking details."
        : "The quote was updated."),
    href:
      input.actorRole === "CUSTOMER" ? `/vendor/quotes?focus=${quote.id}` : `/dashboard/quotes/${quote.id}`,
  });

  return updated;
}

/** Sweep expired SENT quotes. Idempotent; intended for a daily cron. */
export async function expireStaleQuotes(now = new Date()) {
  const result = await prisma.quote.updateMany({
    where: { status: "SENT", validUntil: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return { expired: result.count };
}

function defaultExpiry() {
  return new Date(Date.now() + 14 * 86_400_000);
}