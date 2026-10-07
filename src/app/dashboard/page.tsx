import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Compass,
  Heart,
  Receipt,
  Search,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, StatBlock } from "@/components/ui/feedback";
import { QuoteStatusBadge, OrderStatusBadge } from "@/components/dashboard/status-badges";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, QuoteStatus } from "@/lib/constants";
import { countdownLabel, formatDate, formatMoney, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [quoteCounts, recentQuotes, upcomingOrders, recentNotifications, savedVendors, events] =
    await Promise.all([
      prisma.quote.groupBy({
        by: ["status"],
        where: { customerId: user.id },
        _count: { _all: true },
      }),
      prisma.quote.findMany({
        where: { customerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          vendorProfile: { select: { businessName: true, slug: true } },
        },
      }),
      prisma.order.findMany({
        where: {
          customerId: user.id,
          eventDate: { gte: today },
          status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"] },
        },
        orderBy: { eventDate: "asc" },
        take: 2,
        include: { vendorProfile: { select: { businessName: true, slug: true } } },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.wishlistItem.count({ where: { userId: user.id } }),
      prisma.event.findMany({
        where: {
          customerId: user.id,
          eventDate: { gte: today },
          status: { in: ["PLANNING", "QUOTED"] },
        },
        orderBy: { eventDate: "asc" },
        take: 1,
        select: {
          id: true,
          title: true,
          eventType: true,
          eventDate: true,
          guestCount: true,
          venueCity: true,
        },
      }),
    ]);

  const statusTally = new Map(quoteCounts.map((row) => [row.status, row._count._all]));
  const awaiting = statusTally.get("SENT") ?? 0;
  const accepted = statusTally.get("ACCEPTED") ?? 0;
  const unread = recentNotifications.filter((n) => !n.readAt).length;
  const nextOrder = upcomingOrders[0];
  const nextEvent = events[0];

  const stats = [
    {
      label: "Awaiting reply",
      value: awaiting,
      hint: awaiting ? "Vendors pricing your briefs" : "No quotes pending",
      href: "/dashboard/quotes?status=SENT",
      icon: Receipt,
    },
    {
      label: "Accepted quotes",
      value: accepted,
      hint: "Ready to convert to a booking",
      href: "/dashboard/quotes?status=ACCEPTED",
      icon: CalendarDays,
    },
    {
      label: "Saved vendors",
      value: savedVendors,
      hint: savedVendors ? "Shortlisted for later" : "Nothing saved yet",
      href: "/dashboard/wishlist",
      icon: Heart,
    },
    {
      label: "Unread updates",
      value: unread,
      hint: unread ? "Replies, payments, reminders" : "You're all caught up",
      href: "/dashboard/notifications",
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Stat strip ─────────────────────────────────────────────── */}
      <Card padded={false} className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group bg-surface p-5 transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <StatBlock
                label={stat.label}
                value={stat.value}
                hint={
                  <span className="inline-flex items-center gap-1 transition-colors group-hover:text-accent-muted">
                    {stat.hint}
                    <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                }
              />
            </Link>
          ))}
        </div>
      </Card>

      {/* ── Next up ────────────────────────────────────────────────── */}
      {nextOrder ? (
        <Card className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow">
              <span className="eyebrow-rule" />
              Next booking
            </p>
            <p className="mt-3 font-display text-xl font-medium text-heading">
              {nextOrder.vendorProfile.businessName}
            </p>
            <p className="mt-1.5 text-sm text-body">
              {formatDate(nextOrder.eventDate, "weekday")} ·{" "}
              <span className="tnum">{nextOrder.guestCount}</span> guests
              {nextOrder.venueCity ? ` · ${nextOrder.venueCity}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={nextOrder.status as OrderStatus} />
              <span className="text-xs text-subtle">
                {countdownLabel(nextOrder.eventDate)} · {formatMoney(nextOrder.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/orders/${nextOrder.id}`}>View booking</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/bookings">All bookings</Link>
            </Button>
          </div>
        </Card>
      ) : nextEvent ? (
        <Card className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow">
              <span className="eyebrow-rule" />
              In planning
            </p>
            <p className="mt-3 font-display text-xl font-medium text-heading">{nextEvent.title}</p>
            <p className="mt-1.5 text-sm text-body">
              {formatDate(nextEvent.eventDate, "weekday")} ·{" "}
              <span className="tnum">{nextEvent.guestCount}</span> guests
              {nextEvent.venueCity ? ` · ${nextEvent.venueCity}` : ""}
            </p>
            <p className="mt-3 text-xs text-subtle">{countdownLabel(nextEvent.eventDate)}</p>
          </div>

          <Button asChild size="sm">
            <Link href="/vendors">
              <Search className="size-4" />
              Find vendors for it
            </Link>
          </Button>
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow">
              <span className="eyebrow-rule" />
              Start here
            </p>
            <p className="mt-3 font-display text-xl font-medium text-heading">
              What are you planning?
            </p>
            <p className="mt-1.5 measure text-sm text-body">
              Tell a vendor the date and guest count and you&rsquo;ll get a costed quote back —
              no card, no commitment.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/vendors">
              <Compass className="size-4" />
              Browse vendors
            </Link>
          </Button>
        </Card>
      )}

      {/* ── Quotes + notifications ─────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <SectionHeader title="Recent quotes" href="/dashboard/quotes" cta="All quotes" />

          {recentQuotes.length ? (
            <ul className="mt-4 space-y-3">
              {recentQuotes.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/dashboard/quotes/${quote.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tnum text-2xs font-medium uppercase tracking-[0.1em] text-subtle">
                          {quote.reference}
                        </span>
                        <QuoteStatusBadge status={quote.status as QuoteStatus} />
                      </div>
                      <p className="mt-1.5 truncate text-sm font-medium text-heading">
                        {quote.vendorProfile.businessName}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">
                        {formatDate(quote.eventDate)} · <span className="tnum">{quote.guestCount}</span>{" "}
                        guests
                      </p>
                    </div>

                    <p className="tnum shrink-0 text-right text-sm font-medium text-heading">
                      {quote.totalAmount > 0 ? (
                        formatMoney(quote.totalAmount)
                      ) : (
                        <span className="text-xs font-normal text-subtle">Pricing pending</span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={Receipt}
              title="No quotes yet"
              description="Enquiries you send to vendors appear here with their pricing."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/vendors">Find vendors</Link>
                </Button>
              }
            />
          )}
        </section>

        <section>
          <SectionHeader title="Notifications" href="/dashboard/notifications" cta="View all" />

          {recentNotifications.length ? (
            <ul className="mt-4 space-y-3">
              {recentNotifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href ?? "/dashboard/notifications"}
                    className="flex gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span
                      aria-hidden
                      className={
                        item.readAt
                          ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong"
                          : "mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                      }
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-heading">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-body">
                        {item.body}
                      </p>
                      <p className="mt-1.5 text-2xs text-subtle">{relativeTime(item.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={Bell}
              title="Nothing here yet"
              description="Quote replies, payment reminders and booking updates land here."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
      <CardTitle>{title}</CardTitle>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-xs font-medium text-accent-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {cta}
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
