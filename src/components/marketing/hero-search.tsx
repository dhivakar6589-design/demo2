"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlays";
import { Slider } from "@/components/ui/slider";
import { CATEGORY_NAV, INDIAN_STATES } from "@/lib/constants";
import { toMinor } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Hero search.
 *
 * Progressive disclosure: the three highest-intent inputs (what, where, when)
 * sit on the surface; everything else lives behind "More filters" so the panel
 * doesn't read as a form dump. State is a URL query on submit — the results
 * page stays shareable and cacheable.
 */
export function HeroSearch() {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [city, setCity] = React.useState("");
  const [date, setDate] = React.useState("");
  const [guests, setGuests] = React.useState(120);
  const [state, setState] = React.useState("");
  // Rupees here, minor units on the wire — one conversion, at submit time.
  const [budget, setBudget] = React.useState([150_000, 2_500_000]);

  const submit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (city.trim()) params.set("city", city.trim());
      if (date) params.set("date", date);
      if (guests) params.set("guests", String(guests));
      if (state) params.set("state", state);
      if (budget[0] || budget[1]) {
        params.set("minPrice", String(toMinor(budget[0])));
        params.set("maxPrice", String(toMinor(budget[1])));
      }
      router.push(`/vendors${params.toString() ? `?${params}` : ""}`);
    },
    [q, category, city, date, guests, state, budget, router],
  );

  return (
    <div className="glass rounded-2xl p-2 shadow-2xl">
      <form onSubmit={submit} className="grid gap-2 lg:grid-cols-[1.15fr_1fr_0.85fr_auto]">
        <Field icon={Search} label="What are you planning?">
          <Input
            name="q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Try “live counters” or “destination wedding”"
            aria-label="What are you planning"
            className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
        </Field>

        <Field icon={MapPin} label="Where?">
          <Input
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Mumbai"
            aria-label="City"
            list="aurelia-cities"
            className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <datalist id="aurelia-cities">
            {["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Chennai", "Delhi NCR", "Kolkata"].map(
              (name) => (
                <option key={name} value={name} />
              ),
            )}
          </datalist>
        </Field>

        <Field icon={CalendarDays} label="When?">
          <Input
            type="date"
            name="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Event date"
            className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
        </Field>

        <div className="flex items-stretch gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="h-11 shrink-0 rounded-xl px-3.5"
          >
            <Users className="size-4" />
            <span className="tnum">{guests}</span>
            <span className="sr-only">Change filters</span>
          </Button>
          <Button type="submit" size="lg" className="h-11 rounded-xl px-6">
            <Search className="size-4" />
            Search
          </Button>
        </div>
      </form>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
        <span className="text-overline">Popular</span>
        {CATEGORY_NAV.slice(0, 5).map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => {
              setCategory(item.slug);
              router.push(`/vendors?category=${item.slug}`);
            }}
            className="rounded-full border border-line px-2.5 py-1 text-2xs text-body transition-colors hover:border-accent/40 hover:text-accent-muted"
          >
            {item.label}
          </button>
        ))}
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Refine your search</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setFiltersOpen(false);
              submit(event);
            }}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5"
          >
            <fieldset>
              <legend className="text-overline mb-2.5">Category</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_NAV.map((item) => (
                  <label
                    key={item.slug}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors",
                      category === item.slug
                        ? "border-accent bg-accent-soft text-accent-muted"
                        : "border-line text-body hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={item.slug}
                      checked={category === item.slug}
                      onChange={() => setCategory(category === item.slug ? "" : item.slug)}
                      className="sr-only"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="hero-state" className="text-overline mb-2 block">
                State
              </label>
              <select
                id="hero-state"
                value={state}
                onChange={(event) => setState(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-heading"
              >
                <option value="">Anywhere in India</option>
                {INDIAN_STATES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-overline mb-3">Guest count</legend>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={20}
                  max={1500}
                  step={10}
                  value={guests}
                  onChange={(event) => setGuests(Number(event.target.value))}
                  aria-label="Guest count"
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunken accent-[hsl(var(--accent))]"
                />
                <span className="tnum w-16 text-right font-display text-lg text-heading">
                  {guests}
                </span>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-overline mb-3">
                Budget · {formatRupees(budget[0])} to {formatRupees(budget[1])}
              </legend>
              <Slider
                value={budget}
                onValueChange={setBudget}
                min={50_000}
                max={10_000_000}
                step={50_000}
                minStepsBetweenThumbs={8}
                aria-label="Budget range in rupees"
              />
            </fieldset>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setCategory("");
                  setCity("");
                  setDate("");
                  setState("");
                  setGuests(120);
                  setBudget([150_000, 2_500_000]);
                }}
              >
                Reset
              </Button>
              <Button type="submit">Apply filters</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Budget slider values are rupees; abbreviate above a lakh so the legend fits. */
function formatRupees(value: number) {
  if (value >= 10_000_000) return `₹${Math.round(value / 100_000) / 10}L`;
  if (value >= 100_000) return `₹${Math.round(value / 100_000)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-transparent px-3.5 py-2 transition-colors focus-within:border-line-strong focus-within:bg-surface/70">
      <Icon className="size-4 shrink-0 text-accent-muted" />
      <div className="min-w-0 flex-1">
        <label className="block text-2xs font-medium uppercase tracking-[0.14em] text-subtle">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}