import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { OrderCancelAction } from "@/components/dashboard/order-cancel";
import { OrderStatusBadge } from "@/components/dashboard/status-badges";
import { Alert } from "@/components/ui/feedback";
import { Card, CardTitle } from "@/components/ui/card";
import { DataList } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { flowIndex } from "@/lib/domain/orders";
import {
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  TERMINAL_STATUSES,
  type OrderStatus,
} from "@/lib/constants";
import {
  cn,
  countdownLabel,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Booking",
  description: "Booking details, payments and timeline on Aurelia.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const DEPOSIT_LABEL: Record<string, string> = { DUE: "Due", PAID: "Paid", REFUNDED: "Refunded" };
const BALANCE_LABEL: Record<string, string> = {
  PENDING: "Not yet due",
  DUE: "Due",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};
const PAYMENT_KIND_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
  BALANCE: "Balance",
  REFUND: "Refund",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  AUTHORIZED: "Authorised",
  CAPTURED: "Captured",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

export default async function OrderDetailPage({ params }: PageProps) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard/bookings");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      vendorProfile: {
        select: {
          businessName: true,
          slug: true,
          logoUrl: true,
          phone: true,
          responseTimeHrs: true,
        },
      },
      quote: { select: { id: true, reference: true } },
      event: { select: { title: true, eventType: true, venueCity: true } },
    },
  });

  if (!order || order.customerId !== user.id) notFound();

  const status = order.status as OrderStatus;
  const closed = TERMINAL_STATUSES.includes(status);
  const currentIndex = flowIndex(status);
  const canCancel =
    !closed &&
    order.depositStatus !== "PAID" &&
    ["PENDING_PAYMENT", "CONFIRMED", "IN_PREPARATION"].includes(status);
  const title = order.event?.title ?? order.venueName ?? "Your booking";

  return (
    <div>
      <Link
        href="/dashboard/bookings"
        className="group inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        All bookings
      </Link>

      {/* ── Head ───────────────────────────────────────────────────── */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="tnum text-2xs font-medium uppercase tracking-[0.1em] text-subtle">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={status} />
            </div>
            <h1 className="text-display mt-3 text-[clamp(1.5rem,2.6vw,2rem)]">{title}</h1>

            <div className="mt-4 flex items-center gap-3">
              {order.vendorProfile.logoUrl ? (
                <img
                  src={order.vendorProfile.logoUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-line object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised font-display text-xs font-medium text-accent-muted"
                >
                  {order.vendorProfile.businessName.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <Link
                  href={`/vendors/${order.vendorProfile.slug}`}
                  className="block truncate text-sm font-medium text-heading underline-offset-4 hover:underline"
                >
                  {order.vendorProfile.businessName}
                </Link>
                <p className="mt-0.5 flex items-center gap-3 text-xs text-subtle">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    Replies in ~{order.vendorProfile.responseTimeHrs}h
                  </span>
                  {order.quote ? (
                    <Link
                      href={`/dashboard/quotes/${order.quote.id}`}
                      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      Quote {order.quote.reference}
                      <ArrowRight className="size-3" />
                    </Link>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-overline">Booking total</p>
            <p className="tnum mt-1.5 font-display text-3xl font-medium text-heading">
              {formatMoney(order.totalAmount)}
            </p>
            <p className="tnum mt-1 text-xs text-subtle">
              Deposit {DEPOSIT_LABEL[order.depositStatus] ?? order.depositStatus.toLowerCase()} ·{" "}
              {formatMoney(order.depositAmount)}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Notices ────────────────────────────────────────────────── */}
      {status === "PENDING_PAYMENT" ? (
        <Alert className="mt-6" tone="warning" title="Deposit due">
          Pay {formatMoney(order.depositAmount)} to lock {formatDate(order.eventDate, "short")} with{" "}
          {order.vendorProfile.businessName}. Until then the date isn&rsquo;t held for you.
        </Alert>
      ) : status === "CANCELLED" ? (
        <Alert className="mt-6" tone="neutral" title="This booking was cancelled">
          {order.cancellationReason ? `Reason: ${order.cancellationReason}. ` : ""}
          {order.cancelledAt ? `Cancelled ${formatDateTime(order.cancelledAt)}.` : ""}
        </Alert>
      ) : status === "DISPUTED" ? (
        <Alert className="mt-6" tone="danger" title="This booking is in dispute">
          Our team is reviewing it with both sides. You&rsquo;ll get a notification when there&rsquo;s
          an outcome.
        </Alert>
      ) : null}

      {/* ── Progress ───────────────────────────────────────────────── */}
      {!closed && status !== "DISPUTED" ? (
        <Card className="mt-6">
          <ol className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {ORDER_FLOW.map((step, index) => {
              const done = index < currentIndex;
              const current = index === currentIndex;
              return (
                <li key={step} className="min-w-0">
                  <span
                    aria-hidden
                    className={cn(
                      "block h-0.5 w-full rounded-full",
                      done ? "bg-accent" : current ? "bg-accent/50" : "bg-line",
                    )}
                  />
                  <p
                    className={cn(
                      "mt-2.5 truncate text-2xs font-medium uppercase tracking-[0.1em]",
                      current ? "text-accent-muted" : done ? "text-heading" : "text-subtle",
                    )}
                  >
                    {ORDER_STATUS_LABELS[step]}
                  </p>
                  {current ? (
                    <p className="mt-1 text-2xs text-subtle">{countdownLabel(order.eventDate)}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Card>
      ) : null}

      {/* ── Detail grid ────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_19rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card>
            <DataList
              columns={3}
              items={[
                { label: "Event date", value: formatDate(order.eventDate, "long") },
                { label: "Start time", value: order.startTime },
                { label: "Guests", value: <span className="tnum">{order.guestCount}</span> },
                {
                  label: "Venue",
                  value: order.venueName
                    ? `${order.venueName}${order.venueCity ? `, ${order.venueCity}` : ""}`
                    : order.venueCity ?? "To be confirmed",
                },
                {
                  label: "Booked on",
                  value: formatDateTime(order.createdAt),
                },
                {
                  label: order.balanceDueDate ? "Balance due" : "Status",
                  value: order.balanceDueDate ? (
                    formatDate(order.balanceDueDate, "long")
                  ) : (
                    ORDER_STATUS_LABELS[status]
                  ),
                },
              ]}
            />
          </Card>

          <section>
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <CardTitle>What&rsquo;s included</CardTitle>
              <span className="tnum text-2xs text-subtle">{order.items.length} lines</span>
            </div>

            {order.items.length ? (
              <ul className="divide-y divide-line">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-heading">{item.label}</p>
                      {item.detail ? (
                        <p className="mt-1 text-xs leading-relaxed text-subtle">{item.detail}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-sm text-heading">{formatMoney(item.lineTotal)}</p>
                      <p className="tnum mt-0.5 text-2xs text-subtle">
                        {item.quantity > 1
                          ? `${item.quantity} × ${formatMoney(item.unitPrice)}`
                          : "one"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-sm text-body">No line items recorded on this booking.</p>
            )}
          </section>

          {/* ── Timeline ───────────────────────────────────────────── */}
          <section>
            <div className="border-b border-line pb-3">
              <CardTitle>Timeline</CardTitle>
            </div>
            {order.statusHistory.length ? (
              <ol className="mt-4 space-y-5 border-l border-line pl-5">
                {order.statusHistory.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[1.44rem] top-1.5 size-2 rounded-full border border-line bg-surface ring-4 ring-surface"
                    />
                    <p className="text-sm text-heading">
                      {ORDER_STATUS_LABELS[event.toStatus as OrderStatus] ?? event.toStatus}
                      {event.fromStatus ? (
                        <span className="text-subtle">
                          {" "}
                          · from{" "}
                          {ORDER_STATUS_LABELS[event.fromStatus as OrderStatus] ?? event.fromStatus}
                        </span>
                      ) : null}
                    </p>
                    {event.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-body">{event.note}</p>
                    ) : null}
                    <p className="mt-1 text-2xs text-subtle">
                      {formatDateTime(event.createdAt)}
                      {event.actorRole ? ` · ${event.actorRole.toLowerCase()}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-body">No status changes recorded yet.</p>
            )}
          </section>
        </div>

        {/* ── Money + actions ──────────────────────────────────────── */}
        <aside className="space-y-6 lg:sticky lg:top-28">
          <Card>
            <CardTitle>Payment</CardTitle>

            <dl className="mt-4 space-y-2.5 text-sm">
              <PayRow label="Subtotal" value={formatMoney(order.subtotalAmount)} />
              {order.discountAmount > 0 ? (
                <PayRow
                  label="Discount"
                  value={`− ${formatMoney(order.discountAmount)}`}
                  tone="success"
                />
              ) : null}
              <PayRow label={`Tax (${order.taxPercent}%)`} value={formatMoney(order.taxAmount)} />
              <div className="border-t border-line pt-3">
                <PayRow label="Total" value={formatMoney(order.totalAmount)} strong />
              </div>
              <div className="border-t border-line pt-3 space-y-2.5">
                <PayRow
                  label="Deposit"
                  value={`${formatMoney(order.depositPaid)} / ${formatMoney(order.depositAmount)}`}
                  note={DEPOSIT_LABEL[order.depositStatus]}
                  noteTone={order.depositStatus === "PAID" ? "success" : "warning"}
                />
                <PayRow
                  label="Balance"
                  value={`${formatMoney(order.balancePaid)} / ${formatMoney(order.balanceAmount)}`}
                  note={BALANCE_LABEL[order.balanceStatus] ?? order.balanceStatus}
                  noteTone={order.balanceStatus === "PAID" ? "success" : undefined}
                />
              </div>
            </dl>

            {order.payments.length ? (
              <ul className="mt-5 space-y-2 border-t border-line pt-4">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-body">
                      {PAYMENT_KIND_LABEL[payment.kind] ?? payment.kind} · {payment.method.toLowerCase()}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum text-heading">{formatMoney(payment.amount)}</span>{" "}
                      <span
                        className={cn(
                          "ml-1",
                          payment.status === "CAPTURED"
                            ? "text-success"
                            : payment.status === "FAILED"
                              ? "text-danger"
                              : "text-subtle",
                        )}
                      >
                        {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 border-t border-line pt-4 text-xs text-subtle">
                No payments recorded yet.
              </p>
            )}
          </Card>

          <Card>
            <CardTitle>Manage</CardTitle>
            <div className="mt-4 space-y-3">
              <Link
                href={`/vendors/${order.vendorProfile.slug}`}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-heading transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                Visit vendor profile
                <ArrowRight className="size-4" />
              </Link>
              {canCancel ? <OrderCancelAction orderId={order.id} /> : null}
            </div>

            <p className="mt-4 flex items-start gap-2 text-2xs leading-relaxed text-subtle">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-accent-muted" />
              Deposits are held by Aurelia and released to the vendor under your agreed terms.
            </p>
          </Card>

          <p className="flex items-start gap-2 text-2xs leading-relaxed text-subtle">
            <MapPin className="mt-px size-3.5 shrink-0" />
            {order.venueLine1 ?? "Venue address is shared once the vendor confirms."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function PayRow({
  label,
  value,
  strong,
  tone,
  note,
  noteTone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "success";
  note?: string;
  noteTone?: "success" | "warning";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("text-body", strong && "font-medium text-heading")}>{label}</dt>
      <dd className="text-right">
        <span
          className={cn(
            "tnum",
            strong && "font-display text-lg font-medium text-heading",
            tone === "success" && "text-success",
          )}
        >
          {value}
        </span>
        {note ? (
          <span
            className={cn(
              "ml-2 text-2xs",
              noteTone === "success" ? "text-success" : noteTone === "warning" ? "text-warning" : "text-subtle",
            )}
          >
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
