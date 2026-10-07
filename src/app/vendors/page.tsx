import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, SearchX, Sparkles } from "lucide-react";
import {
  ActiveFilterChips,
  FilterPanel,
  Pagination,
  SortSelect,
} from "@/components/search/browse-controls";
import { VendorCard } from "@/components/vendor/vendor-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { prisma } from "@/lib/prisma";
import { searchVendors } from "@/lib/domain/search";
import { parseFilters, FILTER_CATEGORIES } from "@/lib/search-params";
import { CATEGORY_CATALOGUE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Result pages reflect availability and pricing, so they are never cached. */
export const revalidate = 0;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return searchParams.then((raw) => {
    const filters = parseFilters(raw);
    const category = filters.category
      ? FILTER_CATEGORIES.find((item) => item.slug === filters.category)?.name
      : undefined;
    const bits = [category, filters.city, filters.q].filter(Boolean) as string[];

    return {
      title: bits.length ? `${bits.join(" · ")} — Vendors` : "Browse event vendors",
      description:
        "Search curated planners, caterers, venues and artists across India. Compare total pricing, inclusions and verified reviews.",
      alternates: { canonical: "/vendors" },
    };
  });
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseFilters(raw);

  const [response, dietary, tags] = await Promise.all([
    searchVendors(filters),
    prisma.dietaryTag.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, label: true },
    }),
    prisma.tag.findMany({
      where: { isActive: true, kind: { in: ["CUISINE", "FEATURE"] } },
      orderBy: { sortOrder: "asc" },
      take: 18,
      select: { slug: true, label: true },
    }),
  ]);

  const heading = filters.category
    ? (FILTER_CATEGORIES.find((item) => item.slug === filters.category)?.name ?? "Vendors")
    : filters.q
      ? `Results for “${filters.q}”`
      : "Every vendor on Aurelia";

  return (
    <div className="container-page pb-section pt-10 md:pt-14">
      <header className="max-w-2xl">
        <p className="eyebrow">
          <span className="eyebrow-rule" />
          {response.total} {response.total === 1 ? "match" : "matches"}
        </p>
        <h1 className="text-display mt-4 text-[clamp(2rem,5vw,3.25rem)]">{heading}</h1>
        <p className="measure mt-4 text-base leading-relaxed text-body">
          {filters.city || filters.state ? (
            <>
              Serving {filters.city ?? filters.state}
              {filters.guestCount ? ` for around ${filters.guestCount} guests` : null} — every
              listing shows total price including GST.
            </>
          ) : (
            "Curated planners, caterers, venues and artists. Every listing is verified, and every price includes GST."
          )}
        </p>
      </header>

      {!response.total ? (
        <EmptyState
          className="mt-14"
          icon={SearchX}
          title="Nothing matches those filters yet"
          description="Try widening the budget, clearing the city, or browsing a category — new vendors are reviewed every week."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/vendors">Clear filters</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/vendors?category=caterers">Browse caterers</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-10">
          <FilterPanel
            total={response.total}
            options={{ dietary, cuisine: tags }}
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <p className="text-sm text-subtle">
                <span className="tnum font-medium text-heading">{response.total}</span>{" "}
                {response.total === 1 ? "vendor" : "vendors"}
                {filters.guestCount ? (
                  <>
                    {" · "}
                    available for <span className="tnum">{filters.guestCount}</span>
                  </>
                ) : null}
              </p>
              <SortSelect current={filters.sort} />
            </div>

            <div className="mt-4">
              <ActiveFilterChips options={{ dietary, cuisine: tags }} />
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {response.results.map((vendor, index) => (
                <VendorCard
                  key={vendor.id}
                  vendor={{
                    id: vendor.id,
                    slug: vendor.slug,
                    businessName: vendor.businessName,
                    tagline: vendor.tagline,
                    baseCity: vendor.baseCity,
                    coverImageUrl: vendor.coverImageUrl,
                    logoUrl: vendor.logoUrl,
                    ratingAvg: vendor.ratingAvg,
                    ratingCount: vendor.ratingCount,
                    completedOrders: vendor.completedOrders,
                    fromPrice: vendor.fromPrice,
                    pricingModel: vendor.pricingModel,
                    instantBookable: vendor.instantBookable,
                    isFeatured: vendor.isFeatured,
                    minGuests: vendor.minGuests,
                    primaryCategoryName: vendor.primaryCategory?.name ?? null,
                    topTags: vendor.tags.slice(0, 3).map((tag) => tag.label),
                  }}
                  priority={index < 3}
                />
              ))}
            </div>

            <Pagination page={response.page} totalPages={response.totalPages} />

            {response.facets.cities.length ? (
              <aside className="mt-16 rounded-2xl border border-line bg-surface p-6">
                <h2 className="flex items-center gap-2 font-display text-base font-medium text-heading">
                  <MapPin className="size-4 text-accent-muted" />
                  Where people are booking
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {response.facets.cities.map((facet) => (
                    <li key={facet.city}>
                      <Link
                        href={`/vendors?city=${encodeURIComponent(facet.city)}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-body transition-colors hover:border-accent/40 hover:text-accent-muted"
                      >
                        {facet.city}
                        <span className="tnum text-2xs text-subtle">{facet.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}

            {response.provider === "portable" ? (
              <p className="mt-6 flex items-center gap-2 text-2xs text-subtle">
                <Sparkles className="size-3.5" />
                Relevance ranked by Aurelia&rsquo;s portable scorer. Production uses Postgres
                full-text search.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {!response.total && response.facets.categories.length ? (
        <section className="mt-16">
          <h2 className="text-display text-xl">Try a category</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_CATALOGUE.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/vendors?category=${category.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-body transition-colors hover:border-accent/40 hover:text-accent-muted"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}