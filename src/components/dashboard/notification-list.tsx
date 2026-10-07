"use client";

/**
 * The notification inbox as one interactive list.
 *
 * Opening a notification marks it read on the way out (the fetch is fire-and-
 * forget with `keepalive`, so it survives the navigation); the explicit
 * controls mark or dismiss server-side and refresh the server-rendered counts.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CreditCard,
  FileText,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client";
import { cn, relativeTime } from "@/lib/utils";

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

function iconFor(type: string) {
  if (type.startsWith("QUOTE")) return FileText;
  if (type.startsWith("BOOKING")) return CalendarDays;
  if (type.startsWith("PAYMENT") || type.startsWith("REFUND")) return CreditCard;
  if (type.startsWith("REVIEW")) return Star;
  if (type.startsWith("MESSAGE")) return MessageSquare;
  return Bell;
}

export function NotificationList({ items }: { items: NotificationView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const markRead = (id: string) => {
    startTransition(async () => {
      const result = await apiRequest(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });
      if (!result.ok) toast.error(result.message);
      router.refresh();
    });
  };

  const dismiss = (id: string) => {
    startTransition(async () => {
      const result = await apiRequest(`/api/notifications/${id}`, { method: "DELETE" });
      if (!result.ok) toast.error(result.message);
      else toast.success("Notification dismissed.");
      router.refresh();
    });
  };

  /* Opening an unread notification marks it read without waiting — the page is
     about to change anyway. */
  const peek = (item: NotificationView) => {
    if (item.read) return;
    void fetch(`/api/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
      keepalive: true,
    }).catch(() => undefined);
  };

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = iconFor(item.type);

        return (
          <li
            key={item.id}
            className={cn(
              "group relative rounded-2xl border bg-surface transition-colors",
              item.read ? "border-line" : "border-accent/30 bg-accent-soft/40",
            )}
          >
            <div className="flex items-start gap-3.5 p-4 pr-28">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border",
                  item.read
                    ? "border-line bg-surface-raised text-subtle"
                    : "border-accent/40 bg-surface text-accent-muted",
                )}
              >
                <Icon className="size-4" />
              </span>

              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-heading">
                  <span className="truncate">{item.title}</span>
                  {!item.read ? (
                    <span
                      aria-label="Unread"
                      className="size-1.5 shrink-0 rounded-full bg-accent"
                    />
                  ) : null}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-body">{item.body}</p>
                <p className="mt-1.5 text-2xs text-subtle">{relativeTime(item.createdAt)}</p>
              </div>
            </div>

            {item.href ? (
              <Link
                href={item.href}
                onClick={() => peek(item)}
                aria-label={`Open: ${item.title}`}
                className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            ) : null}

            <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
              {!item.read ? (
                <button
                  type="button"
                  onClick={() => markRead(item.id)}
                  disabled={pending}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-2xs font-medium text-body transition-colors hover:border-line-strong hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  Mark read
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                disabled={pending}
                aria-label="Dismiss notification"
                className="grid size-7 place-items-center rounded-full border border-line bg-surface text-subtle transition-colors hover:border-line-strong hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MarkAllRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await apiRequest<{ updated: number }>("/api/notifications/read-all", {
        method: "POST",
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        result.data?.updated
          ? `${result.data.updated} notification${result.data.updated === 1 ? "" : "s"} marked as read.`
          : "You're all caught up.",
      );
      router.refresh();
    });
  };

  return (
    <Button size="sm" variant="outline" loading={pending} onClick={run}>
      <CheckCheck className="size-4" />
      Mark all read
    </Button>
  );
}
