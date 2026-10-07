import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ChefHat,
  HeartHandshake,
  Landmark,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { HeroSearch } from "@/components/marketing/hero-search";
import { VendorCard, type VendorCardData } from "@/components/vendor/vendor-card";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { prisma } from "@/lib/prisma";
import { CATEGORY_CATALOGUE } from "@/lib/constants";

export const revalidate = 300;

const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Sparkles,
  Landmark,
  PartyPopper,
  Building2,
  Store,
};

/* ──────────────────────────────── Page ─────────────────────────────────── */

export default async function HomePage() {
  const [featured, stats] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { status: "APPROVED", isFeatured: true },
      orderBy: [{ ratingAvg: "desc" }, { completedOrders: "desc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        businessName: true,
        tagline: true,
        baseCity: true,
        coverImageUrl: true,
        logoUrl: true,
        ratingAvg: true,
        ratingCount: true,
        completedOrders: true,
        fromPrice: true,
        pricingModel: true,
        instantBookable: true,
        isFeatured: true,
        minGuests: true,
        primaryCategory: { select: { name: true } },
        tags: { take: 3, select: { tag: { select: { label: true } } } },
      },
    }),
    prisma.vendorProfile.aggregate({
      where: { status: "APPROVED" },
      _count: { _all: true },
    }),
  ]);

  const cards: VendorCardData[] = featured.map((vendor) => ({
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
    topTags: vendor.tags.map((t) => t.tag.label),
  }));

  return (
    <>
      <Hero />
      <TrustStrip vendorCount={stats._count._all} />
      <Categories />
      {cards.length ? <Featured vendors={cards} /> : null}
      <HowItWorks />
      <Closing />
    </>
  );
}

/* ─────────────────────────────── Hero ──────────────────────────────────── */

