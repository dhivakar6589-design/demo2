/**
 * Client-side fetch wrapper for the JSON API envelope.
 *
 * Every route in `app/api` answers `{ ok, data }` or `{ ok, error }`; this
 * flattens both into one result type so forms never branch on response shape
 * and never parse an HTML error page by accident.
 */

export interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: { code?: string; message?: string; fields?: Record<string, string[]> };
}

export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  /** First field error if the server sent one, otherwise the envelope message. */
  message: string | null;
  fields: Record<string, string[]>;
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });

    const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

    if (!response.ok || body?.ok === false) {
      const fields = body?.error?.fields ?? {};
      const first = Object.values(fields)[0]?.[0];
      return {
        ok: false,
        data: null,
        message: first ?? body?.error?.message ?? "Something went wrong. Please try again.",
        fields,
      };
    }

    return { ok: true, data: body?.data ?? null, message: null, fields: {} };
  } catch {
    return { ok: false, data: null, message: "Network problem. Please try again.", fields: {} };
  }
}
