/**
 * Domain vocabulary.
 *
 * These are the single source of truth for every enum-like value in the
 * database. Columns are stored as `String` (rather than native Postgres enums)
 * so the exact same model runs on SQLite for local development; see the
 * portability contract at the top of prisma/schema.prisma and the migration
 * recipe in docs/SCHEMA.md.
 *
 * Each entry follows the pattern:
 *   const X = list({ ... })                     // the persisted value
 *   type X  = (typeof X)[keyof typeof X]        // the compile-time union
 *
 * `list` takes a `const` type parameter so the object's values infer as string
 * literals. Without it the constraint widens them to `string` and every derived
 * union collapses — which then makes things like
 * Extract<QuoteStatus, "ACCEPTED"> silently resolve to `never`.
 */

const list = <const T extends Record<string, string>>(o: T) => o;

/* ───────────────────────────── Identity ────────────────────────────────── */

export const Role = list({
  CUSTOMER: "CUSTOMER",
  VENDOR: "VENDOR",
  ADMIN: "ADMIN",
});
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = list({
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
});
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/* ──────────────────────────── Catalogue ───────────────────────────────── */

export const VendorStatus = list({
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
});
export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];

export const PricingModel = list({
  PER_PLATE: "PER_PLATE",
  PER_EVENT: "PER_EVENT",
  BOTH: "BOTH",
});
export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel];

export const PackageKind = list({
  PACKAGE: "PACKAGE",
  MENU: "MENU",
  SERVICE: "SERVICE",
});
export type PackageKind = (typeof PackageKind)[keyof typeof PackageKind];

export const StaffRole = list({
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  FINANCE: "FINANCE",
});
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

/** Capability keys understood by the vendor RBAC guard. */
export const StaffPermission = list({
  LISTINGS_WRITE: "LISTINGS_WRITE",
  MENU_WRITE: "MENU_WRITE",
  AVAILABILITY_WRITE: "AVAILABILITY_WRITE",
  QUOTES_READ: "QUOTES_READ",
  QUOTES_WRITE: "QUOTES_WRITE",
  ORDERS_READ: "ORDERS_READ",
  ORDERS_WRITE: "ORDERS_WRITE",
  MESSAGES_READ: "MESSAGES_READ",
  MESSAGES_WRITE: "MESSAGES_WRITE",
  PAYOUTS_READ: "PAYOUTS_READ",
  REPORTS_READ: "REPORTS_READ",
  TEAM_WRITE: "TEAM_WRITE",
  SETTINGS_WRITE: "SETTINGS_WRITE",
});
export type StaffPermission = (typeof StaffPermission)[keyof typeof StaffPermission];

export const STAFF_ROLE_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  MANAGER: Object.values(StaffPermission) as StaffPermission[],
  FINANCE: [
    StaffPermission.PAYOUTS_READ,
    StaffPermission.ORDERS_READ,
    StaffPermission.REPORTS_READ,
    StaffPermission.QUOTES_READ,
  ],
  STAFF: [
    StaffPermission.ORDERS_READ,
    StaffPermission.ORDERS_WRITE,
    StaffPermission.MESSAGES_READ,
    StaffPermission.MESSAGES_WRITE,
    StaffPermission.AVAILABILITY_WRITE,
  ],
};

/* ───────────────────────── Dietary & tags ─────────────────────────────── */

export const DietaryCode = list({
  VEG: "VEG",
  VEGETARIAN: "VEGETARIAN",
  VEGAN: "VEGAN",
  JAIN: "JAIN",
  HALAL: "HALAL",
  KOSHER: "KOSHER",
  GLUTEN_FREE: "GLUTEN_FREE",
  DAIRY_FREE: "DAIRY_FREE",
  NUT_FREE: "NUT_FREE",
  PESCATARIAN: "PESCATARIAN",
});
export type DietaryCode = (typeof DietaryCode)[keyof typeof DietaryCode];

export const DIETARY_LABELS: Record<DietaryCode, string> = {
  VEG: "Vegetarian",
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  JAIN: "Jain",
  HALAL: "Halal",
  KOSHER: "Kosher",
  GLUTEN_FREE: "Gluten free",
  DAIRY_FREE: "Dairy free",
  NUT_FREE: "Nut free",
  PESCATARIAN: "Pescatarian",
};

export const TagKind = list({
  CUISINE: "CUISINE",
  STYLE: "STYLE",
  FEATURE: "FEATURE",
  GENERAL: "GENERAL",
});
export type TagKind = (typeof TagKind)[keyof typeof TagKind];

