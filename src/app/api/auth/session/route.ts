/**
 * GET /api/auth/session — the signed-in user for the current cookie.
 *
 * Returns `{ user: null }` rather than 401 when signed out: callers use this
 * to render, not to gate, and a missing session is a normal state.
 */

import { handler, ok } from "@/lib/api";

export const GET = handler(async (ctx) => ok({ user: ctx.user }));
