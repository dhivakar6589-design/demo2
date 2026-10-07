/**
 * Input validation.
 *
 * One Zod schema per write surface, colocated here rather than next to each
 * route so the rules for an entity are readable in a single place. Every
 * schema is used by both the Server Action and the REST route for that entity —
 * the two entry points cannot drift.
 *
 * Money arrives as whole rupees from forms and as minor units from the API.
 * Both are handled explicitly (`rupeeField` vs `minorField`).
 */

import { z } from "zod";
import { EventType } from "@/lib/constants";

/* ───────────────────────────── Primitives ─────────────────────────────── */

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254)
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

export const passwordField = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "That password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const nameField = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters")
  .max(80, "Keep it under 80 characters");

export const phoneField = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{8,18}$/, "Enter a valid phone number");

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

/** Whole rupees from a text input → minor units. */
export const rupeeField = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const cleaned = String(v).replace(/[,\s₹]/g, "");
    if (!cleaned) {
      ctx.addIssue({ code: "custom", message: "Enter an amount" });
      return z.NEVER;
    }
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
      return z.NEVER;
    }
    if (n > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "That amount is above the platform limit" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });

/** Minor units straight from an API client. */
export const minorField = z.coerce
  .number()
  .int("Amounts must be in paise")
  .min(0)
  .max(1_000_000_000);

export const isoDateField = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .transform((v) => new Date(v));

export const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const urlField = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Enter a full https:// URL")
  .optional()
  .or(z.literal(""));

export const optionalUrl = z.union([urlField, z.literal(""), z.null()]).transform(
  (v) => (v ? v : null),
);

export const csvField = z
  .string()
  .max(2000)
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

/* ─────────────────────────────── Auth ─────────────────────────────────── */

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField.optional().or(z.literal("")),
    password: passwordField,
    confirmPassword: z.string(),
    role: z.enum(["CUSTOMER", "VENDOR"]).default("CUSTOMER"),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    state: z.string().trim().max(80).optional().or(z.literal("")),
    marketing: z.coerce.boolean().default(false),
    acceptTerms: z.literal(true, { message: "Please accept the terms to continue" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(128),
  redirectTo: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailField });

/* ────────────────────────────── Events ───────────────────────────────── */

export const eventSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Give your event a name").max(120),
  eventType: z.enum(EventType),
  eventDate: isoDateField.refine(
    (d) => d.getTime() > Date.now() - 86_400_000,
    "Choose a date in the future",
  ),
  startTime: timeField.default("18:00"),
  endTime: timeField.default("23:59"),
  guestCount: z.coerce
    .number()
    .int()
    .min(10, "Most vendors serve at least 10 guests")
    .max(5000, "For events above 5,000 guests, contact concierge"),
  budgetAmount: rupeeField.optional(),
  venueName: z.string().trim().max(120).optional().or(z.literal("")),
  venueLine1: z.string().trim().max(200).optional().or(z.literal("")),
  venueCity: z.string().trim().max(80).optional().or(z.literal("")),
  venueState: z.string().trim().max(80).optional().or(z.literal("")),
  venuePostal: z.string().trim().max(12).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type EventInput = z.infer<typeof eventSchema>;

/* ──────────────────────────── Vendors ────────────────────────────────── */

export const vendorBusinessSchema = z.object({
  businessName: nameField,
  legalName: z.string().trim().max(120).optional().or(z.literal("")),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().min(40, "Tell customers a little more").max(500),
  about: z.string().trim().max(6000).optional().or(z.literal("")),
  foundedYear: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  primaryCategoryId: z.string().min(1, "Choose a category"),
  categoryIds: z.array(z.string()).min(1, "Choose at least one category"),
  baseCity: z.string().trim().min(2, "Enter your city").max(80),
  baseState: z.string().trim().max(80),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  phone: phoneField,
  whatsapp: phoneField.optional().or(z.literal("")),
  website: urlField,
  instagram: z.string().trim().max(60).optional().or(z.literal("")),
  serviceAreas: csvField.optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).default(0),
});

export type VendorBusinessInput = z.infer<typeof vendorBusinessSchema>;

export const vendorDocumentsSchema = z.object({
  gstNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, "Enter a valid GSTIN")
    .optional()
    .or(z.literal("")),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Enter a valid PAN")
    .optional()
    .or(z.literal("")),
  fssaiLicenseNumber: z.string().trim().max(40).optional().or(z.literal("")),
  fssaiExpiry: isoDateField.optional().nullable(),
  gstCertificateUrl: optionalUrl,
  fssaiDocumentUrl: optionalUrl,
  panDocumentUrl: optionalUrl,
  idProofUrl: optionalUrl,
});

export type VendorDocumentsInput = z.infer<typeof vendorDocumentsSchema>;

export const vendorBankingSchema = z.object({
  bankAccountName: nameField,
  bankIfsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Enter a valid account number"),
  confirmAccountNumber: z.string(),
  payoutFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).default("WEEKLY"),
});