/* ────────────────────────────── Events ────────────────────────────────── */

export const EventType = list({
  WEDDING: "WEDDING",
  RECEPTION: "RECEPTION",
  CORPORATE: "CORPORATE",
  CONFERENCE: "CONFERENCE",
  BIRTHDAY: "BIRTHDAY",
  ANNIVERSARY: "ANNIVERSARY",
  ENGAGEMENT: "ENGAGEMENT",
  BABY_SHOWER: "BABY_SHOWER",
  FAREWELL: "FAREWELL",
  OTHER: "OTHER",
});
export type EventType = (typeof EventType)[keyof typeof EventType];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  WEDDING: "Wedding",
  RECEPTION: "Reception",
  CORPORATE: "Corporate",
  CONFERENCE: "Conference",
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  ENGAGEMENT: "Engagement",
  BABY_SHOWER: "Baby shower",
  FAREWELL: "Farewell",
  OTHER: "Other",
};

export const EventStatus = list({
  PLANNING: "PLANNING",
  QUOTED: "QUOTED",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

/* ────────────────────────────── Quotes ────────────────────────────────── */

export const QuoteStatus = list({
  DRAFT: "DRAFT",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  WITHDRAWN: "WITHDRAWN",
});
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting reply",
  ACCEPTED: "Accepted",
  REJECTED: "Declined",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};

export const QUOTE_STATUS_TONE: Record<
  QuoteStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "neutral",
  WITHDRAWN: "neutral",
};

/* ────────────────────────────── Orders ────────────────────────────────── */

export const OrderStatus = list({
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  IN_PREPARATION: "IN_PREPARATION",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  DISPUTED: "DISPUTED",
});
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Ordered lifecycle used for progress indicators. */
export const ORDER_FLOW: OrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PREPARATION",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting deposit",
  CONFIRMED: "Confirmed",
  IN_PREPARATION: "In preparation",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
  DISPUTED: "In dispute",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "info",
  IN_PREPARATION: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  REFUNDED: "danger",
  PARTIALLY_REFUNDED: "danger",
  DISPUTED: "danger",
};

/** Statuses that still hold capacity against a vendor's calendar. */
export const HOLDING_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PREPARATION",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DISPUTED",
];

export const TERMINAL_STATUSES: OrderStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

export const PAYMENT_KIND = list({
  DEPOSIT: "DEPOSIT",
  BALANCE: "BALANCE",
  REFUND: "REFUND",
});
export type PaymentKind = (typeof PAYMENT_KIND)[keyof typeof PAYMENT_KIND];

export const PAYMENT_STATUS = list({
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
});
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYOUT_STATUS = list({
  SCHEDULED: "SCHEDULED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  HELD: "HELD",
  REVERSED: "REVERSED",
});
export type PayoutStatus = (typeof PAYOUT_STATUS)[keyof typeof PAYOUT_STATUS];

/* ──────────────────────────── Reputation ──────────────────────────────── */

export const ReviewStatus = list({
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  FLAGGED: "FLAGGED",
  HIDDEN: "HIDDEN",
  REJECTED: "REJECTED",
});
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const DisputeReason = list({
  NO_SHOW: "NO_SHOW",
  QUALITY: "QUALITY",
  OVERCHARGE: "OVERCHARGE",
  MISSED_ITEM: "MISSED_ITEM",
  LATE: "LATE",
  OTHER: "OTHER",
});
export type DisputeReason = (typeof DisputeReason)[keyof typeof DisputeReason];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  NO_SHOW: "Vendor did not show",
  QUALITY: "Service quality",
  OVERCHARGE: "Charged over agreed price",
  MISSED_ITEM: "Missing items",
  LATE: "Delivered late",
  OTHER: "Other",
};

export const DisputeStatus = list({
  OPEN: "OPEN",
  IN_REVIEW: "IN_REVIEW",
  RESOLVED_REFUND: "RESOLVED_REFUND",
  RESOLVED_RELEASE: "RESOLVED_RELEASE",
  REJECTED: "REJECTED",
});
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

/* ─────────────────────────── Notifications ────────────────────────────── */

