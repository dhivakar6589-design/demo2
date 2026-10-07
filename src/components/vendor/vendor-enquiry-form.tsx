"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Envelope {
  ok?: boolean;
  data?: { reference?: string };
  error?: { message?: string; fields?: Record<string, string[]> };
}

/** Server field errors beat the generic message; otherwise use theirs. */
function firstMessage(body: Envelope | null): string | null {
  if (!body) return null;
  const fields = body.error?.fields;
  if (fields) {
    const first = Object.values(fields)[0]?.[0];
    if (first) return first;
  }
  return body.error?.message ?? null;
}

/**
 * Enquiry form.
 *
 * Submits to the quote/enquiry API and reflects the server's state — no local
 * "sent!" fiction. On success it offers the signed-in path forward instead of
 * dumping the user on a dead page.
 */
export function VendorEnquiryForm({
  vendorSlug,
  packageOptions,
}: {
  vendorSlug: string;
  packageOptions: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [reference, setReference] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      vendorSlug,
      packageSlug: String(form.get("packageSlug") ?? ""),
      eventDate: String(form.get("eventDate") ?? ""),
      guestCount: Number(form.get("guestCount") ?? 0),
      eventType: String(form.get("eventType") ?? ""),
      message: String(form.get("message") ?? ""),
      contact: {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
      },
    };

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as Envelope | null;
        setError(firstMessage(body) ?? "We couldn't send that. Please try again.");
        setState("error");
        return;
      }

      const body = (await response.json().catch(() => null)) as Envelope | null;
      setReference(body?.data?.reference ?? null);
      setState("sent");
    } catch {
      setError("Network problem. Please try again.");
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="mt-5 rounded-xl border border-success/30 bg-success-soft p-5 text-center">
        <span className="mx-auto grid size-9 place-items-center rounded-full bg-success text-white">
          <Check className="size-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-heading">Enquiry sent</p>
        <p className="mt-1.5 text-xs text-body">
          {reference ? (
            <>
              Reference <span className="tnum font-medium text-heading">{reference}</span>. The
              vendor usually replies within a day.
            </>
          ) : (
            "The vendor usually replies within a day."
          )}
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/quotes")}>
            Track it in your dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/vendors")}>
            Browse more vendors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-overline mb-1.5 block">Date</span>
          <div className="relative">
            <CalendarDays
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
            />
            <Input type="date" name="eventDate" required className="pl-9" />
          </div>
        </label>
        <label className="block">
          <span className="text-overline mb-1.5 block">Guests</span>
          <div className="relative">
            <Users aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input
              type="number"
              name="guestCount"
              min={10}
              step={10}
              defaultValue={120}
              required
              className="tnum pl-9"
            />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="text-overline mb-1.5 block">Occasion</span>
        <select
          name="eventType"
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm"
        >
          <option value="WEDDING">Wedding</option>
          <option value="CORPORATE">Corporate</option>
          <option value="ANNIVERSARY">Anniversary</option>
          <option value="BIRTHDAY">Birthday</option>
          <option value="CONFERENCE">Conference</option>
        </select>
      </label>

      <label className="block">
        <span className="text-overline mb-1.5 block">
          Package{packageOptions.length ? "" : " (optional)"}
        </span>
        <select name="packageSlug" className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm">
          <option value="">Not sure yet</option>
          {packageOptions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-overline mb-1.5 block">Your details</span>
        <Input name="name" placeholder="Name" required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="phone" placeholder="Phone" required />
      </div>

      <label className="block">
        <span className="sr-only">Message</span>
        <textarea
          name="message"
          rows={3}
          placeholder="Anything the vendor should know — venue, timings, must-have dishes…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
        />
      </label>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={state === "submitting"} aria-busy={state === "submitting"}>
        {state === "submitting" ? (
          <>
            <span className="h-3.5 w-14 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full w-1/2 animate-[sweep_1.1s_ease-in-out_infinite] rounded-full bg-white/80" />
            </span>
            Sending…
          </>
        ) : (
          <>
            <Send className="size-4" />
            Send enquiry
          </>
        )}
      </Button>
      <p className="text-2xs text-subtle">
        No payment now. We share your contact details only with this vendor.
      </p>
    </form>
  );
}