export type VendorBankingInput = z.infer<typeof vendorBankingSchema>;

/* ────────────────────────── Listings ─────────────────────────────────── */

export const packageSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(3, "Give the package a name").max(120),
    summary: z.string().trim().max(200).optional().or(z.literal("")),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    kind: z.enum(["PACKAGE", "MENU", "SERVICE"]).default("PACKAGE"),
    pricingModel: z.enum(["PER_PLATE", "PER_EVENT", "BOTH"]),
    pricePerPlate: rupeeField.optional().nullable(),
    basePrice: rupeeField.optional().nullable(),
    perEventPrice: rupeeField.optional().nullable(),
    minGuests: z.coerce.number().int().min(1).max(5000).default(50),
    maxGuests: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    durationMins: z.coerce.number().int().min(60).max(1440).default(240),
    dietary: csvField.optional(),
    allergens: csvField.optional(),
    highlights: csvField.optional(),
    includes: csvField.optional(),
    images: csvField.optional(),
    categoryId: z.string().optional().nullable(),
    isActive: z.coerce.boolean().default(true),
    isFeatured: z.coerce.boolean().default(false),
  })
  .refine(
    (d) => d.pricingModel !== "PER_PLATE" || (d.pricePerPlate ?? 0) > 0,
    { message: "Add a per-plate price", path: ["pricePerPlate"] },
  )
  .refine(
    (d) => d.pricingModel !== "PER_EVENT" || (d.basePrice ?? 0) > 0,
    { message: "Add a starting price", path: ["basePrice"] },
  )
  .refine(
    (d) => !d.maxGuests || d.maxGuests >= d.minGuests,
    { message: "Maximum must be at least the minimum", path: ["maxGuests"] },
  );

export type PackageInput = z.infer<typeof packageSchema>;

export const menuItemSchema = z.object({
  id: z.string().optional(),
  packageId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  courseName: z.string().trim().max(80).optional().or(z.literal("")),
  name: z.string().trim().min(2, "Name the dish").max(120),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  dietary: csvField.optional(),
  allergens: csvField.optional(),
  imageUrl: optionalUrl,
  isVeg: z.coerce.boolean().default(false),
  isAvailable: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const addOnSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name the add-on").max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  pricingModel: z.enum(["PER_PLATE", "PER_EVENT"]).default("PER_PLATE"),
  price: rupeeField,
  unit: z.string().trim().max(40).default("per guest"),
  maxQuantity: z.coerce.number().int().min(1).max(50).default(1),
  dietary: csvField.optional(),
});

export type AddOnInput = z.infer<typeof addOnSchema>;

/* ────────────────────────── Bookings ─────────────────────────────────── */

export const bookingSchema = z.object({
  vendorProfileId: z.string().min(1),
  packageId: z.string().min(1, "Choose a package"),
  eventId: z.string().optional().nullable(),
  quoteId: z.string().optional().nullable(),
  guestCount: z.coerce.number().int().min(1).max(5000),
  eventDate: isoDateField,
  startTime: timeField.default("18:00"),
  addOnIds: z.array(z.string()).default([]),
  menuItemIds: z.array(z.string()).default([]),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  customerNote: z.string().trim().max(1500).optional().or(z.literal("")),
  venueName: z.string().trim().max(120).optional().or(z.literal("")),
  venueLine1: z.string().trim().max(200).optional().or(z.literal("")),
  venueCity: z.string().trim().max(80).optional().or(z.literal("")),
  venueState: z.string().trim().max(80).optional().or(z.literal("")),
  venuePostal: z.string().trim().max(12).optional().or(z.literal("")),
  idempotencyKey: z.string().min(8).max(64),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const quoteRequestSchema = z.object({
  vendorProfileId: z.string().min(1),
  eventId: z.string().optional().nullable(),
  guestCount: z.coerce.number().int().min(1).max(5000),
  eventDate: isoDateField.optional().nullable(),
  packageId: z.string().optional().nullable(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const quoteLineSchema = z.object({
  kind: z.enum(["PACKAGE", "ADDON", "MENU_ITEM", "SERVICE_FEE", "DELIVERY", "DISCOUNT"]),
  label: z.string().trim().min(1).max(160),
  detail: z.string().trim().max(300).optional().nullable(),
  basis: z.enum(["PER_PLATE", "PER_EVENT"]),
  unitPrice: minorField,
  quantity: z.coerce.number().int().min(1).max(10000),
  packageId: z.string().optional().nullable(),
  menuItemId: z.string().optional().nullable(),
  addOnId: z.string().optional().nullable(),
});

export const quoteBuilderSchema = z.object({
  quoteId: z.string().optional(),
  lines: z.array(quoteLineSchema).min(1, "Add at least one line"),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  terms: z.string().trim().max(2000).optional().or(z.literal("")),
  validUntil: isoDateField.optional().nullable(),
  manualDiscountAmount: rupeeField.optional().nullable(),
  guestCount: z.coerce.number().int().min(1).max(5000),
  eventDate: isoDateField.optional().nullable(),
  eventId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT"]).default("SENT"),
});

export type QuoteBuilderInput = z.infer<typeof quoteBuilderSchema>;

/* ──────────────────────────── Reviews ────────────────────────────────── */

export const reviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Choose a rating")
    .max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(20, "Share at least a couple of sentences")
    .max(2000),
  tags: csvField.optional(),
  photos: z.array(z.string().max(500)).max(6).default([]),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const reviewReplySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().trim().min(5).max(1000),
});

export const reviewModerationSchema = z.object({
  reviewId: z.string().min(1),
  status: z.enum(["PUBLISHED", "HIDDEN", "FLAGGED", "REJECTED"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

/* ─────────────────────────── Messaging ───────────────────────────────── */

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000),
  attachments: z.array(z.string().max(500)).max(5).default([]),
});

export const threadSchema = z.object({
  vendorProfileId: z.string().min(1),
  eventId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  subject: z.string().trim().max(140).optional().or(z.literal("")),
  body: z.string().trim().min(1).max(4000),
});

/* ─────────────────────── Availability ───────────────────────────────── */

export const availabilityRuleSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  isAvailable: z.coerce.boolean(),
  startTime: timeField,
  endTime: timeField,
  capacity: z.coerce.number().int().min(1).max(10),
});

export const availabilityBlockSchema = z.object({
  date: isoDateField,
  isBlocked: z.coerce.boolean().default(true),
  capacityOverride: z.coerce.number().int().min(0).max(10).optional().nullable(),
  reason: z.string().trim().max(160).optional().or(z.literal("")),
});

/* ────────────────────────────── Orders ───────────────────────────────── */

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING_PAYMENT",
    "CONFIRMED",
    "IN_PREPARATION",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "DISPUTED",
  ]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(5, "Tell us why so we can improve").max(500),
});

