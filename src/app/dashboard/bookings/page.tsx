import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CalendarX2, Receipt } from "lucide-react";
import { OrderStatusBadge } from "@/components/dashboard/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { TERMINAL_STATUSES, type OrderStatus } from "@/lib/constants";
import { cn, countdownLabel, formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My bookings",
  description: "Confirmed events and upcoming bookings on Aurelia.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "ALL", label: "All" },
] as const;

const CLOSED: OrderStatus[] = ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BookingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard/bookings");

  const params = await searchParams;
  const raw = typeof params.status === "string" ? params.status.toUpperCase() : "";
  const active = TABS.some((tab) => tab.key === raw) ? raw : "";

  const orders = await prisma.order.findMany({
    where: {
      customerId: user.id,
      ...(active === "COMPLETED"
        ? { status: "COMPLETED" }
        : active === "CANCELLED"
          ? { status: { in: CLOSED } }
          : active === "ALL"
            ? {}
            : { status: { notIn: TERMINAL_STATUSES } }),
    },
    orderBy: { eventDate: "asc" },
    take: 60,
    include: {
      vendorProfile: { select: { businessName: true, slug: true } },
      event: { select: { title: true } },
    },
  });

  return (
    <div>
      <header className="border-b border-line pb-5">
        <h2 className="text-display text-2xl">Bookings</h2>
        <p className="mt-2 measure text-sm leading-relaxed text-body">
          Every event you have locked in with a vendor, from deposit through to the day itself.
        </p>
      </header>

      <nav aria-label="Filter bookings" className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key || "upcoming"}
              href={tab.key ? `/dashboard/bookings?status=${tab.key}` : "/dashboard/bookings"}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive
                  ? "border-accent/50 bg-accent-soft text-accent-muted"
                  : "border-line bg-surface text-body hover:border-line-strong hover:text-heading",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {orders.length ? (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => {
            const past = order.eventDate.getTime() < Date.now();
            const closed = TERMINAL_STATUSES.includes(order.status as OrderStatus);

            return (
              <li key={order.id}>
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tnum text-2xs font-medium uppercase tracking-[0.1em] text-subtle">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status as OrderStatus} />
                    </div>
                    <p className="mt-2 truncate text-base font-medium text-heading">
                      {order.vendorProfile.businessName}
                    </p>
                    <p className="mt-1 truncate text-xs text-subtle">
                      {order.event?.title ? `${order.event.title} · ` : ""}
                      {order.venueCity ?? "Venue to be confirmed"}
                    </p>
                  </div>

                  <div className="min-w-0 basis-40">
                    <p className="text-overline">Event date</p>
                    <p className="tnum mt-1.5 text-sm text-heading">
                      {formatDate(order.eventDate, "short")}
                    </p>
                    <p className={cn("mt-0.5 text-2xs", closed ? "text-subtle" : past ? "text-warning" : "text-subtle")}>
                      {closed ? formatDate(order.createdAt, "short") : countdownLabel(order.eventDate)}
                    </p>
                  </div>

                  <div className="min-w-0 basis-32">
                    <p className="text-overline">Guests</p>
                    <p className="tnum mt-1.5 text-sm text-heading">{order.guestCount}</p>
                    <p className="mt-0.5 text-2xs text-subtle">
                      Deposit {order.depositStatus === "PAID" ? "paid" : "due"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <div>
                      <p className="text-overline">Total</p>
                      <p className="tnum mt-1.5 font-display text-lg font-medium text-heading">
                        {formatMoney(order.totalAmount)}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-muted" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          icon={active === "CANCELLED" ? CalendarX2 : active === "COMPLETED" ? Receipt : CalendarDays}
          title={active ? "Nothing here" : "No bookings yet"}
          description={
            active === "COMPLETED"
              ? "Finished events will collect here, ready for you to review."
              : active === "CANCELLED"
                ? "Cancelled and refunded bookings appear here."
                : active === "ALL"
                  ? "You haven't booked a vendor yet."
                  : "Accept a quote from your quotes page and it becomes a booking."
          }
          action={
            <Button asChild size="sm">
              <Link href={active === "" ? "/dashboard/quotes" : "/vendors"}>
                {active === "" ? "View my quotes" : "Browse vendors"}
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
