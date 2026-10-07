/**
 * POST /api/auth/register — create an account and sign in immediately.
 *
 * Two paths reach the same result:
 *   • a brand new email  → insert a fresh User
 *   • an email that only exists as an anonymous enquiry contact (created by
 *     POST /api/quotes with no passwordHash) → claim it, so a customer who
 *     enquired before signing up keeps their quotes attached to one account.
 *
 * A registered address always wins: if the row already has a password the
 * caller is told to sign in rather than silently given a second account.
 */

import { prisma } from "@/lib/prisma";
import { handler, ok, fail, enforceRateLimit, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import type { Role } from "@/lib/constants";
import {
  hashPassword,
  startSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { safeNextPath } from "@/lib/utils";

export const POST = handler(async (ctx) => {
  const limited = enforceRateLimit(ctx.request, "auth-register", 5, 10 * 60_000);
  if (limited) return limited;

  const body = await readJson(ctx.request, registerSchema);

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, role: true, status: true, passwordHash: true },
  });

  if (existing?.passwordHash) {
    return fail("CONFLICT", "An account already uses that email — sign in instead.", 409, {
      email: ["This email is already registered"],
    });
  }

  // Only a passwordless CUSTOMER row may be claimed; anything else belongs to
  // somebody else's account and must not be taken over from a signup form.
  if (existing && existing.role !== "CUSTOMER") {
    return fail(
      "CONFLICT",
      "That email is linked to a vendor account. Sign in to continue.",
      409,
      { email: ["Use the vendor sign-in for this address"] },
    );
  }

  const passwordHash = await hashPassword(body.password);
  const profile = {
    name: body.name,
    phone: body.phone || null,
    passwordHash,
    role: body.role,
    marketing: body.marketing,
    city: body.city || null,
    state: body.state || null,
    dataConsentAt: new Date(),
  };

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: profile,
        select: { id: true, name: true, email: true, role: true },
      })
    : await prisma.user.create({
        data: {
          email: body.email,
          status: "ACTIVE",
          ...profile,
        },
        select: { id: true, name: true, email: true, role: true },
      });

  const session = await startSession({
    userId: user.id,
    role: user.role as Role,
    userAgent: ctx.request.headers.get("user-agent"),
    ipAddress: clientIp(ctx.request),
  });

  const response = ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    redirectTo: safeNextPath(ctx.url.searchParams.get("next")),
  });
  response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions());
  return response;
});

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? null;
}

