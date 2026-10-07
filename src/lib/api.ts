/**
 * Route Handler toolkit: uniform JSON envelopes, validation, and rate limiting.
 *
 * Every API response uses the same shape so clients never have to branch:
 *   success → { ok: true,  data, meta? }
 *   failure → { ok: false, error: { code, message, fields? } }
 *
 * `handler()` wraps a route so a thrown AuthError, ZodError or unexpected
 * exception becomes a well-typed response instead of an HTML 500 page.
 */

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError, getCurrentUser, type CurrentUser } from "@/lib/auth/session";

/* ───────────────────────────── Envelope ───────────────────────────────── */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, ...(meta ? { meta } : {}) },
    init,
  );
}

export function fail(
  code: string,
  message: string,
  status = 400,
  fields?: Record<string, string[]>,
) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}

/* ────────────────────────────── Handler ───────────────────────────────── */

export interface HandlerContext {
  request: Request;
  params: Record<string, string | string[] | undefined>;
  url: URL;
  /** Current session user, or null for anonymous callers. */
  user: CurrentUser | null;
}

export type Handler = (ctx: HandlerContext) => Promise<NextResponse> | Promise<Response>;

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYMENT_FAILED: 402,
  INTERNAL: 500,
};

export function handler(fn: Handler) {
  // Next passes the route context on every invocation, and its generated
  // `ParamCheck` rejects an optional second parameter — so it stays required
  // here even though `fn` only ever reads `request` and `user`.
  return async (
    request: Request,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
  ) => {
    const requestId = crypto.randomUUID();
    try {
      const params = context?.params ? await context.params : {};
      // Resolved per request so a route can branch on auth without its own
      // cookie plumbing. A missing/invalid session is simply null.
      const user = await getCurrentUser().catch(() => null);
      return await fn({
        request,
        params,
        url: new URL(request.url),
        user,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return fail(
          error.status === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
          error.message,
          error.status,
        );
      }
      if (error instanceof ZodError) {
        return fail("VALIDATION_FAILED", "Some fields need attention.", 422, flatten(error));
      }
      if (error instanceof ApiError) {
        return fail(error.code, error.message, STATUS_BY_CODE[error.code] ?? 400, error.fields);
      }

      console.error(`[api] unhandled ${request.method} ${request.url} (${requestId})`, error);
      const response = fail(
        "INTERNAL",
        "Something went wrong on our side. Please try again.",
        500,
        undefined,
      );
      // Correlate a user-reported failure with the server log line above.
      response.headers.set("X-Request-Id", requestId);
      return response;
    }
  };
}

export class ApiError extends Error {
  constructor(
    readonly code: keyof typeof STATUS_BY_CODE,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function flatten(error: ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/* ───────────────────────────── Parsing ────────────────────────────────── */

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function readQuery(request: Request) {
  const url = new URL(request.url);
  const q: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    q[key] = value;
  });
  return { url, query: q };
}

/** Comma-separated or repeated list params → string[]. */
export function listParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(",");
  return raw.map((v) => v.trim()).filter(Boolean);
}

export function intParam(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export function floatParam(value: string | undefined, fallback?: number) {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export function boolParam(value: string | undefined) {
  if (value == null) return undefined;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

/* ─────────────────────────── Rate limiting ───────────────────────────── */

/**
 * Fixed-window limiter held in module memory.
 *
 * Sufficient for a single-node deployment and for keeping the demo honest
 * about auth endpoints. A multi-node deployment must move the counter to
 * Redis/Upstash — the interface below is intentionally tiny so swapping it
 * touches one function (see docs/ROADMAP.md § Hardening).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit?: number, windowMs?: number): RateLimitResult {
  const max = limit ?? Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120);
  const window = windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + window };
    buckets.set(key, fresh);
    return { ok: true, limit: max, remaining: max - 1, resetAt: fresh.resetAt };
  }

  bucket.count += 1;
  const remaining = Math.max(0, max - bucket.count);

  // Opportunistic sweep so the map can't grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }

  return {
    ok: bucket.count <= max,
    limit: max,
    remaining,
    resetAt: bucket.resetAt,
  };
}

export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  return `${scope}:${ip}`;
}

/** Attach rate-limit headers to a response. */
export function withRateHeaders(response: NextResponse, result: RateLimitResult) {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return response;
}

export function enforceRateLimit(request: Request, scope: string, limit?: number, windowMs?: number) {
  const result = rateLimit(clientKey(request, scope), limit, windowMs);
  if (!result.ok) {
    return withRateHeaders(
      fail("RATE_LIMITED", "Too many requests. Please slow down.", 429),
      result,
    );
  }
  return null;
}

/* ───────────────────────────── Pagination ────────────────────────────── */

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function paginate(query: Record<string, string>, defaultPerPage = 20) {
  const page = Math.max(intParam(query.page, 1), 1);
  const perPage = Math.min(Math.max(intParam(query.perPage, defaultPerPage), 1), 100);
  return { page, perPage, skip: (page - 1) * perPage };
}

export function pageMeta(page: number, perPage: number, total: number): PageMeta {
  return { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}