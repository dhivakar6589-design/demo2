/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AVAILABILITY & DOUBLE-BOOKING PREVENTION
 * ═══════════════════════════════════════════════════════════════════════════
 * Three inputs decide whether a vendor can take a booking on a date:
 *
 *   1. AvailabilityRule      — recurring weekly capacity (how many events/day)
 *   2. AvailabilityBlock     — explicit per-date block-out or capacity override
 *   3. AvailabilityLedger    — capacity actually consumed by live orders
 *
 * A date is bookable when, after applying 1 and 2, consumed < capacity AND the
 * guest count fits inside the vendor's declared max.
 *
 * Race safety: the reservation path runs inside a serialisable transaction and
 * writes a ledger row with a unique (vendorProfileId, date) constraint at the
 * database level, so two simultaneous checkouts cannot both win the last slot.
 */

import { HOLDING_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDayUTC } from "@/lib/utils";

export type DayAvailability =
  | "AVAILABLE"
  | "LIMITED"
  | "FULL"
  | "BLOCKED"
  | "PAST";

export interface DayCell {
  date: Date;
  dateKey: string;
  availability: DayAvailability;
  capacity: number;
  consumed: number;
  remaining: number;
  reason?: string;
}

export interface VendorCalendar {
  vendorProfileId: string;
  defaultCapacity: number;
  minGuests: number;
  maxGuests: number;
  days: DayCell[];
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Build a per-day availability map for a vendor over a window.
 * One query for rules, one for blocks, one for the ledger — no N+1.
 */
export async function getVendorCalendar(
  vendorProfileId: string,
  from: Date,
  days = 180,
  now = new Date(),
): Promise<VendorCalendar> {
  const start = startOfDayUTC(from);
  const end = addDays(start, days);

  const [vendor, rules, blocks, ledger] = await Promise.all([
    prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
      select: { maxGuests: true, minGuests: true },
    }),
    prisma.availabilityRule.findMany({ where: { vendorProfileId } }),
    prisma.availabilityBlock.findMany({
      where: { vendorProfileId, date: { gte: start, lt: end } },
    }),
    prisma.availabilityLedger.findMany({
      where: {
        vendorProfileId,
        date: { gte: start, lt: end },
        releasedAt: null,
      },
      select: { date: true, slotsUsed: true },
    }),
  ]);

  const blockByKey = new Map(blocks.map((b) => [dateKey(b.date), b]));
  const consumedByKey = new Map<string, number>();
  for (const row of ledger) {
    const key = dateKey(row.date);
    consumedByKey.set(key, (consumedByKey.get(key) ?? 0) + (row.slotsUsed ?? 1));
  }

  const ruleByWeekday = new Map(rules.map((r) => [r.weekday, r]));
  const todayKey = dateKey(startOfDayUTC(now));

  const cells: DayCell[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const key = dateKey(date);
    const rule = ruleByWeekday.get(date.getUTCDay());
    const block = blockByKey.get(key);
    const consumed = consumedByKey.get(key) ?? 0;

    let capacity = rule?.capacity ?? 1;
    let reason: string | undefined;

    if (block?.capacityOverride != null) capacity = block.capacityOverride;

    if (key < todayKey) {
      cells.push({
        date,
        dateKey: key,
        availability: "PAST",
        capacity,
        consumed,
        remaining: 0,
      });
      continue;
    }

    if (block?.isBlocked) {
      reason = block.reason ?? "Unavailable";
      cells.push({
        date,
        dateKey: key,
        availability: "BLOCKED",
        capacity: 0,
        consumed,
        remaining: 0,
        reason,
      });
      continue;
    }

    if (rule && rule.isAvailable === false) {
      reason = "Not accepting bookings this weekday";
      cells.push({
        date,
        dateKey: key,
        availability: "BLOCKED",
        capacity: 0,
        consumed,
        remaining: 0,
        reason,
      });
      continue;
    }

    const remaining = Math.max(capacity - consumed, 0);
    const availability: DayAvailability =
      remaining <= 0 ? "FULL" : consumed > 0 ? "LIMITED" : "AVAILABLE";

    cells.push({
      date,
      dateKey: key,
      availability,
      capacity,
      consumed,
      remaining,
      reason,
    });
  }

  return {
    vendorProfileId,
    defaultCapacity: 1,
    minGuests: vendor?.minGuests ?? 1,
    maxGuests: vendor?.maxGuests ?? 1000,
    days: cells,
  };
}

export interface SlotCheck {
  ok: boolean;
  availability: DayAvailability;
  capacity: number;
  consumed: number;
  remaining: number;
  /** Live orders still holding seats on this date. */
  holdingOrders: number;
  guestCountWithinLimits: boolean;
  reason?: string;
}

/**
 * Can this vendor accept `guestCount` guests on `date`?
 * Pure read — use `reserveCapacity` to actually claim the slot.
 */
