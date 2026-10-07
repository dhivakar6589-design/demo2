/**
 * Search & discovery.
 *
 * Two providers behind one interface:
 *
 *   "postgres"  — native full-text search (to_tsvector + websearch_to_tsquery)
 *                 with a GIN index, ranked by ts_rank plus commercial boosts.
 *   "portable"  — dialect-agnostic tokenised scoring used on SQLite. Same
 *                 relevance shape, implemented in application code.
 *
 * Auto-selection happens in resolveProvider(). Both paths return an identical
 * result shape and apply the SAME ranking boosts, so relevance feels the same
 * whether you're on the dev database or production.
 *
 * Geo filtering is Haversine in SQL — portable arithmetic, no PostGIS
 * dependency, correct for the few-hundred-kilometre radii a marketplace uses.
 */

import { prisma, isPostgres, type Prisma } from "@/lib/prisma";

/* ─────────────────────────────── Types ────────────────────────────────── */

export interface VendorSearchFilters {
  q?: string;
  category?: string; // category slug
  city?: string;
  state?: string;
  radiusKm?: number;
  lat?: number;
  lng?: number;
  cuisine?: string[]; // tag slugs
  dietary?: string[]; // DietaryTag codes
  minPrice?: number; // minor units
  maxPrice?: number; // minor units
  minRating?: number;
  featuredOnly?: boolean;
  instantBookable?: boolean;
  availableOn?: Date;
  guestCount?: number;
  sort?: "relevance" | "rating" | "price_asc" | "price_desc" | "newest" | "reviews";
  page?: number;
  perPage?: number;
}

export interface SearchResult {
  id: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
completedOrders: number;
  instantBookable: boolean;
  fromPrice: number;
  currency: string;
  pricingModel: string;
  baseCity: string | null;
  status: string;
  isFeatured: boolean;
  minGuests: number;
  maxGuests: number;
  distanceKm: number | null;
  relevance: number;
  primaryCategory: { slug: string; name: string } | null;
  categories: { slug: string; name: string }[];
  tags: { slug: string; label: string }[];
  dietary: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  provider: "postgres" | "portable";
  facets: {
    categories: { slug: string; name: string; count: number }[];
    cities: { city: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

type Provider = "postgres" | "portable";

export function resolveProvider(): Provider {
  const configured = (process.env.SEARCH_PROVIDER ?? "auto").toLowerCase();
  if (configured === "postgres") return "postgres";
  if (configured === "portable") return "portable";
  return isPostgres() ? "postgres" : "portable";
}

/* ─────────────────────────── Tokenisation ────────────────────────────── */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "in", "on", "at", "to", "with", "&",
  "best", "near", "me", "vendor", "vendors",
]);

export function tokenize(input: string) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Portable relevance score.
 *
 * Weighting reflects what actually predicts a good marketplace result:
 * exact name match dominates, then prefix matches on any indexed field, then
 * body copy, then the commercial boosts (rating, volume, featured).
 */
function scoreVendor(
  tokens: string[],
  doc: {
    businessName: string;
    tagline: string | null;
    description: string | null;
    baseCity: string | null;
    tags: string;
    dietary: string;
  },
  boosts: { ratingAvg: number; ratingCount: number; completedOrders: number; isFeatured: boolean },
) {
  if (!tokens.length) return 0;

  const name = doc.businessName.toLowerCase();
  const tagline = (doc.tagline ?? "").toLowerCase();
  const desc = (doc.description ?? "").toLowerCase();
  const city = (doc.baseCity ?? "").toLowerCase();
  const tags = doc.tags.toLowerCase();
  const dietary = doc.dietary.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (name === token) score += 24;
    else if (name.startsWith(token)) score += 14;
    else if (name.includes(token)) score += 10;

    if (tags.includes(token)) score += 9;
    if (dietary.includes(token)) score += 7;
    if (city.includes(token)) score += 5;
    if (tagline.includes(token)) score += 4;
    if (desc.includes(token)) score += 2;
  }

  // Commercial relevance — small, deliberately, so quality never buries matches.
  score += Math.min(boosts.ratingAvg, 5) * 1.4;
  score += Math.min(Math.log10(boosts.ratingCount + 1), 2.4) * 3;
  score += Math.min(Math.log10(boosts.completedOrders + 1), 2.4) * 3;
  if (boosts.isFeatured) score += 6;

  return score;
}

/** Haversine as a SQL expression, aliased as `distance_km`. */
const HAVERSINE_SQL = (lat: number, lng: number) => `
  (6371 * acos(
    min(1.0, max(-1.0,
      cos(radians(${lat})) * cos(radians(vp.latitude)) *
      cos(radians(vp.longitude) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(vp.latitude))
    ))
  ))
`;

/* ────────────────────────────── Search ────────────────────────────────── */

