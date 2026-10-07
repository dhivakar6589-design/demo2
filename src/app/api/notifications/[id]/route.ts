/**
 * PATCH /api/notifications/[id] — flip one notification's read state.
 *
 * Scoped to the caller's own rows: an id belonging to someone else behaves
 * exactly like an id that doesn't exist.
 */

import { z } from "zod";
import { handler, ok, fail, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  read: z.boolean().optional().default(true),
});

export const PATCH = handler(async (ctx) => {
  if (!ctx.user) return fail("UNAUTHORIZED", "Sign in to manage notifications.", 401);

  const id = String(ctx.params.id ?? "");
  if (!id) return fail("BAD_REQUEST", "Missing notification id.");

  const body = await readJson(ctx.request, Body);

  const updated = await prisma.notification.updateMany({
    where: { id, userId: ctx.user.id },
    data: { readAt: body.read ? new Date() : null },
  });

  if (updated.count === 0) return fail("NOT_FOUND", "Notification not found.", 404);

  return ok({ id, read: body.read });
});

/** DELETE dismisses (deletes) a notification for the caller. */
export const DELETE = handler(async (ctx) => {
  if (!ctx.user) return fail("UNAUTHORIZED", "Sign in to manage notifications.", 401);

  const id = String(ctx.params.id ?? "");
  if (!id) return fail("BAD_REQUEST", "Missing notification id.");

  const deleted = await prisma.notification.deleteMany({
    where: { id, userId: ctx.user.id },
  });

  if (deleted.count === 0) return fail("NOT_FOUND", "Notification not found.", 404);

  return ok({ id, dismissed: true });
});