async function Hero() {
  const banner = await prisma.banner.findFirst({
    where: { placement: "HOME_HERO", isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <section className="relative isolate overflow-hidden">
      {/* Backdrop: grid, warm radial wash, then the photograph at low opacity.
          Layered rather than one big image so text contrast stays predictable. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-ivory dark:bg-gradient-navy" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-grid-fine bg-grid-tile opacity-[0.55] dark:opacity-[0.22]"
      />
      <div
        aria-hidden
        className="absolute -right-40 -top-40 -z-10 size-[42rem] rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.18),transparent_62%)] blur-3xl"
      />

      {banner ? (
<div aria-hidden className="absolute inset-0 -z-10 opacity-[0.16] mix-blend-multiply dark:opacity-[0.14] dark:mix-blend-screen">
          <SmartImage
            src={banner.imageUrl}
            alt=""
            fill
            sizes="100vw"
            priorityImage
            wrapperClassName="size-full"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="container-page pt-14 md:pt-20 lg:pt-24">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow justify-center">
            <span className="eyebrow-rule" />
            Curated event vendors, India
            <span className="eyebrow-rule" />
          </p>

          <h1 className="text-display mt-6 text-[clamp(2.5rem,7vw,4.75rem)]">
            The people who make an occasion
            <span className="relative mx-2 inline-block">
              <span className="relative z-10 italic text-accent-muted">worth remembering</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1.5 -z-0 h-3 rounded-full bg-accent/18"
              />
            </span>
          </h1>

          <p className="measure mx-auto mt-6 text-lg leading-relaxed text-body">
            Aurelia brings India&apos;s finest planners, caterers and venue partners into one
            place — verified, reviewed honestly, and paid only after your event is done.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mx-auto mt-11 max-w-4xl">
          <HeroSearch />
        </Reveal>

        <Reveal delay={0.2} className="mt-10">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-subtle">
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent-muted" />
              Escrow-protected payments
            </li>
            <li className="inline-flex items-center gap-2">
              <BadgeCheck className="size-4 text-accent-muted" />
              GST &amp; FSSAI verified vendors
            </li>
            <li className="inline-flex items-center gap-2">
              <HeartHandshake className="size-4 text-accent-muted" />
              Human curation, every listing
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────── Trust strip ─────────────────────────────── */

function TrustStrip({ vendorCount }: { vendorCount: number }) {
  const stats = [
    { value: Math.max(vendorCount, 480), suffix: "+", label: "Verified vendors" },
    { value: 12_400, suffix: "+", label: "Events delivered" },
    { value: 4.7, suffix: "/5", label: "Average rating" },
    { value: 98, suffix: "%", label: "On-time arrival" },
  ];

  return (
    <section className="container-page">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface px-6 py-7 text-center">
            <p className="tnum font-display text-3xl font-medium leading-none text-heading">
              {stat.value.toLocaleString("en-IN")}
              <span className="text-accent-muted">{stat.suffix}</span>
            </p>
            <p className="mt-2 text-2xs uppercase tracking-[0.14em] text-subtle">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── Categories ──────────────────────────────── */

function Categories() {
  return (
    <section className="container-page section">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <p className="eyebrow">
            <span className="eyebrow-rule" />
            Browse by craft
          </p>
          <h2 className="text-display mt-4 max-w-xl text-[clamp(1.875rem,4vw,2.75rem)]">
            Every kind of occasion, properly staffed
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <Button asChild variant="ghost" className="group">
            <Link href="/vendors">
              See all vendors
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </Reveal>
      </div>

      <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_CATALOGUE.map((category) => {
          const Icon = ICONS[category.icon] ?? Sparkles;
          return (
            <StaggerItem key={category.slug} as="article">
              <Link
                href={`/vendors?category=${category.slug}`}
                className="group relative flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-[transform,box-shadow,border-color] duration-300 ease-swift hover:-translate-y-1 hover:border-line-strong hover:shadow-lift"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-muted transition-colors duration-300 group-hover:bg-accent group-hover:text-primary"
                >
                  <Icon className="size-5" />
                </span>

                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-display text-lg font-medium text-heading">
                    {category.name}
                    {category.docRequired ? (
                      <Badge tone="success" size="xs">
                        Verified docs
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-body">
                    {category.tagline}
                  </span>
                </span>

                <ArrowRight
                  aria-hidden
                  className="ml-auto size-4 shrink-0 text-subtle opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </Link>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
}

/* ────────────────────────────── Featured ───────────────────────────────── */

function Featured({ vendors }: { vendors: VendorCardData[] }) {
  return (
    <section className="section-tight border-y border-line bg-surface-raised/40">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <p className="eyebrow">
              <span className="eyebrow-rule" />
              This season&apos;s edit
            </p>
            <h2 className="text-display mt-4 text-[clamp(1.875rem,4vw,2.75rem)]">
              Vendors our team booked for themselves
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Button asChild variant="outline">
              <Link href="/vendors?featured=1">View the full edit</Link>
            </Button>
          </Reveal>
        </div>

        <StaggerGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <StaggerItem key={vendor.id} as="article">
              <VendorCard vendor={vendor} priority />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ───────────────────────────── How it works ────────────────────────────── */

const STEPS = [
  {
    Icon: Search2Icon,
    title: "Search with real constraints",
    body: "Filter by city, guest count, date and budget. Every result shows total price including GST — no quote required to compare.",
  },
  {
    Icon: Users,
    title: "Shortlist and compare",
    body: "Line up up to three vendors side by side: inclusions, cancellation terms, verified reviews and the exact split of what you pay.",
  },
  {
    Icon: CalendarCheck,
    title: "Book or request a quote",
    body: "Instant-book the packages that allow it, or send a request and let the vendor price it. Capacity is checked as you type.",
  },
  {
    Icon: ShieldCheck,
    title: "Pay into escrow",
    body: "A deposit locks the date. The rest is due seven days out. Vendors are paid after you confirm the event was delivered.",
  },
];

function Search2Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HowItWorks() {
  return (
    <section className="container-page section">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">
          <span className="eyebrow-rule" />
          How it works
        </p>
        <h2 className="text-display mt-4 text-[clamp(1.875rem,4vw,2.75rem)]">
          Four steps, one accountable platform
        </h2>
      </Reveal>

      <StaggerGroup className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ Icon, title, body }, index) => (
          <StaggerItem key={title} as="article" className="relative">
            <span className="tnum font-display text-4xl font-medium text-accent/35">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="mt-4 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="size-[1.125rem]" />
            </span>
            <h3 className="mt-4 font-display text-lg font-medium text-heading">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* ────────────────────────────── Closing ────────────────────────────────── */

function Closing() {
  return (
    <section className="container-page pb-section">
      <Reveal className="relative isolate overflow-hidden rounded-3xl bg-gradient-navy px-8 py-16 text-center md:px-16">
        <div aria-hidden className="absolute inset-0 -z-10 bg-noise opacity-60" />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-hairline opacity-40"
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-0 -z-10 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.22),transparent_65%)] blur-2xl"
        />

        <ChefHat className="mx-auto size-8 text-accent" />
        <h2 className="text-display mx-auto mt-6 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)] text-ivory">
          Planning something soon?
        </h2>
        <p className="measure mx-auto mt-5 text-base leading-relaxed text-ivory/75">
          Tell us the date, the city and roughly how many people. We&apos;ll send a shortlist with
          honest availability — usually within a day.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="gold" className="w-full sm:w-auto">
            <Link href="/vendors">Start searching</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full border-white/25 text-ivory hover:bg-white/10 sm:w-auto"
          >
            <Link href="/vendor/onboarding">List your business</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}