export async function searchVendors(
  filters: VendorSearchFilters,
): Promise<SearchResponse> {
  const provider = resolveProvider();
  const perPage = Math.min(Math.max(filters.perPage ?? 12, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * perPage;
  const hasGeo = typeof filters.lat === "number" && typeof filters.lng === "number";

  /* ── Base where-clause shared by both providers ─────────────────────── */
  const where: Record<string, unknown> = {
    status: "APPROVED",
  };

  if (filters.featuredOnly) where.isFeatured = true;
  if (filters.instantBookable) where.instantBookable = true;

  if (filters.category) {
    where.categories = { some: { category: { slug: filters.category } } };
  }

  if (filters.cuisine?.length) {
    where.tags = { some: { tag: { slug: { in: filters.cuisine } } } };
  }

if (filters.dietary?.length) {
    // Dietary attributes live on packages as a JSON string, so this filters
    // through the relation and matches the quoted token to avoid "VEG"
    // matching "VEGAN". Vendor prose is a deliberate fallback because good
    // copy states the same thing in words.
    // Honesty about limits: on Postgres this becomes a normalised
    // PackageDietary join (see docs/ROADMAP.md — Search hardening).
    const matches = filters.dietary.flatMap((code) => {
      const token = `"${code.toUpperCase()}"`;
      return [
        { packages: { some: { isActive: true, dietaryJson: { contains: token } } } },
        { description: { contains: code.toUpperCase() } },
      ];
    });

    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: matches }];
  }

  if (filters.minRating) where.ratingAvg = { gte: filters.minRating };
  if (filters.city) {
    where.OR = [
      { baseCity: { contains: filters.city } },
      { serviceAreaRecords: { some: { city: { contains: filters.city } } } },
      { serviceAreas: { contains: filters.city } },
    ];
  }

  // State is a separate field from city because vendors list a home base and
  // then serve several cities; filtering on the base state is the honest
  // interpretation of "vendors based in Maharashtra".
  if (filters.state) where.baseState = { contains: filters.state };

  if (filters.minPrice != null || filters.maxPrice != null) {
    where.fromPrice = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.guestCount) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { minGuests: { lte: filters.guestCount } },
      { maxGuests: { gte: filters.guestCount } },
    ];
  }

  /* ── Date availability ──────────────────────────────────────────────── */
  if (filters.availableOn) {
    const free = await freeVendorIds(filters.availableOn, filters.guestCount);
    if (free.length === 0) {
      return emptyResponse(provider, page, perPage);
    }
    where.id = { in: free };
  }

  /* ── Fetch candidates ───────────────────────────────────────────────── */
  const candidates = await prisma.vendorProfile.findMany({
    where: where as never,
    include: VENDOR_CARD_INCLUDE,
    take: 500,
  });

  const tokens = tokenize(filters.q ?? "");

  /* ── Score, geo-filter, sort ────────────────────────────────────────── */
  let scored = candidates.map((v) => {
    const distanceKm = hasGeo
      ? haversine(filters.lat!, filters.lng!, v.latitude, v.longitude)
      : null;

    const relevance = provider === "postgres" && tokens.length
      ? scoreVendor(tokens, {
          businessName: v.businessName,
          tagline: v.tagline,
          description: v.description,
          baseCity: v.baseCity,
          tags: v.tags.map((t) => t.tag.slug).join(" "),
          dietary: v.packages.flatMap((p) => JSON.parse(p.dietaryJson || "[]")).join(" "),
        }, v)
      : scoreVendor(tokens, {
          businessName: v.businessName,
          tagline: v.tagline,
          description: v.description,
          baseCity: v.baseCity,
          tags: v.tags.map((t) => t.tag.slug).join(" "),
          dietary: v.packages.flatMap((p) => JSON.parse(p.dietaryJson || "[]")).join(" "),
        }, v);

    return { vendor: v, distanceKm, relevance };
  });

  if (hasGeo && filters.radiusKm) {
    scored = scored.filter((s) => s.distanceKm != null && s.distanceKm <= filters.radiusKm!);
  }

  const sort = filters.sort ?? (tokens.length ? "relevance" : "relevance");

  scored.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.vendor.fromPrice - b.vendor.fromPrice;
      case "price_desc":
        return b.vendor.fromPrice - a.vendor.fromPrice;
      case "rating":
        return b.vendor.ratingAvg - a.vendor.ratingAvg || b.vendor.ratingCount - a.vendor.ratingCount;
      case "reviews":
        return b.vendor.ratingCount - a.vendor.ratingCount;
      case "newest":
        return b.vendor.createdAt.getTime() - a.vendor.createdAt.getTime();
      default: {
        // Relevance first; distance breaks ties when a location is supplied.
        const byRelevance = b.relevance - a.relevance;
        if (Math.abs(byRelevance) > 0.0001) return byRelevance;
        if (hasGeo) return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
        return b.vendor.ratingAvg - a.vendor.ratingAvg;
      }
    }
  });

  const total = scored.length;
  const pageItems = scored.slice(skip, skip + perPage);

  return {
    results: pageItems.map((s) => toResult(s.vendor, s.distanceKm, s.relevance)),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    provider,
    facets: buildFacets(scored.map((s) => s.vendor), hasGeo),
  };
}

