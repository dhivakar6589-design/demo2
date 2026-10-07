"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/overlays";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlays";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOptionalUser } from "@/components/session-provider";
import { CATEGORY_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { href: "/vendors", label: "Find vendors" },
  { href: "/vendors?instant=1", label: "Instant book" },
  { href: "/compare", label: "Compare" },
  { href: "/design-system", label: "Design system" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const user = useOptionalUser();

  // Glass only after the page moves; a solid bar at rest is calmer than a
  // permanently translucent one, and avoids a blur cost on first paint.
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes the mobile sheet.
  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300 ease-swift",
        scrolled
          ? "border-line bg-background/85 shadow-nav backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-background",
      )}
    >
      <div className="container-page">
        <div className="flex h-16 items-center gap-4 lg:h-20">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="-ml-2 grid size-10 place-items-center rounded-lg text-heading transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Logo />

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {PRIMARY_LINKS.map((link) => {
              const active =
                link.href === "/vendors"
                  ? pathname === "/vendors"
                  : pathname.startsWith(link.href.split("?")[0]);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    active ? "text-heading" : "text-body hover:text-heading",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <HeaderSearch className="hidden md:block" />

            <Link
              href="/vendors"
              aria-label="Search vendors"
              className="grid size-10 place-items-center rounded-lg text-body transition-colors hover:bg-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden"
            >
              <Search className="size-5" />
            </Link>

            <ThemeToggle className="hidden sm:inline-flex" />

            {user ? (
              <>
                <Link
                  href="/dashboard/wishlist"
                  aria-label="Wishlist"
                  className="hidden size-10 place-items-center rounded-lg text-body transition-colors hover:bg-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:grid"
                >
                  <Heart className="size-5" />
                </Link>

                <NotificationBell />

                {user.role === "VENDOR" || user.vendorProfileId ? (
                  <Button asChild size="sm" className="hidden sm:inline-flex">
                    <Link href="/vendor/dashboard">
                      <LayoutDashboard className="size-4" />
                      Dashboard
                    </Link>
                  </Button>
                ) : null}

                <AccountMenu />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/register">
                    <Sparkles className="size-4" />
                    Join Aurelia
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}

/* ─────────────────────────── Search field ─────────────────────────────── */

function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = React.useState(params.get("q") ?? "");

  React.useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/vendors?q=${encodeURIComponent(q)}` : "/vendors");
      }}
      className={cn("relative w-56 lg:w-72", className)}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search vendors, cuisines…"
        aria-label="Search vendors"
        className="h-10 pl-9"
      />
    </form>
  );
}

/* ──────────────────────────── Account menu ────────────────────────────── */

function AccountMenu() {
  const user = useOptionalUser();
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const vendorDashboard = user.vendorProfileId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-1 rounded-full pl-1 pr-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar size="sm">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials || "A"}</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-subtle" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block text-xs text-subtle">Signed in as</span>
          <span className="mt-0.5 block truncate text-sm font-medium text-heading">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
            <UserIcon />
            {user.role === "ADMIN" ? "Admin console" : "My dashboard"}
          </Link>
        </DropdownMenuItem>

        {vendorDashboard ? (
          <DropdownMenuItem asChild>
            <Link href="/vendor/dashboard">
              <Store />
              Vendor dashboard
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/vendor/onboarding">
              <Plus />
              Become a vendor
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/dashboard/bookings">
            <Sparkles />
            My bookings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard/wishlist">
            <Heart />
            Wishlist
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        {user.role === "ADMIN" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              <Shield />
              Platform settings
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <SignOutItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SignOutItem() {
  const [busy, setBusy] = React.useState(false);

  return (
    <DropdownMenuItem
      destructive
      disabled={busy}
      onSelect={(event) => {
        event.preventDefault();
        setBusy(true);
        void fetch("/api/auth/logout", { method: "POST" })
          .catch(() => undefined)
          .finally(() => {
            window.location.href = "/";
          });
      }}
    >
      <LogOut />
      {busy ? "Signing out…" : "Sign out"}
    </DropdownMenuItem>
  );
}

function NotificationBell() {
  return (
    <Link
      href="/dashboard/notifications"
      aria-label="Notifications"
      className="relative hidden size-10 place-items-center rounded-lg text-body transition-colors hover:bg-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:grid"
    >
      <Bell className="size-5" />
    </Link>
  );
}

/* ──────────────────────────── Mobile sheet ────────────────────────────── */

function MobileMenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useOptionalUser();
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        hideClose
        className="left-0 top-0 h-dvh max-h-dvh w-[min(22rem,88vw)] -translate-x-0 -translate-y-0 rounded-none border-y-0 border-l-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
      >
        <DialogHeader className="flex-row items-center justify-between gap-3">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Logo />
          <DialogClose
            aria-label="Close menu"
            className="-mr-2 grid size-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-heading"
          >
            <X className="size-5" />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <HeaderSearch className="mb-6 w-full" />

          <nav aria-label="Mobile" className="space-y-0.5">
            <SheetLink href="/vendors" label="Find vendors" pathname={pathname} />
            <SheetLink href="/vendors?instant=1" label="Instant book" pathname={pathname} />
            <SheetLink href="/compare" label="Compare vendors" pathname={pathname} />
            <SheetLink href="/design-system" label="Design system" pathname={pathname} />
          </nav>

          <p className="eyebrow mt-8 mb-3">Browse by category</p>
          <nav aria-label="Categories" className="space-y-0.5">
            {CATEGORY_NAV.map((category) => (
              <SheetLink
                key={category.slug}
                href={`/vendors?category=${category.slug}`}
                label={category.label}
                pathname={pathname}
                muted
              />
            ))}
          </nav>

          <div className="mt-8 border-t border-line pt-6">
            {user ? (
              <div className="space-y-1">
                <p className="truncate text-sm font-medium text-heading">{user.name}</p>
                <p className="truncate text-xs text-subtle">{user.email}</p>
                <div className="mt-4 grid gap-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                      {user.role === "ADMIN" ? "Admin console" : "My dashboard"}
                    </Link>
                  </Button>
                  {user.vendorProfileId ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/vendor/dashboard">Vendor dashboard</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button asChild className="w-full">
                  <Link href="/auth/register">Join Aurelia</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <span className="text-overline">Theme</span>
          <ThemeToggle />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SheetLink({
  href,
  label,
  pathname,
  muted,
}: {
  href: string;
  label: string;
  pathname: string;
  muted?: boolean;
}) {
  const active = pathname === href.split("?")[0];
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : muted
            ? "text-body hover:bg-muted hover:text-heading"
            : "font-medium text-heading hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );
}