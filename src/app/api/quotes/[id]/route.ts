/**
 * PATCH /api/quotes/[id] — the customer's response to a quote.
 *
 * Accept, decline or withdraw. The transition matrix and every side effect
 * (notifications, expiry handling) live in lib/domain/quotes; this route only
 * proves ownership and translates the result into the API envelope.
 */

import { z } from "zod";
import { handler, ok, fail, readJson } from "@/lib/api";
import { respondToQuote } from "@/lib/domain/quotes";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  action: z.enum(["ACCEPTED", "REJECTED", "WITHDRAWN"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const PATCH = handler(async (ctx) => {
  if (!ctx.user) return fail("UNAUTHORIZED", "Sign in to respond to a quote.", 401);

  const id = String(ctx.params.id ?? "");
  if (!id) return fail("BAD_REQUEST", "Missing quote id.");

  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { id: true, customerId: true },
  });
  if (!quote) return fail("NOT_FOUND", "Quote not found.", 404);

  // An admin may act on any quote (support fallback); everyone else only on
  // their own — never inferred from a client-supplied customer id.
  if (quote.customerId !== ctx.user.id && ctx.user.role !== "ADMIN") {
    return fail("FORBIDDEN", "This quote belongs to another account.", 403);
  }

  const body = await readJson(ctx.request, Body);

  const updated = await respondToQuote({
    quoteId: quote.id,
    to: body.action,
    actorId: ctx.user.id,
    actorRole: ctx.user.role,
    reason: body.reason || null,
  });

  return ok({ id: updated.id, status: updated.status, respondedAt: updated.respondedAt });
});
