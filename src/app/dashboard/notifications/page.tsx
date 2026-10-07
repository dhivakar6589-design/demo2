import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";
import {
  MarkAllRead,
  NotificationList,
  type NotificationView,
} from "@/components/dashboard/notification-list";
import { EmptyState } from "@/components/ui/feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Quote replies, payment reminders and booking updates.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "All" },
  { key: "unread", label: "Unread" },
] as const;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard/notifications");

  const params = await searchParams;
  const raw = typeof params.filter === "string" ? params.filter.toLowerCase() : "";
  const filter = TABS.some((tab) => tab.key === raw) ? raw : "";
  const unreadOnly = filter === "unread";

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const views: NotificationView[] = items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    href: item.href,
    read: item.readAt !== null,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h2 className="text-display text-2xl">Notifications</h2>
          <p className="mt-2 measure text-sm leading-relaxed text-body">
            Quote replies, payment reminders and booking updates — in the order they happened.
          </p>
        </div>

        {unreadCount > 0 ? <MarkAllRead /> : null}
      </header>

      <nav aria-label="Filter notifications" className="mt-5 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = tab.key === filter;
          return (
            <Link
              key={tab.key || "all"}
              href={tab.key ? `/dashboard/notifications?filter=${tab.key}` : "/dashboard/notifications"}
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
              {tab.key === "unread" && unreadCount ? (
                <span className="tnum ml-1.5 text-subtle">{unreadCount}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {views.length ? (
        <div className="mt-6">
          <NotificationList items={views} />
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          icon={BellRing}
          title={unreadOnly ? "You're all caught up" : "Nothing here yet"}
          description={
            unreadOnly
              ? "Every notification has been read. New activity will show up as it happens."
              : "Quote replies, payment reminders and booking updates land here as they happen."
          }
        />
      )}
    </div>
  );
}
