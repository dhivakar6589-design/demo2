import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react";
import { QuoteActions } from "@/components/dashboard/quote-actions";
import { QuoteStatusBadge } from "@/components/dashboard/status-badges";
import { Alert } from "@/components/ui/feedback";
import { Card, CardTitle } from "@/components/ui/card";
import { DataList } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { QuoteStatus } from "@/lib/constants";
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Quote",
  description: "Quote details from a vendor on Aurelia.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: PageProps) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/auth/login?next=/dashboard/quotes`);

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      vendorProfile: {
        select: {
          businessName: true,
          slug: true,
          logoUrl: true,
          baseCity: true,
          responseTimeHrs: true,
        },
      },
      package: { select: { title: true } },
      event: { select: { title: true, eventType: true, venueCity: true } },
    },
  });

  if (!quote || quote.customerId !== user.id) notFound();

  const status = quote.status as QuoteStatus;
  const heading = quote.package?.title ?? quote.event?.title ?? "Your enquiry";
  const expiringSoon =
    status === "SENT" &&
    quote.validUntil &&
    quote.validUntil.getTime() - Date.now() < 3 * 86_400_000;

  return (
    <div>
      <Link
        href="/dashboard/quotes"
        className="group inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        All quotes
      </Link>

      {/* ── Head ───────────────────────────────────────────────────── */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="tnum text-2xs font-medium uppercase tracking-[0.1em] text-subtle">
                {quote.reference}
              </span>
              <QuoteStatusBadge status={status} />
            </div>
            <h1 className="text-display mt-3 text-[clamp(1.5rem,2.6vw,2rem)]">{heading}</h1>

            <div className="mt-4 flex items-center gap-3">
              {quote.vendorProfile.logoUrl ? (
                <img
                  src={quote.vendorProfile.logoUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-line object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised font-display text-xs font-medium text-accent-muted"
                >
                  {quote.vendorProfile.businessName.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <Link
                  href={`/vendors/${quote.vendorProfile.slug}`}
                  className="block truncate text-sm font-medium text-heading underline-offset-4 hover:underline"
                >
                  {quote.vendorProfile.businessName}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-subtle">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    Replies in ~{quote.vendorProfile.responseTimeHrs}h
                  </span>
                  {quote.vendorProfile.baseCity ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {quote.vendorProfile.baseCity}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-overline">Quoted total</p>
            <p className="tnum mt-1.5 font-display text-3xl font-medium text-heading">
              {quote.totalAmount > 0 ? formatMoney(quote.totalAmount) : "—"}
            </p>
            <p className="tnum mt-1 text-xs text-subtle">
              {quote.totalAmount > 0
                ? `Deposit ${formatMoney(quote.depositAmount)} · tax included`
                : "Pricing still being prepared"}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <DataList
            columns={3}
            items={[
              { label: "Event date", value: formatDate(quote.eventDate, "long") },
              { label: "Guests", value: <span className="tnum">{quote.guestCount}</span> },
              {
                label: "Venue",
                value: quote.event?.venueCity ?? quote.event?.eventType ?? "To be confirmed",
              },
              { label: "Sent", value: formatDateTime(quote.createdAt) },
              {
                label: "Valid until",
                value: quote.validUntil ? (
                  <span className={cn(expiringSoon && "text-warning")}>
                    {formatDate(quote.validUntil, "long")}
                    {expiringSoon ? " · expiring soon" : ""}
                  </span>
                ) : (
                  "—"
                ),
              },
              {
                label: "Responded",
                value: quote.respondedAt ? formatDateTime(quote.respondedAt) : "Awaiting your reply",
              },
            ]}
          />
        </div>
      </Card>

      {/* ── Status notice ──────────────────────────────────────────── */}
      {status === "ACCEPTED" ? (
        <Alert className="mt-6" tone="success" title="Quote accepted">
          {quote.vendorProfile.businessName} has been notified. They&rsquo;ll confirm your date and
          share next steps shortly — watch your notifications.
        </Alert>
      ) : status === "REJECTED" || status === "WITHDRAWN" || status === "EXPIRED" ? (
        <Alert className="mt-6" tone="neutral" title={quote.declineReason ? "Declined" : "Closed"}>
          {status === "REJECTED" && quote.declineReason
            ? `Reason given: ${quote.declineReason}`
            : status === "WITHDRAWN"
              ? "You withdrew this enquiry. The vendor has been notified."
              : status === "EXPIRED"
                ? "This quote passed its valid-until date without a response. Send a new enquiry to start again."
                : "This quote is closed."}
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_19rem] lg:items-start">
        {/* ── Brief + line items ───────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {quote.note ? (
            <Card>
              <div className="flex items-start gap-3">
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-accent-muted" />
                <div className="min-w-0">
                  <p className="text-overline">Your brief</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
                    {quote.note}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <section>
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <CardTitle>What&rsquo;s included</CardTitle>
              <span className="text-2xs text-subtle">
                <span className="tnum">{quote.items.length}</span>{" "}
                {quote.items.length === 1 ? "line" : "lines"}
              </span>
            </div>

            {quote.items.length ? (
              <ul className="divide-y divide-line">
                {quote.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-heading">{item.label}</p>
                      {item.detail ? (
                        <p className="mt-1 text-xs leading-relaxed text-subtle">{item.detail}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-sm text-heading">
                        {formatMoney(item.lineTotal)}
                      </p>
                      <p className="tnum mt-0.5 text-2xs text-subtle">
                        {item.quantity > 1 ? `${item.quantity} × ${formatMoney(item.unitPrice)}` : "one"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-sm text-body">
                The vendor is still itemising this quote.
              </p>
            )}

            {quote.terms ? (
              <div className="mt-6 rounded-xl border border-line bg-surface-sunken/60 p-4">
                <p className="text-overline">Vendor terms</p>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-body">
                  {quote.terms}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        {/* ── Totals ───────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-28">
          <Card>
            <CardTitle>Summary</CardTitle>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Subtotal" value={formatMoney(quote.subtotalAmount)} />
              {quote.discountAmount > 0 ? (
                <Row
                  label="Discount"
                  value={`− ${formatMoney(quote.discountAmount)}`}
                  tone="success"
                />
              ) : null}
              <Row label="Tax" value={formatMoney(quote.taxAmount)} />
              <div className="border-t border-line pt-3">
                <Row label="Total" value={formatMoney(quote.totalAmount)} strong />
              </div>
              {quote.depositAmount > 0 ? (
                <div className="border-t border-line pt-3">
                  <Row
                    label="Due to reserve"
                    value={formatMoney(quote.depositAmount)}
                    strong
                    tone="gold"
                  />
                  <p className="mt-2 text-2xs leading-relaxed text-subtle">
                    The rest is settled directly with the vendor before the event, as per their
                    terms.
                  </p>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 border-t border-line pt-4">
              {status === "SENT" ? (
                <QuoteActions quoteId={quote.id} vendorName={quote.vendorProfile.businessName} />
              ) : status === "ACCEPTED" || status === "DRAFT" ? (
                <ButtonLink href="/dashboard/bookings">View bookings</ButtonLink>
              ) : (
                <ButtonLink href={`/vendors/${quote.vendorProfile.slug}`}>
                  Enquire again
                </ButtonLink>
              )}
            </div>
          </Card>

          <p className="mt-3 flex items-start gap-2 text-2xs leading-relaxed text-subtle">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-accent-muted" />
            No payment is taken here. Deposits are held by Aurelia until you approve the booking.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "gold" | "success";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("text-body", strong && "font-medium text-heading")}>{label}</dt>
      <dd
        className={cn(
          "tnum",
          strong && "font-display text-lg font-medium text-heading",
          tone === "gold" && "text-accent-muted",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-transform duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
    >
      {children}
    </Link>
  );
}
