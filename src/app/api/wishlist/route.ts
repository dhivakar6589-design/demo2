/**
 * POST /api/wishlist — save/unsave a vendor (idempotent toggle).
 *
 * The pair (userId, vendorProfileId) is unique in the schema, so "toggle"
 * reads as: delete the row if it exists, create it if it doesn't.
 */

import { handler, ok, fail, readJson } from "@/lib/api";
import { wishlistSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const POST = handler(async (ctx) => {
  if (!ctx.user) return fail("UNAUTHORIZED", "Sign in to save vendors.", 401);

  const { vendorProfileId } = await readJson(ctx.request, wishlistSchema);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: { id: true, businessName: true },
  });
  if (!vendor) return fail("NOT_FOUND", "Vendor not found.", 404);

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_vendorProfileId: { userId: ctx.user.id, vendorProfileId },
    },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return ok({ saved: false, vendorProfileId });
  }

  await prisma.wishlistItem.create({
    data: { userId: ctx.user.id, vendorProfileId },
  });

  return ok({ saved: true, vendorProfileId });
});
