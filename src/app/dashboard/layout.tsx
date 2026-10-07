import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { DashboardNav, type DashboardCounts } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your quotes, bookings and saved vendors on Aurelia.",
  robots: { index: false, follow: false },
};

/** Everything on this route reflects the signed-in account — never cached. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard");

  const [awaitingQuotes, activeBookings, savedVendors, unreadNotifications] = await Promise.all([
    prisma.quote.count({ where: { customerId: user.id, status: "SENT" } }),
    prisma.order.count({
      where: {
        customerId: user.id,
        status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"] },
      },
    }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const counts: DashboardCounts = {
    quotes: awaitingQuotes,
    bookings: activeBookings,
    wishlist: savedVendors,
    notifications: unreadNotifications,
  };

  const firstName = user.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="container-page pb-section pt-8 md:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-rule" />
            Your dashboard
          </p>
          <h1 className="text-display mt-3.5 text-[clamp(1.75rem,3vw,2.5rem)]">
            {greeting}, {firstName}
          </h1>
        </div>

        <Button asChild variant="outline">
          <Link href="/vendors">
            <Compass className="size-4" />
            Browse vendors
          </Link>
        </Button>
      </header>

      <div className="mt-9 grid gap-6 lg:grid-cols-[13.5rem_1fr] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <DashboardNav counts={counts} />
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
