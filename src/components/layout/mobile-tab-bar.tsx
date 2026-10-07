"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, LayoutDashboard, User } from "lucide-react";
import { useOptionalUser } from "@/components/session-provider";
import { cn } from "@/lib/utils";

/**
 * Fixed bottom tab bar for small screens.
 *
 * Thumb-reachable, four destinations maximum, and role-aware: a vendor sees
 * "Dashboard" where a customer sees "Bookings". Hidden from lg up, where the
 * header carries the same navigation.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const user = useOptionalUser();

  const items = user
    ? user.vendorProfileId
      ? [
          { href: "/", label: "Home", Icon: Home },
          { href: "/vendors", label: "Browse", Icon: Compass },
          { href: "/vendor/dashboard", label: "Dashboard", Icon: LayoutDashboard },
          { href: "/dashboard/wishlist", label: "Wishlist", Icon: Heart },
        ]
      : [
          { href: "/", label: "Home", Icon: Home },
          { href: "/vendors", label: "Browse", Icon: Compass },
          { href: "/dashboard/bookings", label: "Bookings", Icon: LayoutDashboard },
          { href: "/dashboard/wishlist", label: "Wishlist", Icon: Heart },
        ]
    : [
        { href: "/", label: "Home", Icon: Home },
        { href: "/vendors", label: "Browse", Icon: Compass },
        { href: "/auth/register", label: "Join", Icon: User },
        { href: "/auth/login", label: "Sign in", Icon: LayoutDashboard },
      ];

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                  active ? "text-accent-muted" : "text-subtle hover:text-heading",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.1 : 1.8} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}