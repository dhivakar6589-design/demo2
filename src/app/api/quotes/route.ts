/**
 * POST /api/quotes — public quote request from a vendor profile.
 *
 * Signed out callers are allowed: a marketplace that loses the lead at the
 * sign-up wall has already lost the booking. The enquiry is still attributed
 * to a real User row (created on demand, no password) so nothing is orphaned.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, ok, fail, enforceRateLimit, readJson } from "@/lib/api";
import { requestQuote } from "@/lib/domain/quotes";
import { ApiError } from "@/lib/api";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";

const Body = z.object({
  vendorSlug: z.string().min(2).max(80),
  packageSlug: z.string().max(80).optional().or(z.literal("")),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  guestCount: z.coerce.number().int().min(1).max(20_000),
  eventType: z.string().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2_000).optional().or(z.literal("")),
  contact: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(6).max(24),
  }),
});

export const POST = handler(async (ctx) => {
  const limited = enforceRateLimit(ctx.request, "quote-request", 5, 10 * 60_000);
  if (limited) return limited;

  const body = await readJson(ctx.request, Body);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { slug: body.vendorSlug },
    select: { id: true, status: true },
  });
  if (!vendor || vendor.status !== "APPROVED") {
    return fail("NOT_FOUND", "That vendor is not accepting enquiries.", 404);
  }

  // An explicitly named package must resolve. Silently dropping a slug that
  // belongs to another vendor would record the enquiry against the wrong menu.
  let packId: string | null = null;
  if (body.packageSlug) {
    const pack = await prisma.package.findFirst({
      where: { slug: body.packageSlug, vendorProfileId: vendor.id, isActive: true },
      select: { id: true },
    });
    if (!pack) return fail("NOT_FOUND", "That package is no longer available.", 404);
    packId = pack.id;
  }

  const eventDate = parseEventDate(body.eventDate);
  if (!eventDate) {
    return fail("VALIDATION_FAILED", "That date does not exist.", 422, {
      eventDate: ["Not a real date"],
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (eventDate < today) {
    return fail("VALIDATION_FAILED", "Pick a date that has not passed.", 422, {
      eventDate: ["Must be today or later"],
    });
  }

  const eventType = normaliseEventType(body.eventType);
  const customerId = ctx.user
    ? ctx.user.id
    : await resolveContactUser(body.contact);

  const result = await requestQuote({
    customerId,
    vendorProfileId: vendor.id,
    packageId: packId,
    guestCount: body.guestCount,
    eventDate,
    eventType,
    message: body.message || null,
  });

  return ok(
    {
      quoteId: result.quote.id,
      reference: result.quote.reference,
      status: result.quote.status,
      instantBookable: result.vendorInstantBookable,
      signedIn: Boolean(ctx.user),
    },
    undefined,
    { status: 201 },
  );
});

/** Strict YYYY-MM-DD → UTC midnight. Rejects 2026-02-31 and friends. */
function parseEventDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function normaliseEventType(value: string | undefined): EventType | null {
  if (!value) return null;
  const key = value.toUpperCase();
  return key in EVENT_TYPE_LABELS ? (key as EventType) : "OTHER";
}

/**
 * Attach an anonymous enquiry to a User row.
 *
 * Reuses an existing customer so repeat enquiries land on one account. A new
 * row is created with no password hash — it cannot be logged into, and the
 * signup flow claims it by email. `marketing` stays false and `dataConsentAt`
 * stays null because an anonymous contact has not opted in to anything.
 */
async function resolveContactUser(contact: z.infer<typeof Body>["contact"]): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: contact.email },
    select: { id: true, role: true },
  });

  // Never let an enquiry be attached to a vendor or admin account by typing
  // their address into the form.
  if (existing && existing.role !== "CUSTOMER") {
    throw new ApiError(
      "CONFLICT",
      "That email belongs to a vendor account. Sign in to send this enquiry.",
    );
  }
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      email: contact.email,
      name: contact.name,
      phone: contact.phone,
      role: "CUSTOMER",
      status: "ACTIVE",
      marketing: false,
    },
    select: { id: true },
  });
  return created.id;
}