"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/overlays";
import {
  FILTER_CATEGORIES,
  INDIAN_STATES,
  SORT_OPTIONS,
  filtersToQuery,
  paiseToRupees,
  rupeesToPaise,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";

export interface FilterOptions {
  cuisine: { slug: string; label: string }[];
  dietary: { code: string; label: string }[];
}

interface Draft {
  category: string | undefined;
  city: string;
  state: string;
  guests: string;
  date: string;
  dietary: string[];
  cuisine: string[];
  /** Rupees, matching the slider. */
  budget: number[];
  instant: boolean;
  featured: boolean;
}

function clampBudget(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, BUDGET_MIN), BUDGET_MAX);
}

/**
 * Filter controls for the browse page.
 *
 * Reads the current URL and writes the next one. Every change resets `page`
 * to 1, and the panel applies on submit rather than per keystroke so a slider
 * drag doesn't fire a search per frame.
 */
/** Slider bounds in rupees. The URL always carries paise. */
const BUDGET_MIN = 50_000;
const BUDGET_MAX = 5_000_000;

export function FilterPanel({ total, options }: { total: number; options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);

  // Read the URL into a draft the panel can edit freely.
  const fromUrl = React.useCallback((): Draft => {
    const get = (key: string) => one(params.get(key));
    const min = Number(get("minPrice") ?? Number.NaN);
    const max = Number(get("maxPrice") ?? Number.NaN);
    return {
      category: get("category"),
      city: get("city") ?? "",
      state: get("state") ?? "",
      guests: get("guests") ?? "",
      date: get("date") ?? "",
      dietary: list(params.get("dietary")),
      cuisine: list(params.get("cuisine")),
      budget: [
        clampBudget(paiseToRupees(min), BUDGET_MIN),
        clampBudget(paiseToRupees(max), BUDGET_MAX),
      ],
      instant: get("instant") === "1",
      featured: get("featured") === "1",
    };
  }, [params]);

  const [draft, setDraft] = React.useState<Draft>(fromUrl);

  // Back/forward, a filter chip, or "Clear all" all change the URL from
  // outside this component; re-seed the draft so the controls never lie about
  // what is actually being searched.
  React.useEffect(() => {
    setDraft(fromUrl());
  }, [fromUrl]);

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const activeCount =
    (draft.category ? 1 : 0) +
    (draft.city ? 1 : 0) +
    (draft.state ? 1 : 0) +
    (draft.guests ? 1 : 0) +
    (draft.date ? 1 : 0) +
    (draft.instant ? 1 : 0) +
    (draft.featured ? 1 : 0) +
    draft.dietary.length +
    draft.cuisine.length +
    (draft.budget[0] > BUDGET_MIN || draft.budget[1] < BUDGET_MAX ? 1 : 0);

  const apply = React.useCallback(() => {
    const query = filtersToQuery({
      // Carry through anything this panel doesn't own (q, sort, …).
      ...Object.fromEntries(params.entries()),
      category: draft.category || undefined,
      city: draft.city || undefined,
      state: draft.state || undefined,
      guests: draft.guests || undefined,
      date: draft.date || undefined,
      dietary: draft.dietary.length ? draft.dietary : undefined,
      cuisine: draft.cuisine.length ? draft.cuisine : undefined,
      minPrice: rupeesToPaise(draft.budget[0]),
      maxPrice: rupeesToPaise(draft.budget[1]),
      instant: draft.instant ? "1" : "",
      featured: draft.featured ? "1" : "",
    });
    // Any filter change invalidates the current offset — a narrowed result set
    // rarely has a page 4, and an empty one looks like a bug to the user.
    query.delete("page");
    router.push(query.toString() ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router, draft]);

  const clearAll = () => {
    router.push(pathname, { scroll: false });
    setDraft({
      category: undefined,
      city: "",
      state: "",
      guests: "",
      date: "",
      dietary: [],
      cuisine: [],
      budget: [BUDGET_MIN, BUDGET_MAX],
      instant: false,
      featured: false,
    });
  };

  const body = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
        setOpen(false);
      }}
      className="space-y-7"
    >
      <fieldset>
        <legend className="text-overline mb-2.5">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CATEGORIES.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() =>
                patch("category", draft.category === item.slug ? undefined : item.slug)
              }
              aria-pressed={draft.category === item.slug}
              className={cn(
                "rounded-full border px-2.5 py-1 text-2xs transition-colors",
                draft.category === item.slug
                  ? "border-accent bg-accent-soft text-accent-muted"
                  : "border-line text-body hover:border-line-strong",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-overline mb-2.5">Cuisine & style</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.cuisine.map((item) => (
            <Chip
              key={item.slug}
              label={item.label}
              active={draft.cuisine.includes(item.slug)}
              onClick={() => toggle(draft.cuisine, item.slug, (cuisine) => patch("cuisine", cuisine))}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-overline mb-2.5">Dietary</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.dietary.map((item) => (
            <Chip
              key={item.code}
              label={item.label}
              active={draft.dietary.includes(item.code)}
              onClick={() =>
                toggle(draft.dietary, item.code, (dietary) => patch("dietary", dietary))
              }
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3">
        <label className="block">
          <span className="text-overline mb-1.5 block">City</span>
          <input
            value={draft.city}
            onChange={(event) => patch("city", event.target.value)}
            placeholder="Mumbai"
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-overline mb-1.5 block">State</span>
          <select
            value={draft.state}
            onChange={(event) => patch("state", event.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
          >
            <option value="">Anywhere</option>
            {INDIAN_STATES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-overline mb-1.5 block">Guests</span>
            <input
              type="number"
              min={10}
              step={10}
              value={draft.guests}
              onChange={(event) => patch("guests", event.target.value)}
              placeholder="120"
              className="tnum h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-overline mb-1.5 block">Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => patch("date", event.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            />
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="text-overline mb-3">
          Budget · {formatBudget(draft.budget[0])} – {formatBudget(draft.budget[1])}
        </legend>
        <Slider
          value={draft.budget}
          onValueChange={(value) => patch("budget", value)}
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={50_000}
          minStepsBetweenThumbs={4}
          aria-label="Budget range in rupees"
        />
      </fieldset>

      <div className="space-y-2">
        <Toggle
          checked={draft.instant}
          onChange={(value) => patch("instant", value)}
          label="Instant booking only"
          hint="Book and pay without waiting for approval"
        />
        <Toggle
          checked={draft.featured}
          onChange={(value) => patch("featured", value)}
          label="Curated picks only"
          hint="Reviewed by the Aurelia curation team"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          Show {total} results
        </Button>
        {activeCount ? (
          <Button type="button" variant="ghost" onClick={clearAll} aria-label="Clear filters">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </form>
  );

  return (
    <>
      {/* Desktop: a persistent rail. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-base font-medium text-heading">Refine</h2>
          <p className="mt-1 mb-6 text-2xs text-subtle">{total} vendors match</p>
          {body}
        </div>
      </aside>

      {/* Mobile: a sheet, so filters never eat the results on a phone. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="lg:hidden">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeCount ? (
              <Badge tone="gold" size="xs">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </DialogTrigger>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Refine results</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{body}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SortSelect({ current }: { current?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="relative">
      <label htmlFor="sort" className="sr-only">
        Sort results
      </label>
      <select
        id="sort"
        value={current ?? "relevance"}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value === "relevance") next.delete("sort");
          else next.set("sort", event.target.value);
          next.delete("page");
          router.push(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
        }}
        className="h-10 appearance-none rounded-lg border border-line bg-surface py-0 pl-3 pr-9 text-sm text-body transition-colors hover:border-line-strong"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
      />
    </div>
  );
}

export function ActiveFilterChips({
  options,
}: {
  options?: Pick<FilterOptions, "cuisine" | "dietary">;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const chips: { key: string; label: string }[] = [];
  const q = one(params.get("q"));
  if (q) chips.push({ key: "q", label: `“${q}”` });
  const category = one(params.get("category"));
  if (category) {
    const match = FILTER_CATEGORIES.find((c) => c.slug === category);
    chips.push({ key: "category", label: match?.name ?? category });
  }
  const city = one(params.get("city"));
  if (city) chips.push({ key: "city", label: city });
  const state = one(params.get("state"));
  if (state) chips.push({ key: "state", label: state });
  const guests = one(params.get("guests"));
  if (guests) chips.push({ key: "guests", label: `${guests} guests` });
  const date = one(params.get("date"));
  if (date) chips.push({ key: "date", label: formatDay(date) });

  // Show the curated label (e.g. "Vegetarian"), never the raw slug/code.
  for (const [key, lookup] of [
    ["dietary", options?.dietary],
    ["cuisine", options?.cuisine],
  ] as const) {
    for (const value of list(params.get(key))) {
      const label =
        lookup?.find((entry) => ("code" in entry ? entry.code : entry.slug) === value)?.label ??
        value;
      chips.push({ key: `${key}:${value}`, label });
    }
  }

  if (params.get("instant") === "1") chips.push({ key: "instant", label: "Instant book" });
  if (params.get("featured") === "1") chips.push({ key: "featured", label: "Curated" });

  const min = paiseToRupees(params.get("minPrice") ?? undefined);
  const max = paiseToRupees(params.get("maxPrice") ?? undefined);
  if (min !== undefined || max !== undefined) {
    const low = min ?? BUDGET_MIN;
    const high = max ?? BUDGET_MAX;
    // The slider bounds are the default, so only advertise a chip when the
    // search is actually narrower than "any budget".
    if (low > BUDGET_MIN || high < BUDGET_MAX) {
      chips.push({ key: "budget", label: `${formatBudget(low)}–${formatBudget(high)}` });
    }
  }

  if (!chips.length) return null;

  const remove = (chip: { key: string; label: string }) => {
    const next = new URLSearchParams(params.toString());
    if (chip.key.includes(":")) {
      const [group, value] = chip.key.split(":");
      const kept = list(next.get(group)).filter((entry) => entry !== value);
      if (kept.length) next.set(group, kept.join(","));
      else next.delete(group);
    } else if (chip.key === "budget") {
      next.delete("minPrice");
      next.delete("maxPrice");
    } else {
      next.delete(chip.key);
    }
    next.delete("page");
    router.push(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => remove(chip)}
            className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-body transition-colors hover:border-danger/40 hover:text-danger"
          >
            {chip.label}
            <X className="size-3 opacity-50 transition-opacity group-hover:opacity-100" />
          </button>
        </li>
      ))}
      <li>
        <Link
          href={pathname}
          className="px-1.5 text-2xs text-subtle underline-offset-2 hover:underline"
        >
          Clear all
        </Link>
      </li>
    </ul>
  );
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const params = useSearchParams();
  const pathname = usePathname();

  const href = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    return `${pathname}${next.toString() ? `?${next}` : ""}`;
  };

  const window = 2;
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= window) pages.push(i);
  }

  // Hooks must run unconditionally, so the single-page case returns after them.
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      <PageLink href={href(Math.max(page - 1, 1))} disabled={page === 1}>
        Previous
      </PageLink>
      {pages.map((target, index) => {
        const previous = pages[index - 1];
        return (
          <React.Fragment key={target}>
            {previous !== undefined && target - previous > 1 ? (
              <span className="px-1 text-subtle">…</span>
            ) : null}
            <PageLink href={href(target)} current={target === page}>
              {target}
            </PageLink>
          </React.Fragment>
        );
      })}
      <PageLink href={href(Math.min(page + 1, totalPages))} disabled={page === totalPages}>
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "tnum grid h-9 min-w-9 place-items-center rounded-lg border px-2.5 text-sm transition-colors",
    current
      ? "border-transparent bg-primary text-primary-foreground"
      : "border-line bg-surface text-body hover:border-line-strong",
    disabled && "pointer-events-none opacity-40",
  );
  return (
    <Link href={href} scroll={false} className={className} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

/* ─────────────────────────────── Bits ───────────────────────────────────── */

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-2xs transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent-muted"
          : "border-line text-body hover:border-line-strong",
      )}
    >
      {label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked ? "border-accent/50 bg-accent-soft/40" : "border-line hover:border-line-strong",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--accent))]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-heading">{label}</span>
        <span className="block text-2xs text-subtle">{hint}</span>
      </span>
    </label>
  );
}

function toggle(current: string[], value: string, commit: (next: string[]) => void) {
  commit(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
}

/** Rupees on the slider; abbreviated so the legend never wraps mid-number. */
export function formatBudget(value: number) {
  if (value >= 1_000_000) return `₹${(value / 100_000).toFixed(value % 100_000 ? 1 : 0)}L`;
  if (value >= 100_000) return `₹${Math.round(value / 100_000)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function one(value: string | null | undefined) {
  return value?.trim() || undefined;
}

function list(value: string | null | undefined) {
  return value ? value.split(",").filter(Boolean) : [];
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}