export const NotificationType = list({
  QUOTE_NEW: "QUOTE_NEW",
  QUOTE_ACCEPTED: "QUOTE_ACCEPTED",
  QUOTE_DECLINED: "QUOTE_DECLINED",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_DUE: "PAYMENT_DUE",
  REFUND_PROCESSED: "REFUND_PROCESSED",
  EVENT_REMINDER_7D: "EVENT_REMINDER_7D",
  EVENT_REMINDER_1D: "EVENT_REMINDER_1D",
  ORDER_STATUS: "ORDER_STATUS",
  REVIEW_REQUEST: "REVIEW_REQUEST",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  VENDOR_APPROVED: "VENDOR_APPROVED",
  VENDOR_REJECTED: "VENDOR_REJECTED",
  DISPUTE_OPENED: "DISPUTE_OPENED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  PAYOUT_SENT: "PAYOUT_SENT",
  MESSAGE_NEW: "MESSAGE_NEW",
});
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationChannel = list({
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
});
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

/* ─────────────────────────────── Coupons ───────────────────────────────── */

export const DiscountType = list({
  PERCENT: "PERCENT",
  FIXED: "FIXED",
});
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

/* ────────────────────────── Refund policy ─────────────────────────────── */

/**
 * Time-based refund tiers, evaluated from the event date.
 * `minDaysBefore` is inclusive: a cancellation 21 days out or earlier
 * qualifies for `percentRefund` of the amount paid to date.
 */
export interface RefundTier {
  minDaysBefore: number;
  percentRefund: number;
  label: string;
  note: string;
}

export const DEFAULT_REFUND_TIERS: RefundTier[] = [
  {
    minDaysBefore: 21,
    percentRefund: 90,
    label: "21+ days before",
    note: "90% refunded — vendor has full time to rebook the date.",
  },
  {
    minDaysBefore: 14,
    percentRefund: 75,
    label: "14–20 days before",
    note: "75% refunded — 25% retained as lost-margin compensation.",
  },
  {
    minDaysBefore: 7,
    percentRefund: 50,
    label: "7–13 days before",
    note: "50% refunded — staffing and procurement are already committed.",
  },
  {
    minDaysBefore: 3,
    percentRefund: 25,
    label: "3–6 days before",
    note: "25% refunded — final week costs are largely non-recoverable.",
  },
  {
    minDaysBefore: 0,
    percentRefund: 0,
    label: "Inside 72 hours",
    note: "No refund — the booking slot is consumed and ingredients ordered.",
  },
];

/* ───────────────────────────── Platform ───────────────────────────────── */

export const SettingKey = list({
  COMMISSION_DEFAULT: "commerce.commission_default",
  COMMISSION_MIN: "commerce.commission_min",
  COMMISSION_MAX: "commerce.commission_max",
  DEPOSIT_DEFAULT: "commerce.deposit_default",
  TAX_DEFAULT: "commerce.tax_default",
  PAYOUT_LAG_DAYS: "payouts.lag_days",
  PAYOUT_MIN_THRESHOLD: "payouts.min_threshold",
  REFUND_TIERS: "policy.refund_tiers",
  BOOKING_WINDOW_DAYS: "policy.booking_window_days",
  AUTO_APPROVE_VENDORS: "policy.auto_approve_vendors",
  REVIEW_MODERATION: "policy.review_moderation",
  PLATFORM_NAME: "brand.platform_name",
  SUPPORT_EMAIL: "brand.support_email",
});
export type SettingKey = (typeof SettingKey)[keyof typeof SettingKey];

