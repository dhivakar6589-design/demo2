import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt, SearchX } from "lucide-react";
import { QuoteStatusBadge } from "@/components/dashboard/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { QuoteStatus } from "@/lib/constants";
import { cn, formatDate, formatMoney, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My quotes",
  description: "Every quote and enquiry you have sent on Aurelia.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "All" },
  { key: "SENT", label: "Awaiting reply" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "ARCHIVED", label: "Archived" },
] as const;

const ARCHIVED: QuoteStatus[] = ["DRAFT", "REJECTED", "EXPIRED", "WITHDRAWN"];

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function QuotesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard/quotes");

  const params = await searchParams;
  const raw = typeof params.status === "string" ? params.status.toUpperCase() : "";
  const active = TABS.some((tab) => tab.key === raw) ? raw : "";

  const quotes = await prisma.quote.findMany({
    where: {
      customerId: user.id,
      ...(active === "ARCHIVED"
        ? { status: { in: ARCHIVED } }
        : active
          ? { status: active as QuoteStatus }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      vendorProfile: { select: { businessName: true, slug: true, logoUrl: true } },
      package: { select: { title: true } },
    },
  });

  return (
    <div>
      <header className="border-b border-line pb-5">
        <h2 className="text-display text-2xl">Quotes</h2>
        <p className="mt-2 measure text-sm leading-relaxed text-body">
          Enquiries you have sent and the pricing vendors have come back with. Totals always
          include tax, so what you see is what you pay.
        </p>
      </header>

      <nav aria-label="Filter quotes" className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key || "all"}
              href={tab.key ? `/dashboard/quotes?status=${tab.key}` : "/dashboard/quotes"}
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

      {quotes.length ? (
        <ul className="mt-6 space-y-3">
          {quotes.map((quote) => {
            const priced = quote.totalAmount > 0;
            const expiringSoon =
              quote.status === "SENT" &&
              quote.validUntil &&
              quote.validUntil.getTime() - Date.now() < 3 * 86_400_000;

            return (
              <li key={quote.id}>
                <Link
                  href={`/dashboard/quotes/${quote.id}`}
                  className="group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tnum text-2xs font-medium uppercase tracking-[0.1em] text-subtle">
                        {quote.reference}
                      </span>
                      <QuoteStatusBadge status={quote.status as QuoteStatus} />
                    </div>
                    <p className="mt-2 truncate text-base font-medium text-heading">
                      {quote.vendorProfile.businessName}
                    </p>
                    <p className="mt-1 truncate text-xs text-subtle">
                      {quote.package?.title ? `${quote.package.title} · ` : ""}
                      {formatDate(quote.eventDate)} ·{" "}
                      <span className="tnum">{quote.guestCount}</span> guests
                    </p>
                  </div>

                  <div className="min-w-0 basis-40">
                    <p className="text-overline">Event date</p>
                    <p className="tnum mt-1.5 text-sm text-heading">
                      {formatDate(quote.eventDate, "short")}
                    </p>
                    <p className="mt-0.5 text-2xs text-subtle">Sent {relativeTime(quote.createdAt)}</p>
                  </div>

                  <div className="min-w-0 basis-40 text-right">
                    <p className="text-overline">Total</p>
                    <p className="tnum mt-1.5 font-display text-lg font-medium text-heading">
                      {priced ? (
                        formatMoney(quote.totalAmount)
                      ) : (
                        <span className="text-sm font-sans font-normal text-subtle">
                          Pricing pending
                        </span>
                      )}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-2xs",
                        expiringSoon ? "text-warning" : "text-subtle",
                      )}
                    >
                      {quote.status === "SENT" && quote.validUntil
                        ? `Valid until ${formatDate(quote.validUntil, "short")}`
                        : priced
                          ? `Deposit ${formatMoney(quote.depositAmount)}`
                          : "Vendor is preparing this"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          icon={active && active !== "" ? SearchX : Receipt}
          title={active ? "Nothing in this view" : "No quotes yet"}
          description={
            active === "SENT"
              ? "Every enquiry you send shows up here while the vendor prepares its pricing."
              : active === "ACCEPTED"
                ? "Accepted quotes become bookings — send a few enquiries to get here."
                : "Send an enquiry from any vendor profile and the pricing will land here."
          }
          action={
            <Button asChild>
              <Link href="/vendors">Browse vendors</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