export const disputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.enum(["NO_SHOW", "QUALITY", "OVERCHARGE", "MISSED_ITEM", "LATE", "OTHER"]),
  description: z.string().trim().min(20, "Describe what happened").max(2000),
  claimedAmount: rupeeField.optional(),
});

/* ───────────────────────────── Wishlist ──────────────────────────────── */

export const wishlistSchema = z.object({ vendorProfileId: z.string().min(1) });

/* ─────────────────────────────── Admin ───────────────────────────────── */

export const vendorApprovalSchema = z.object({
  vendorProfileId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(800).optional().or(z.literal("")),
  featured: z.boolean().optional(),
  commissionRate: z.coerce.number().min(0).max(0.3).optional(),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(60),
  slug: slugField,
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  icon: z.string().trim().max(40).default("Sparkles"),
  imageUrl: optionalUrl,
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
  defaultCommissionRate: z.coerce.number().min(0).max(0.3).default(0.12),
  defaultDepositPercent: z.coerce.number().int().min(0).max(100).default(30),
  defaultTaxPercent: z.coerce.number().min(0).max(0.4).default(0.18),
});

export const settingSchema = z.object({
  key: z.string().min(1).max(80),
  valueJson: z.string().min(1).max(8000),
});

export const refundTiersSchema = z.object({
  tiers: z
    .array(
      z.object({
        minDaysBefore: z.coerce.number().int().min(0).max(365),
        percentRefund: z.coerce.number().int().min(0).max(100),
        label: z.string().trim().min(1).max(60),
        note: z.string().trim().max(200),
      }),
    )
    .min(1)
    .max(8),
});

/* ─────────────────────────────── CMS ────────────────────────────────── */

export const cmsPageSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(160),
  slug: slugField,
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  body: z.string().trim().min(20, "Write at least a short article").max(40000),
  type: z.enum(["PAGE", "BLOG", "POLICY"]).default("PAGE"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  coverImageUrl: optionalUrl,
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(170).optional().or(z.literal("")),
  tags: csvField.optional(),
});

export type CmsPageInput = z.infer<typeof cmsPageSchema>;

export const bannerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  eyebrow: z.string().trim().max(60).optional().or(z.literal("")),
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().max(240).optional().or(z.literal("")),
  imageUrl: z.string().trim().min(1),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaHref: z.string().trim().max(200).optional().or(z.literal("")),
  placement: z.enum(["HOME_HERO", "HOME_MID", "CATEGORY"]).default("HOME_HERO"),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});

/* ─────────────────────────── Payouts / staff ────────────────────────── */

export const staffInviteSchema = z.object({
  email: emailField,
  role: z.enum(["MANAGER", "STAFF", "FINANCE"]),
  permissions: z.array(z.string()).default([]),
});

export const payoutRunSchema = z.object({
  vendorProfileId: z.string().optional(),
  execute: z.boolean().default(false),
});