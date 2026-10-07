/**
 * POST /api/auth/login — password sign-in.
 *
 * Failure is deliberately uniform: an unknown email and a wrong password
 * return the same 401, and the comparison runs against a fixed dummy hash
 * when no user exists so response time does not disclose which addresses are
 * registered.
 */

import { prisma } from "@/lib/prisma";
import { handler, ok, fail, enforceRateLimit, readJson } from "@/lib/api";
import { loginSchema } from "@/lib/validations";
import type { Role } from "@/lib/constants";
import {
  verifyPassword,
  startSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { safeNextPath } from "@/lib/utils";

/** Valid bcrypt hash of a throwaway string — equalises the "no such user" path. */
const DUMMY_HASH = "$2b$12$ocSq7.tSHZWLWGemR/IhGeIo5My25xS5NzLAmohZU8LlNJzSe0TDC";

export const POST = handler(async (ctx) => {
  const body = await readJson(ctx.request, loginSchema);

  // Scoped by email as well as IP so one address cannot be sprayed from a
  // pool of clients, and one client cannot lock out everyone else.
  const limited = enforceRateLimit(ctx.request, `auth-login:${body.email}`, 8, 10 * 60_000);
  if (limited) return limited;

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  const passwordOk = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    return fail("UNAUTHORIZED", "Email or password is incorrect.", 401);
  }

  if (user.status !== "ACTIVE") {
    return fail(
      "FORBIDDEN",
      user.status === "DELETED"
        ? "This account has been closed."
        : "This account is suspended. Contact support@aurelia.events.",
      403,
    );
  }

  const session = await startSession({
    userId: user.id,
    role: user.role as Role,
    userAgent: ctx.request.headers.get("user-agent"),
    ipAddress: ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  const response = ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    redirectTo: safeNextPath(body.redirectTo),
  });
  response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions());
  return response;
});