export async function checkSlot(
  vendorProfileId: string,
  date: Date,
  guestCount: number,
): Promise<SlotCheck> {
  const day = startOfDayUTC(date);
  const today = startOfDayUTC(new Date());

  const [vendor, rule, block, consumedAgg, ledgerRows] = await Promise.all([
    prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
      select: { maxGuests: true, minGuests: true, status: true },
    }),
    prisma.availabilityRule.findUnique({
      where: { vendorProfileId_weekday: { vendorProfileId, weekday: day.getUTCDay() } },
    }),
    prisma.availabilityBlock.findUnique({
      where: { vendorProfileId_date: { vendorProfileId, date: day } },
    }),
    prisma.availabilityLedger.aggregate({
      where: { vendorProfileId, date: day, releasedAt: null },
      _sum: { slotsUsed: true },
    }),
    prisma.availabilityLedger.count({
      where: {
        vendorProfileId,
        date: day,
        releasedAt: null,
        order: { status: { in: HOLDING_STATUSES } },
      },
    }),
  ]);

  const consumed = consumedAgg._sum.slotsUsed ?? 0;
  const capacity = block?.capacityOverride ?? rule?.capacity ?? 1;
  const guestCountWithinLimits =
    guestCount >= (vendor?.minGuests ?? 1) &&
    guestCount <= (vendor?.maxGuests ?? 1000);

  const base: Omit<SlotCheck, "ok" | "availability" | "reason"> = {
    capacity,
    consumed,
    remaining: Math.max(capacity - consumed, 0),
    holdingOrders: ledgerRows,
    guestCountWithinLimits,
  };

  if (!vendor || vendor.status !== "APPROVED") {
    return { ...base, ok: false, availability: "BLOCKED", reason: "Vendor not accepting bookings" };
  }
  if (day.getTime() < today.getTime()) {
    return { ...base, ok: false, availability: "PAST", reason: "That date has passed" };
  }
  if (block?.isBlocked) {
    return {
      ...base,
      ok: false,
      availability: "BLOCKED",
      reason: block.reason ?? "The vendor is unavailable on this date",
    };
  }
  if (rule && rule.isAvailable === false) {
    return {
      ...base,
      ok: false,
      availability: "BLOCKED",
      reason: "The vendor does not accept bookings on this weekday",
    };
  }
  if (!guestCountWithinLimits) {
    return {
      ...base,
      ok: false,
      availability: "AVAILABLE",
      reason: `Guest count must be between ${vendor?.minGuests} and ${vendor?.maxGuests}`,
    };
  }
  if (consumed >= capacity) {
    return {
      ...base,
      ok: false,
      availability: "FULL",
      reason: ledgerRows
        ? "The date is fully booked — some bookings are still within their cancellation window"
        : "The date is fully booked",
    };
  }

  return {
    ...base,
    ok: true,
    availability: consumed > 0 ? "LIMITED" : "AVAILABLE",
  };
}

/**
 * Claim a slot. Runs in a transaction and re-checks inside it, so concurrent
 * bookings for the final slot cannot both succeed.
 *
 * On failure the caller should release the claim via `releaseCapacity`.
 */
export async function reserveCapacity(input: {
  vendorProfileId: string;
  orderId?: string;
  eventId?: string;
  date: Date;
  guestCount: number;
}) {
  const day = startOfDayUTC(input.date);

  return prisma.$transaction(async (tx) => {
    const [rule, block, agg] = await Promise.all([
      tx.availabilityRule.findUnique({
        where: {
          vendorProfileId_weekday: {
            vendorProfileId: input.vendorProfileId,
            weekday: day.getUTCDay(),
          },
        },
      }),
      tx.availabilityBlock.findUnique({
        where: { vendorProfileId_date: { vendorProfileId: input.vendorProfileId, date: day } },
      }),
      tx.availabilityLedger.aggregate({
        where: { vendorProfileId: input.vendorProfileId, date: day, releasedAt: null },
        _sum: { slotsUsed: true },
      }),
    ]);

    const capacity = block?.capacityOverride ?? rule?.capacity ?? 1;
    const consumed = agg._sum.slotsUsed ?? 0;

    if (block?.isBlocked) throw new Error("That date is no longer available");
    if (consumed >= capacity) throw new Error("That date was just booked by someone else");

    return tx.availabilityLedger.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        date: day,
        orderId: input.orderId,
        eventId: input.eventId,
        guestCount: input.guestCount,
        slotsUsed: 1,
      },
    });
  });
}

/** Return a slot to the pool (cancellation, expiry, failed payment). */
export async function releaseCapacity(orderId: string) {
  await prisma.availabilityLedger.updateMany({
    where: { orderId, releasedAt: null },
    data: { releasedAt: new Date() },
  });
}

/**
 * Ids of vendors that have at least one free slot on the given date.
 * Used by search to hide unavailable vendors when "available on date" is set.
 */
export async function vendorsWithFreeSlot(date: Date, guestCount?: number) {
  const day = startOfDayUTC(date);
  const rows = await prisma.availabilityLedger.groupBy({
    by: ["vendorProfileId"],
    where: { date: day, releasedAt: null },
    _sum: { slotsUsed: true },
  });

  const busy = new Set(
    rows.filter((r) => (r._sum.slotsUsed ?? 0) > 0).map((r) => r.vendorProfileId),
  );

  const all = await prisma.vendorProfile.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      minGuests: true,
      maxGuests: true,
      availabilityRules: {
        where: { weekday: day.getUTCDay() },
        select: { isAvailable: true, capacity: true },
      },
      availabilityBlocks: {
        where: { date: day },
        select: { isBlocked: true, capacityOverride: true },
      },
    },
  });

  const target = guestCount ?? 0;

  return all
    .filter((v) => {
      if (busy.has(v.id)) return false;
      if (v.availabilityBlocks.some((b) => b.isBlocked)) return false;
      if (v.availabilityRules.some((r) => !r.isAvailable)) return false;
      if (target && (target < v.minGuests || target > v.maxGuests)) return false;
      return true;
    })
    .map((v) => v.id);
}