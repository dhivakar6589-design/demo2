/**
 * POST /api/notifications/read-all — clear the unread badge in one call.
 */

import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const POST = handler(async (ctx) => {
  if (!ctx.user) return fail("UNAUTHORIZED", "Sign in to manage notifications.", 401);

  const updated = await prisma.notification.updateMany({
    where: { userId: ctx.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return ok({ updated: updated.count });
});