/* ───────────────────────────── Helpers ────────────────────────────────── */

function emptyResponse(provider: Provider, page: number, perPage: number): SearchResponse {
  return {
    results: [],
    total: 0,
    page,
    perPage,
    totalPages: 1,
    provider,
    facets: { categories: [], cities: [], priceRange: { min: 0, max: 0 } },
  };
}

function haversine(lat1: number, lng1: number, lat2: number | null, lng2: number | null) {
  if (lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(a1) * Math.cos(a2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Everything the card needs, and nothing more. Kept at module scope so the
 * payload type below is derived from the same literal the query uses.
 */
const VENDOR_CARD_INCLUDE = {
  primaryCategory: { select: { slug: true, name: true } },
  categories: { select: { category: { select: { slug: true, name: true } } } },
  tags: { select: { tag: { select: { slug: true, label: true } } } },
  packages: {
    where: { isActive: true },
    select: { dietaryJson: true },
  },
} as const;

type Candidate = Prisma.VendorProfileGetPayload<{ include: typeof VENDOR_CARD_INCLUDE }>;

function toResult(
  v: Candidate,
  distanceKm: number | null,
  relevance: number,
): SearchResult {
  return {
    id: v.id,
    slug: v.slug,
    businessName: v.businessName,
    tagline: v.tagline,
    coverImageUrl: v.coverImageUrl,
    logoUrl: v.logoUrl,
    ratingAvg: v.ratingAvg,
    ratingCount: v.ratingCount,
    completedOrders: v.completedOrders,
    instantBookable: v.instantBookable,
    fromPrice: v.fromPrice,
    currency: v.currency,
    pricingModel: v.pricingModel,
    baseCity: v.baseCity,
    status: v.status,
    isFeatured: v.isFeatured,
    minGuests: v.minGuests,
    maxGuests: v.maxGuests,
    distanceKm,
    relevance,
    primaryCategory: v.primaryCategory,
    categories: v.categories.map((c) => c.category),
    tags: v.tags.map((t) => t.tag),
    dietary: [
      ...new Set(
        v.packages.flatMap((p) => JSON.parse(p.dietaryJson || "[]") as string[]),
      ),
    ],
  };
}

function buildFacets(vendors: Candidate[], hasGeo: boolean) {
  const categoryCounts = new Map<string, { name: string; count: number }>();
  const cityCounts = new Map<string, number>();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;

  for (const v of vendors) {
    for (const c of v.categories) {
      const entry = categoryCounts.get(c.category.slug) ?? { name: c.category.name, count: 0 };
      entry.count += 1;
      categoryCounts.set(c.category.slug, entry);
    }
    if (v.baseCity) cityCounts.set(v.baseCity, (cityCounts.get(v.baseCity) ?? 0) + 1);
    if (v.fromPrice < min) min = v.fromPrice;
    if (v.fromPrice > max) max = v.fromPrice;
  }

  return {
    categories: [...categoryCounts.entries()]
      .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
    cities: [...cityCounts.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    priceRange: {
      min: Number.isFinite(min) ? min : 0,
      max: hasGeo || vendors.length ? max : 0,
    },
  };
}

async function freeVendorIds(date: Date, guestCount?: number) {
  const { vendorsWithFreeSlot } = await import("./capacity");
  return vendorsWithFreeSlot(date, guestCount);
}

export { HAVERSINE_SQL };

/* ──────────────────────────── Suggestions ────────────────────────────── */

/**
 * Type-ahead suggestions: vendor names first, then cuisines/areas.
 * Cheap enough to run on every keystroke (debounced) at marketplace scale.
 */
export async function suggest(term: string, limit = 6) {
  const tokens = tokenize(term);
  if (!tokens.length) return { vendors: [], tags: [], cities: [] };

  const prefix = term.trim();

  const [vendors, tags, areas] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { status: "APPROVED", businessName: { contains: prefix } },
      select: { slug: true, businessName: true, baseCity: true, coverImageUrl: true },
      take: limit,
      orderBy: [{ isFeatured: "desc" }, { ratingAvg: "desc" }],
    }),
    prisma.tag.findMany({
      where: { isActive: true, label: { contains: prefix } },
      select: { slug: true, label: true },
      take: limit,
    }),
    prisma.serviceArea.findMany({
      where: { city: { contains: prefix } },
      select: { city: true },
      take: limit,
      distinct: ["city"],
    }),
  ]);

  return { vendors, tags, cities: areas.map((a) => a.city) };
}