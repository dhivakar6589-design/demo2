import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck, Star, Zap } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge } from "@/components/ui/badge";
import { formatRate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface VendorCardData {
  id: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  baseCity: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  completedOrders: number;
  fromPrice: number;
  pricingModel: string;
  instantBookable: boolean;
  isFeatured: boolean;
  minGuests: number;
  primaryCategoryName?: string | null;
  topTags?: string[];
}

/**
 * The workhorse card of the marketplace.
 *
 * One geometry, used on the home page, browse results and wishlists — so a
 * vendor looks identical wherever they appear. Only `ratio` changes.
 */
export function VendorCard({
  vendor,
  ratio = "card",
  className,
  priority,
}: {
  vendor: VendorCardData;
  ratio?: "card" | "media" | "tile";
  className?: string;
  priority?: boolean;
}) {
  const reviews = vendor.ratingCount > 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs",
        "transition-[transform,box-shadow,border-color] duration-300 ease-swift",
        "hover:-translate-y-1 hover:border-line-strong hover:shadow-lift",
        "focus-within:-translate-y-1 focus-within:shadow-lift",
        className,
      )}
    >
      <div className="relative">
        <SmartImage
          src={vendor.coverImageUrl}
          alt={`${vendor.businessName} — ${vendor.tagline ?? "event vendor"}`}
          ratio={ratio}
          priorityImage={priority}
          seed={vendor.slug}
          className="transition-transform duration-700 ease-swift group-hover:scale-[1.03]"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
          {vendor.isFeatured ? (
            <Badge tone="gold" className="shadow-sm backdrop-blur-sm">
              Curated pick
            </Badge>
          ) : (
            <span />
          )}
          {vendor.instantBookable ? (
            <Badge tone="inverse" className="shadow-sm backdrop-blur-sm">
              <Zap className="size-3" />
              Instant
            </Badge>
          ) : null}
        </div>

        {vendor.logoUrl ? (
          <div className="absolute -bottom-5 left-5 size-12 overflow-hidden rounded-xl border border-line bg-surface shadow-md">
            <SmartImage src={vendor.logoUrl} alt="" ratio="tile" wrapperClassName="size-full" />
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col p-5", vendor.logoUrl && "pt-9")}>
        <div className="flex items-center gap-2 text-2xs text-subtle">
          {vendor.primaryCategoryName ? (
            <span className="font-medium uppercase tracking-[0.14em] text-accent-muted">
              {vendor.primaryCategoryName}
            </span>
          ) : null}
          {vendor.baseCity ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {vendor.baseCity}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-2 font-display text-lg font-medium leading-snug text-heading">
          {/* Stretched link keeps the whole card clickable without nesting anchors. */}
          <Link
            href={`/vendors/${vendor.slug}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
          >
            {vendor.businessName}
          </Link>
        </h3>

        {vendor.tagline ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-body">{vendor.tagline}</p>
        ) : null}

        {vendor.topTags?.length ? (
          <ul className="mt-3.5 flex flex-wrap gap-1.5">
            {vendor.topTags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line px-2 py-0.5 text-2xs text-subtle"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="tnum font-display text-lg font-medium leading-none text-heading">
              {formatRate(vendor.fromPrice)}
              <span className="ml-1 text-xs font-sans font-normal text-subtle">
                {vendor.pricingModel === "PER_EVENT" ? "per event" : "per plate"}
              </span>
            </p>
            <p className="mt-1.5 text-2xs text-subtle">
              {vendor.minGuests}+ guests · {vendor.completedOrders} events delivered
            </p>
          </div>

          <div className="text-right">
            {reviews ? (
              <p className="tnum inline-flex items-center gap-1 text-sm font-medium text-heading">
                <Star className="size-3.5 fill-accent text-accent" />
                {vendor.ratingAvg.toFixed(1)}
                <span className="font-normal text-subtle">({vendor.ratingCount})</span>
              </p>
            ) : (
              <p className="inline-flex items-center gap-1 text-2xs text-subtle">
                <ShieldCheck className="size-3.5 text-accent-muted" />
                New listing
              </p>
            )}
          </div>
        </div>
      </div>

      {/* A quiet affordance for the hover state; the stretched link covers the rest. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-5 right-5 grid size-8 place-items-center rounded-full border border-line bg-surface text-subtle opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <ArrowUpRight className="size-4" />
      </span>
    </article>
  );
}