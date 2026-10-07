import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  ChefHat,
  Globe,
  Instagram,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger, Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/overlays";

import { VendorEnquiryForm } from "@/components/vendor/vendor-enquiry-form";
import { prisma } from "@/lib/prisma";
import { formatRate, parseJsonArray } from "@/lib/utils";
import { DIETARY_LABELS, ORDER_STATUS_LABELS, type DietaryCode } from "@/lib/constants";
import { DEFAULT_REFUND_TIERS } from "@/lib/constants";
import type { Package, MenuCourse, MenuItem } from "@prisma/client";

type PkgWithRelations = Package & {
  courses: (MenuCourse & { items: MenuItem[] })[];
  addOns: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    pricingModel: string;
    unit: string;
  }[];
  category: { slug: string; name: string } | null;
};

export default async function VendorDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const vendor = await prisma.vendorProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { name: true } },
      primaryCategory: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      serviceAreaRecords: true,
      packages: {
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
        include: {
                        category: { select: { slug: true, name: true } },
                        addOns: true,
                        courses: {
                          orderBy: { sortOrder: "asc" },
                          include: { items: { orderBy: { sortOrder: "asc" } } },
                        },
                      },
      },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { customer: { select: { name: true, avatarUrl: true } } },
      },
    },
  });

  if (!vendor || vendor.status === "REJECTED") {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-display text-3xl">Vendor not found</h1>
        <p className="mt-4 text-body">This listing is no longer published on Aurelia.</p>
        <Button asChild className="mt-8">
          <Link href="/vendors">Browse all vendors</Link>
        </Button>
      </div>
    );
  }

  const packages = vendor.packages as PkgWithRelations[];
  const gallery = parseJsonArray<string>(vendor.galleryJson);
  const areas = vendor.serviceAreaRecords;
  const dietaryOffered = Array.from(
  new Set(packages.flatMap((p) => parseJsonArray<string>(p.dietaryJson))),
);
  const tier = DEFAULT_REFUND_TIERS[0];

  const ratingBuckets = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: vendor.reviews.filter((r) => r.rating === score).length,
  }));

  return (
    <article>
      {/* ── Masthead ────────────────────────────────────────────────── */}
      <header className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <SmartImage
            src={vendor.coverImageUrl}
            alt=""
            fill
            sizes="100vw"
            priorityImage
            wrapperClassName="size-full"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-ivory/92 dark:bg-gradient-navy/92" />
        </div>

        <div className="container-page pt-12 pb-10 md:pt-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-md md:size-24">
                <SmartImage
                  src={vendor.logoUrl}
                  alt=""
                  wrapperClassName="size-full"
                  fill
                  sizes="96px"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {vendor.primaryCategory ? (
                    <Badge tone="gold">{vendor.primaryCategory.name}</Badge>
                  ) : null}
                  {vendor.status === "APPROVED" ? (
                    <Badge tone="success">
                      <ShieldCheck className="size-3" />
                      Verified
                    </Badge>
                  ) : null}
                  {vendor.instantBookable ? (
                    <Badge tone="info">Instant booking</Badge>
                  ) : null}
                  {vendor.isFeatured ? <Badge tone="solid">Curated pick</Badge> : null}
                </div>

                <h1 className="text-display mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-tight">
                  {vendor.businessName}
                </h1>
                {vendor.tagline ? (
                  <p className="mt-2 max-w-xl text-lg text-body">{vendor.tagline}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-subtle">
                  {vendor.baseCity ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      {vendor.baseCity}
                      {vendor.baseState ? `, ${vendor.baseState}` : ""}
                    </span>
                  ) : null}
                  {vendor.ratingCount > 0 ? (
                    <span className="tnum inline-flex items-center gap-1.5">
                      <Star className="size-4 fill-accent text-accent" />
                      {vendor.ratingAvg.toFixed(1)}
                      <span className="text-subtle">({vendor.ratingCount} reviews)</span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4" />
                    {vendor.minGuests}–{vendor.maxGuests} guests
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-4" />
                    Replies in ~{vendor.responseTimeHrs}h
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {vendor.phone ? (
                <Button asChild variant="outline">
                  <a href={`tel:${vendor.phone}`}>
                    <Phone className="size-4" />
                    Call
                  </a>
                </Button>
              ) : null}
              {vendor.website ? (
                <Button asChild variant="ghost">
                  <a href={vendor.website} target="_blank" rel="noreferrer noopener">
                    <Globe className="size-4" />
                    Website
                  </a>
                </Button>
              ) : null}
              {vendor.instagram ? (
                <Button asChild variant="ghost">
                  <a href={`https://instagram.com/${vendor.instagram.replace("@", "")}`} target="_blank" rel="noreferrer noopener">
                    <Instagram className="size-4" />
                    <span className="sr-only">Instagram</span>
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
            <StatCell label="From" value={formatRate(vendor.fromPrice)} />
            <StatCell label="Events delivered" value={vendor.completedOrders.toLocaleString("en-IN")} />
            <StatCell label="On-time arrival" value={`${Math.round(vendor.onTimeRate * 100)}%`} />
            <StatCell label="Since" value={vendor.foundedYear?.toString() ?? "—"} />
          </dl>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="container-page grid gap-10 pb-section lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="min-w-0">
          <Tabs defaultValue="packages">
            <TabsList>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="menu">Menus</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews{vendor.ratingCount ? ` (${vendor.ratingCount})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="packages" className="mt-8 space-y-5">
              {packages.length === 0 ? (
                <p className="text-body">No published packages yet.</p>
              ) : null}

              {packages.map((pkg) => {
                const highlights = parseJsonArray<string>(pkg.highlightsJson);
                const includes = parseJsonArray<string>(pkg.includesJson);
                const allergens = parseJsonArray<string>(pkg.allergensJson);
                const images = parseJsonArray<string>(pkg.imagesJson);
                const dietary = parseJsonArray<string>(pkg.dietaryJson);

                return (
                  <article
                    key={pkg.id}
                    className="overflow-hidden rounded-2xl border border-line bg-surface"
                  >
                    {images[0] ? (
                      <SmartImage src={images[0]} alt="" ratio="media" />
                    ) : null}

                    <div className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="font-display text-xl font-medium text-heading">
                            {pkg.title}
                          </h2>
                          {pkg.summary ? (
                            <p className="mt-1.5 text-sm text-body">{pkg.summary}</p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="tnum font-display text-lg text-heading">
                            {pkg.pricePerPlate ? formatRate(pkg.pricePerPlate) : "On request"}
                          </p>
                          <p className="text-2xs text-subtle">
                            {pkg.pricePerPlate
                              ? `per guest · ${pkg.minGuests}–${pkg.maxGuests ?? "∞"} guests`
                              : "priced per event"}
                          </p>
                        </div>
                      </div>

                      {dietary.length ? (
                        <ul className="mt-4 flex flex-wrap gap-1.5">
                          {dietary.map((code) => (
                            <li
                              key={code}
                              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-2xs text-success"
                            >
                              <Check className="size-3" />
                              {DIETARY_LABELS[code as DietaryCode] ?? code}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {highlights.length ? (
                          <Section title="Signature">
                            <ul className="space-y-1.5">
                              {highlights.map((item) => (
                                <li key={item} className="flex gap-2 text-sm text-body">
                                  <ChefHat className="mt-0.5 size-3.5 shrink-0 text-accent-muted" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </Section>
                        ) : null}
                        {includes.length ? (
                          <Section title="Includes">
                            <ul className="space-y-1.5">
                              {includes.map((item) => (
                                <li key={item} className="flex gap-2 text-sm text-body">
                                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </Section>
                        ) : null}
                      </div>

                      {allergens.length ? (
                        <p className="mt-4 text-2xs text-subtle">
                          <span className="font-medium uppercase tracking-[0.14em]">Allergens</span>{" "}
                          — {allergens.join(", ")}
                        </p>
                      ) : null}

                      <div className="mt-6 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link
                            href={`/book?package=${pkg.slug}&vendor=${vendor.slug}`}
                          >
                            {vendor.instantBookable ? "Book instantly" : "Request this package"}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/vendors/${vendor.slug}#enquire`}>Ask a question</Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </TabsContent>

            <TabsContent value="menu" className="mt-8 space-y-6">
              {packages
                .filter((p) => p.courses.length > 0)
                .map((pkg) => (
                  <div key={pkg.id} className="rounded-2xl border border-line bg-surface p-6">
                    <h2 className="font-display text-xl font-medium text-heading">{pkg.title}</h2>
                    {pkg.description ? (
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
                        {pkg.description}
                      </p>
                    ) : null}

                    <Accordion type="multiple" defaultValue={["0"]} className="mt-5">
                      {pkg.courses.map((course, i) => (
                        <AccordionItem key={course.id} value={String(i)}>
                          <AccordionTrigger>{course.name}</AccordionTrigger>
                          <AccordionContent>
                            {course.note ? (
                              <p className="mb-3 text-sm text-subtle">{course.note}</p>
                            ) : null}
                            <ul className="space-y-2">
                              {course.items.map((item) => (
                                <li key={item.id} className="flex justify-between gap-4 text-sm">
                                  <span>
                                    <span className="text-heading">{item.name}</span>
                                    {item.description ? (
                                      <span className="block text-2xs text-subtle">
                                        {item.description}
                                      </span>
                                    ) : null}
                                  </span>
                                  {item.isVeg ? (
                                    <span
                                      aria-label="Vegetarian"
                                      title="Vegetarian"
                                      className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-success/50"
                                    >
                                      <span className="size-1.5 rounded-full bg-success" />
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              {packages.every((p) => p.courses.length === 0) ? (
                <p className="text-body">Menus are shared privately after you enquire.</p>
              ) : null}
            </TabsContent>

            <TabsContent value="about" className="mt-8 space-y-8">
              {vendor.about ? (
                <div>
                  <h2 className="font-display text-xl font-medium text-heading">The kitchen</h2>
                  <p className="measure mt-3 leading-relaxed text-body">{vendor.about}</p>
                </div>
              ) : null}

              {dietaryOffered.length ? (
                <div>
                  <h2 className="font-display text-xl font-medium text-heading">
                    Dietary kitchens
                  </h2>
                  <p className="mt-1.5 text-sm text-body">
                    Menus are planned around these, across all published packages.
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {dietaryOffered.map((code) => (
                      <li
                        key={code}
                        className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs text-success"
                      >
                        <Check className="size-3" />
                        {DIETARY_LABELS[code as DietaryCode] ?? code}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {vendor.categories.length ? (
                <div>
                  <h2 className="font-display text-xl font-medium text-heading">Categories</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {vendor.categories.map(({ category }) => (
                      <li key={category.id}>
                        <Link href={`/vendors?category=${category.slug}`}>
                          <Badge tone="outline">{category.name}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {vendor.tags.length ? (
                <div>
                  <h2 className="font-display text-xl font-medium text-heading">Specialities</h2>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {vendor.tags.map(({ tag }) => (
                      <li
                        key={tag.id}
                        className="rounded-full border border-line px-2.5 py-1 text-xs text-body"
                      >
                        {tag.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {areas.length ? (
                <div>
                  <h2 className="font-display text-xl font-medium text-heading">Where we travel</h2>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {areas.map((area) => (
                      <li
                        key={area.id}
                        className="tnum rounded-full border border-line px-2.5 py-1 text-xs text-body"
                      >
                        {area.city}
                        {area.serviceRadiusKm ? (
                          <span className="text-subtle"> · {area.serviceRadiusKm}km</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {gallery.length ? (
                <div>
                  <h2 className="font-display text-xl font-medium text-heading">Gallery</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.map((src, i) => (
                      <SmartImage
                        key={`${src}-${i}`}
                        src={src}
                        alt={`${vendor.businessName} — reference ${i + 1}`}
                        ratio="tile"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="reviews" className="mt-8">
              <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
                <div>
                  <p className="tnum font-display text-5xl text-heading">
                    {vendor.ratingAvg.toFixed(1)}
                  </p>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        aria-hidden
                        className={
                          i < Math.round(vendor.ratingAvg)
                            ? "size-4 fill-accent text-accent"
                            : "size-4 text-line-strong"
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-2xs text-subtle">
                    {vendor.ratingCount} verified {vendor.ratingCount === 1 ? "review" : "reviews"}
                  </p>

                  <ul className="mt-5 space-y-1.5">
                    {ratingBuckets.map((bucket) => {
                      const pct = vendor.ratingCount
                        ? Math.round((bucket.count / vendor.ratingCount) * 100)
                        : 0;
                      return (
                        <li key={bucket.score} className="flex items-center gap-2 text-2xs">
                          <span className="tnum w-6 text-subtle">{bucket.score}★</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="tnum w-6 text-right text-subtle">{bucket.count}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="space-y-5">
                  {vendor.reviews.length === 0 ? (
                    <p className="text-body">
                      No reviews yet — this vendor joined recently.
                    </p>
                  ) : null}
                  {vendor.reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-line bg-surface p-5"
                    >
                      <header className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-xs font-medium text-accent-muted">
                          {review.customer.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-heading">
                            {review.customer.name}
                          </p>
                          <p className="tnum flex items-center gap-1 text-2xs text-subtle">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="size-3 fill-accent text-accent" />
                            ))}
                            {review.eventType ? ` · ${ORDER_STATUS_LABELS ? review.eventType : review.eventType}` : null}
                          </p>
                        </div>
                        {review.isVerified ? (
                          <Badge tone="success" size="xs" className="ml-auto">
                            <ShieldCheck className="size-3" />
                            Verified booking
                          </Badge>
                        ) : null}
                      </header>

                      {review.title ? (
                        <h3 className="mt-4 font-display text-base text-heading">{review.title}</h3>
                      ) : null}
                      <p className="mt-2 text-sm leading-relaxed text-body">{review.body}</p>

                      {parseJsonArray<string>(review.tagsJson).length ? (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {parseJsonArray<string>(review.tagsJson).map((tag) => (
                            <li
                              key={tag}
                              className="rounded-full border border-line px-2 py-0.5 text-2xs text-subtle"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {review.vendorReply ? (
                        <div className="mt-4 rounded-xl bg-surface-sunken p-4">
                          <p className="text-2xs font-medium uppercase tracking-[0.14em] text-subtle">
                            Response from {vendor.businessName}
                          </p>
                          <p className="mt-1.5 text-sm text-body">{review.vendorReply}</p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Enquiry rail ───────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div id="enquire" className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-medium text-heading">
              <MessageSquare className="size-4 text-accent-muted" />
              Check availability
            </h2>
            <p className="mt-1.5 text-sm text-body">
                Tell us about your date and guest count.
                {vendor.instantBookable
                  ? " Instant-book listings confirm within minutes."
                  : " Quotes usually arrive within a day."}
              </p>

            <VendorEnquiryForm
              vendorSlug={vendor.slug}
              packageOptions={packages.map((p) => ({ slug: p.slug, title: p.title }))}
            />

            <div className="mt-5 rounded-xl bg-surface-sunken p-4">
              <p className="text-2xs font-medium uppercase tracking-[0.14em] text-subtle">
                Cancellation
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-body">
                {tier.percentRefund}% refunded {tier.minDaysBefore}+ days out, then a sliding
                scale to the event week. The full schedule is shown before payment.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-2xs uppercase tracking-[0.14em] text-subtle">{label}</dt>
      <dd className="tnum mt-1 font-display text-xl text-heading">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-overline">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}