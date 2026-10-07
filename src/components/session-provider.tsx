"use client";

import * as React from "react";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Client-side session mirror.
 *
 * The server is the source of truth — this only carries the already-resolved
 * user across the client boundary so the header and account menu can render
 * without another round-trip. Anything permission-sensitive is still checked
 * server-side on every request.
 */

interface SessionContextValue {
  user: CurrentUser | null;
}

const SessionContext = React.createContext<SessionContextValue>({ user: null });

export function SessionProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ user }), [user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return React.useContext(SessionContext);
}

/** Signed-in users only. Mirrors requireUser() on the server. */
export function useUser(): CurrentUser {
  const { user } = useSession();
  if (!user) throw new Error("useUser() called outside an authenticated route.");
  return user;
}

export function useOptionalUser(): CurrentUser | null {
  return useSession().user;
}

/** Signed-in customers — the only role that can hold bookings. */
export function useCustomer() {
  const user = useOptionalUser();
  return user?.role === "CUSTOMER" ? user : null;
}

/** Vendors and their staff share the dashboard; `isOwner` separates them. */
export function useVendor() {
  const user = useOptionalUser();
  if (!user || !user.vendorProfileId) return null;
  return {
    user,
    profileId: user.vendorProfileId,
    slug: user.vendorSlug,
    status: user.vendorStatus,
    isOwner: user.role === "VENDOR",
    canManageListings: user.role === "VENDOR" || user.staffPermissions.includes("LISTINGS_WRITE"),
    canManageOrders: user.role === "VENDOR" || user.staffPermissions.includes("ORDERS_WRITE"),
    canManageFinance: user.role === "VENDOR" || user.staffPermissions.includes("PAYOUTS_READ"),
  };
}

export function useIsAdmin() {
  return useOptionalUser()?.role === "ADMIN";
}