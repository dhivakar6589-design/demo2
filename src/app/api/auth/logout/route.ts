/**
 * POST /api/auth/logout — revoke the current session and clear the cookie.
 *
 * Idempotent: signing out twice, or with an already-invalid cookie, still
 * returns 200 so the header's "always redirect home" behaviour never surfaces
 * an error to the user.
 */

import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api";
import {
  destroySession,
  readToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";

export const POST = handler(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    const payload = await readToken(token);
    if (payload) await destroySession(payload.sid).catch(() => undefined);
  }

  const response = ok({ signedOut: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
});