/** Default platform configuration, mirrored into PlatformSetting on seed. */
export const PLATFORM_DEFAULTS: Record<string, { value: unknown; type: string; label: string; group: string; description: string }> = {
  [SettingKey.COMMISSION_DEFAULT]: {
    value: 12,
    type: "number",
    label: "Default commission",
    group: "commerce",
    description: "Platform take rate applied when a vendor has no override, in percent.",
  },
  [SettingKey.COMMISSION_MIN]: {
    value: 5,
    type: "number",
    label: "Minimum commission",
    group: "commerce",
    description: "Floor enforced when an admin lowers a vendor rate.",
  },
  [SettingKey.COMMISSION_MAX]: {
    value: 30,
    type: "number",
    label: "Maximum commission",
    group: "commerce",
    description: "Ceiling enforced when an admin raises a vendor rate.",
  },
  [SettingKey.DEPOSIT_DEFAULT]: {
    value: 30,
    type: "number",
    label: "Default deposit",
    group: "commerce",
    description: "Advance deposit percentage required to confirm a booking.",
  },
  [SettingKey.TAX_DEFAULT]: {
    value: 18,
    type: "number",
    label: "Default tax rate",
    group: "commerce",
    description: "GST percentage applied intra-state (CGST + SGST).",
  },
  [SettingKey.PAYOUT_LAG_DAYS]: {
    value: 3,
    type: "number",
    label: "Payout lag",
    group: "payouts",
    description: "Days after an event completes before funds are released to the vendor.",
  },
  [SettingKey.PAYOUT_MIN_THRESHOLD]: {
    value: 100000,
    type: "number",
    label: "Minimum payout",
    group: "payouts",
    description: "Minimum amount (minor units) for a scheduled payout to be released.",
  },
  [SettingKey.REFUND_TIERS]: {
    value: DEFAULT_REFUND_TIERS,
    type: "json",
    label: "Refund tiers",
    group: "policy",
    description: "Time-based cancellation refund ladder, evaluated against the event date.",
  },
  [SettingKey.BOOKING_WINDOW_DAYS]: {
    value: 365,
    type: "number",
    label: "Booking window",
    group: "policy",
    description: "Maximum days ahead a customer may book.",
  },
  [SettingKey.AUTO_APPROVE_VENDORS]: {
    value: false,
    type: "boolean",
    label: "Auto-approve vendors",
    group: "policy",
    description: "Skip manual review for vendors with complete, verified documents.",
  },
  [SettingKey.REVIEW_MODERATION]: {
    value: false,
    type: "boolean",
    label: "Pre-moderate reviews",
    group: "policy",
    description: "Hold new reviews for admin approval before publishing.",
  },
  [SettingKey.PLATFORM_NAME]: {
    value: "Aurelia",
    type: "string",
    label: "Platform name",
    group: "brand",
    description: "Displayed in navigation, invoices and email footers.",
  },
  [SettingKey.SUPPORT_EMAIL]: {
    value: "concierge@aurelia.events",
    type: "string",
    label: "Support email",
    group: "brand",
    description: "Addressed on transactional email and policy pages.",
  },
};

/* ─────────────────────────── Event catalogue ──────────────────────────── */

export interface CategorySeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  commission: number;
  deposit: number;
  docRequired: boolean;
}

export const CATEGORY_CATALOGUE: CategorySeed[] = [
  {
    slug: "caterers",
    name: "Caterers",
    tagline: "Menus crafted for the occasion",
    description:
      "Multi-cuisine caterers with licensed kitchens, tasting-led menus and on-site service teams across India.",
    icon: "UtensilsCrossed",
    commission: 12,
    deposit: 30,
    docRequired: true,
  },
  {
    slug: "decorators",
    name: "Decorators",
    tagline: "Rooms that tell your story",
    description:
      "Floral design, styling and production — from intimate ceremonies to large-format installations.",
    icon: "Sparkles",
    commission: 14,
    deposit: 30,
    docRequired: false,
  },
  {
    slug: "venues",
    name: "Venues",
    tagline: "Spaces worth celebrating in",
    description:
      "Palaces, resorts, banquet halls, vineyards and private estates, with verified capacity and amenities.",
    icon: "Building2",
    commission: 10,
    deposit: 40,
    docRequired: false,
  },
  {
    slug: "photographers",
    name: "Photographers",
    tagline: "The day, honestly captured",
    description:
      "Wedding and editorial photographers and cinematographers, portfolio-vetted and available for travel.",
    icon: "Camera",
    commission: 12,
    deposit: 25,
    docRequired: false,
  },
  {
    slug: "entertainers",
    name: "Entertainers",
    tagline: "Sets that move the room",
    description:
      "DJs, live acts, musicians, anchors and choreographers, with professional riders and PA requirements listed.",
    icon: "Music2",
    commission: 15,
    deposit: 25,
    docRequired: false,
  },
  {
    slug: "rentals",
    name: "Rentals",
    tagline: "Everything, delivered and collected",
    description:
      "Furniture, linen, lighting, sound, tableware, generators and event infrastructure with logistics included.",
    icon: "Truck",
    commission: 11,
    deposit: 20,
    docRequired: false,
  },
];

export const EVENT_TYPE_OPTIONS = Object.values(EventType)
  .map((v) => ({ value: v, label: EVENT_TYPE_LABELS[v] }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
/* ─────────────────────────── Navigation data ───────────────────────────── */

/** Header / mobile-sheet category shortcuts, derived from the seed catalogue. */
export const CATEGORY_NAV = CATEGORY_CATALOGUE.map((c) => ({
  slug: c.slug,
  label: c.name,
  tagline: c.tagline,
  icon: c.icon,
}));
