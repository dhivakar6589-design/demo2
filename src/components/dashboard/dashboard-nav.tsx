"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  Heart,
  LayoutDashboard,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardCounts {
  quotes: number;
  bookings: number;
  wishlist: number;
  notifications: number;
}

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, key: null, exact: true },
  { href: "/dashboard/quotes", label: "Quotes", icon: Receipt, key: "quotes", exact: false },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    icon: CalendarCheck,
    key: "bookings",
    exact: false,
  },
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart, key: "wishlist", exact: false },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    key: "notifications",
    exact: false,
  },
] as const;

/**
 * Section navigation for the customer dashboard.
 *
 * Horizontal pill row on small screens (thumb-reachable, no drawer to open),
 * a vertical rail from lg up where there is room for labels.
 */
export function DashboardNav({ counts }: { counts: DashboardCounts }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const badge = item.key ? counts[item.key] : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-surface text-heading shadow-xs ring-1 ring-line"
                : "text-body hover:bg-muted hover:text-heading",
              "lg:w-full",
            )}
          >
            <item.icon
              className={cn("size-4 shrink-0", active ? "text-accent-muted" : "text-subtle")}
            />
            <span className="whitespace-nowrap">{item.label}</span>
            {badge > 0 ? (
              <span
                className={cn(
                  "tnum ml-auto rounded-full px-1.5 py-0.5 text-2xs font-medium",
                  active ? "bg-accent-soft text-accent-muted" : "bg-muted text-subtle",
                )}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
