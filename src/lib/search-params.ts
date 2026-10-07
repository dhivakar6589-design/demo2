import { CATEGORY_CATALOGUE, INDIAN_STATES } from "@/lib/constants";
import { toMajor, toMinor } from "@/lib/utils";
import type { VendorSearchFilters } from "@/lib/domain/search";

/**
 * Search state lives in the URL, never in component state.
 *
 * That single rule buys shareable results, working browser back/forward, a
 * cacheable server render, and a filter panel that can stay a plain form.
 * Parsing is deliberately forgiving — a hand-edited or truncated query string
 * degrades to "no filter", never to a 500.
 */

/** Search state is fully described by the service's filter shape. */
export type BrowseFilters = VendorSearchFilters;

export type RawParams = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "rating", label: "Highest rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest listings" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function many(value: string | string[] | undefined): string[] | undefined {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const items = raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function num(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function flag(value: string | string[] | undefined): boolean | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  return raw === "1" || raw === "true";
}

const KNOWN_SORTS: readonly string[] = SORT_OPTIONS.map((option) => option.value);

function startOfDay(value: string): Date | undefined {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseFilters(params: RawParams): BrowseFilters {
  const sort = first(params.sort);

  return {
    q: first(params.q),
    category: first(params.category),
    city: first(params.city),
    state: first(params.state),
    cuisine: many(params.cuisine),
    dietary: many(params.dietary),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    minRating: num(params.minRating),
    guestCount: num(params.guests),
    availableOn: params.date ? startOfDay(first(params.date) as string) : undefined,
    featuredOnly: flag(params.featured),
    instantBookable: flag(params.instant),
    sort: sort && KNOWN_SORTS.includes(sort) ? (sort as SortOption) : undefined,
    page: Math.max(num(params.page) ?? 1, 1),
    perPage: 12,
  };
}

/**
 * Serialise filters back to a query string, dropping empty values.
 * `page` is omitted on the first page so the default URL stays clean.
 */
export function filtersToQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const page = Number(filters.page ?? 1);
  if (page > 1) params.set("page", String(page));

  return params;
}

/** Budget is edited in rupees but stored and compared in paise. */
export function rupeesToPaise(value: string | number | undefined) {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return toMinor(toMajor(parsed));
}

export function paiseToRupees(value: number | string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(toMajor(parsed)) : undefined;
}

export const FILTER_CATEGORIES = CATEGORY_CATALOGUE.map((category) => ({
  slug: category.slug,
  name: category.name,
}));

export { INDIAN_STATES };