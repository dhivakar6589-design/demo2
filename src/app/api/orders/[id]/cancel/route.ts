/**
 * POST /api/orders/[id]/cancel — customer-initiated cancellation.
 *
 * The status machine lives in lib/domain/orders; this route proves the caller
 * owns the order, blocks cancellations once money has been captured (those
 * need a refund handled by support) and forwards the rest to transitionOrder.
 */

import { z } from "zod";
import { handler, ok, fail, readJson } from "@/lib/api";
import { transitionOrder } from "@/lib/domain/orders";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const POST = handler(async (ctx) => {
  if (!ctx.user) return fail("UNAUTHORIZED", "Sign in to manage your bookings.", 401);

  const id = String(ctx.params.id ?? "");
  if (!id) return fail("BAD_REQUEST", "Missing order id.");

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, customerId: true, depositStatus: true },
  });
  if (!order) return fail("NOT_FOUND", "Booking not found.", 404);

  if (order.customerId !== ctx.user.id && ctx.user.role !== "ADMIN") {
    return fail("FORBIDDEN", "This booking belongs to another account.", 403);
  }

  if (order.depositStatus === "PAID") {
    return fail(
      "CONFLICT",
      "Your deposit has already been paid — cancellations at this stage need support to process the refund.",
      409,
    );
  }

  const body = await readJson(ctx.request, Body);

  const updated = await transitionOrder({
    orderId: order.id,
    to: "CANCELLED",
    actorId: ctx.user.id,
    actorRole: ctx.user.role,
    note: body.reason || "Cancelled by customer",
  });

  return ok({ id: updated?.id, status: updated?.status });
});
