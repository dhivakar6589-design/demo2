/**
 * Demo fixtures for prisma/seed.ts.
 *
 * Kept separate from the seeder so the content is readable on its own and can
 * be reviewed like copy. Percentages here are whole numbers (12 = 12%); the
 * seeder converts them to the fractions the schema stores.
 *
 * Photography is plain Unsplash `?w=` URLs. The SmartImage component renders a
 * brand-tinted placeholder whenever the CDN throttles or 404s, so the layout
 * never depends on these resolving.
 */

export { CATEGORY_CATALOGUE, PLATFORM_DEFAULTS } from "../src/lib/constants";

/*
 * Fixture shapes are declared explicitly rather than inferred from `as const`.
 * Inference turns every array into a union of its members, so a package that
 * happens to omit `basePrice` makes that property inaccessible on *all* of
 * them. These types keep the content free-form while giving the seeder a
 * predictable contract, with optionality expressed once.
 */

export interface SeedMenuItem {
  name: string;
  description?: string;
  dietary: string[];
}

export interface SeedCourse {
  name: string;
  note?: string;
  items: SeedMenuItem[];
}

export interface SeedAddOn {
  name: string;
  description?: string;
  pricingModel: string;
  price: number;
  unit: string;
  maxQuantity: number;
  dietary?: string[];
}

export interface SeedPackage {
  slug: string;
  category: string;
  title: string;
  summary: string;
  description?: string;
  kind: string;
  pricingModel: string;
  /** Major units (rupees) — the seeder converts to paise. */
  pricePerPlate?: number;
  /** Major units (rupees); used by PER_EVENT packages. */
  basePrice?: number;
  minGuests?: number;
  maxGuests?: number;
  durationMins?: number;
  dietary: string[];
  highlights?: string[];
  includes?: string[];
  allergens?: string[];
  tags: string[];
  featured?: boolean;
  images?: string[];
  courses?: SeedCourse[];
  addOns: SeedAddOn[];
}

export interface SeedAvailabilityRule {
  /** 0 = Sunday, matching `AvailabilityRule.weekday`. */
  weekday: number;
  isAvailable: boolean;
  capacity: number;
  startTime?: string;
  endTime?: string;
}

export interface SeedServiceArea {
  city: string;
  state: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface SeedReview {
  rating: number;
  title: string;
  body: string;
  tags: string[];
  reply?: string;
}

export interface SeedBooking {
  slug: string;
  vendorSlug: string;
  packageSlug: string;
  eventTitle: string;
  eventType: string;
  venue: string;
  startTime: string;
  startHour?: number;
  guests: number;
  /** Major units (rupees). */
  budget: number;
  inDays: number;
  status: string;
  eventStatus: string;
  depositPaid: boolean;
  paidInFull: boolean;
  method: string;
  customerNote?: string;
  notes?: string;
  review?: SeedReview;
}

export interface SeedCustomer {
  email: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
  addressLabel: string;
  addressLine1: string;
  bookings: SeedBooking[];
}

export interface SeedVendor {
  email: string;
  ownerName: string;
  phone: string;
  slug: string;
  businessName: string;
  legalName?: string;
  tagline?: string;
  description?: string;
  about?: string;
  foundedYear?: number;
  ratingSeed?: number;
  status?: string;
  featured?: boolean;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  website?: string;
  instagram?: string;
  pricingModel: string;
  /** Major units (rupees). */
  fromPrice: number;
  depositPercent: number;
  minGuests: number;
  maxGuests: number;
  responseTimeHrs: number;
  instantBookable: boolean;
  commissionPercent: number | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  fssai?: string | null;
  ifsc?: string | null;
  accountLast4?: string | null;
  primaryCategory: string;
  categories: string[];
  tags: string[];
  coverImage?: string | null;
  logo?: string | null;
  gallery?: string[];
  serviceAreas: SeedServiceArea[];
  availability: SeedAvailabilityRule[];
  packages: SeedPackage[];
}

export interface SeedCoupon {
  code: string;
  description: string;
  discountType: string;
  /** Major units (rupees) when `discountType` is FIXED; percent otherwise. */
  discountValue: number;
  /** Major units (rupees). */
  minOrder: number;
  firstOrderOnly?: boolean;
  endsInDays: number;
}

export interface SeedFaq {
  question: string;
  answer: string;
}

export interface SeedPage {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
}

/* ───────────────────────────── Dietary tags ─────────────────────────────── */

export const DIETARY_CATALOGUE = [
  { code: "VEG", label: "Vegetarian", icon: "Leaf" },
  { code: "VEGAN", label: "Vegan", icon: "Sprout" },
  { code: "JAIN", label: "Jain", icon: "Wheat" },
  { code: "HALAL", label: "Halal", icon: "BadgeCheck" },
  { code: "KOSHER", label: "Kosher", icon: "Star" },
  { code: "GLUTEN_FREE", label: "Gluten free", icon: "ShieldCheck" },
  { code: "DAIRY_FREE", label: "Dairy free", icon: "Droplets" },
];

/* ─────────────────────────────── Tag list ───────────────────────────────── */

export const TAG_CATALOGUE = [
  { slug: "north-indian", label: "North Indian", kind: "CUISINE" },
  { slug: "south-indian", label: "South Indian", kind: "CUISINE" },
  { slug: "mughlai", label: "Mughlai", kind: "CUISINE" },
  { slug: "italian", label: "Italian", kind: "CUISINE" },
  { slug: "continental", label: "Continental", kind: "CUISINE" },
  { slug: "middle-eastern", label: "Middle Eastern", kind: "CUISINE" },
  { slug: "japanese", label: "Japanese", kind: "CUISINE" },
  { slug: "live-counter", label: "Live counters", kind: "FEATURE" },
  { slug: "tasting-menu", label: "Tasting menu", kind: "FEATURE" },
  { slug: "farm-to-table", label: "Farm to table", kind: "FEATURE" },
  { slug: "halal-certified", label: "Halal certified", kind: "FEATURE" },
  { slug: "sustainable", label: "Sustainable", kind: "FEATURE" },
  { slug: "luxury", label: "Luxury", kind: "STYLE" },
  { slug: "heritage", label: "Heritage", kind: "STYLE" },
  { slug: "destination-wedding", label: "Destination weddings", kind: "STYLE" },
  { slug: "corporate-specialist", label: "Corporate specialist", kind: "STYLE" },
  { slug: "budget-friendly", label: "Budget friendly", kind: "STYLE" },
];

/* ─────────────────────────────── Accounts ───────────────────────────────── */

export const DEMO_ACCOUNTS = {
  password: "Aurelia@2026",

  admin: {
    email: "admin@aurelia.events",
    name: "Nandita Rao",
    phone: "+91 98200 11223",
  },

  customers: [
    {
      email: "ananya.kapoor@example.com",
      name: "Ananya Kapoor",
      phone: "+91 99300 44556",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400050",
      addressLabel: "Home",
      addressLine1: "12 Altamount Road, Bandra West",
      bookings: [
        {
          slug: "kapoor-wedding",
          vendorSlug: "saffron-table",
          packageSlug: "wedding-feast-bandra",
          eventTitle: "Kapoor–Menon Wedding",
          eventType: "WEDDING",
          venue: "The Oberoi, Ballroom Suite",
          startTime: "18:30",
          startHour: 18,
          guests: 320,
          budget: 2_400_000,
          inDays: 46,
          status: "CONFIRMED",
          eventStatus: "CONFIRMED",
          depositPaid: true,
          paidInFull: false,
          method: "UPI",
          customerNote: "Please keep one strictly vegetarian table and no chilli for guests over 70.",
          notes: "Sangeet and reception on consecutive days; venue access from 09:00 on day one.",
        },
        {
          slug: "kapoor-anniversary",
          vendorSlug: "saffron-table",
          packageSlug: "private-dining-menu",
          eventTitle: "25th Anniversary Dinner",
          eventType: "ANNIVERSARY",
          venue: "Residency, Sea View Room",
          startTime: "20:00",
          startHour: 20,
          guests: 48,
          budget: 320_000,
          inDays: 18,
          status: "COMPLETED",
          eventStatus: "COMPLETED",
          depositPaid: true,
          paidInFull: true,
          method: "CARD",
          review: {
            rating: 5,
            title: "They treated our anniversary like their own",
            body:
              "The menu was tasted twice before we confirmed and every course landed exactly as presented. Service staff introduced themselves by name, which sounds small but it changed the evening entirely.",
            tags: ["Service", "Menu quality", "On-time"],
            reply:
              "Thank you, Ananya — it was a pleasure. Do reach out next time; the terrace set-up has just been reworked.",
          },
        },
      ],
    },
    {
      email: "dev.malhotra@corpuslabs.in",
      name: "Dev Malhotra",
      phone: "+91 98111 20304",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      addressLabel: "Office",
      addressLine1: "Level 8, Ashirwad Complex, Kasturi Road",
      bookings: [
        {
          slug: "corpus-product-launch",
          vendorSlug: "bombay-buffet-co",
          packageSlug: "corporate-launch-buffet",
          eventTitle: "Corpus Labs Series C Launch",
          eventType: "CORPORATE",
          venue: "WeWork, Prestige Atrium",
          startTime: "19:00",
          startHour: 19,
          guests: 180,
          budget: 900_000,
          inDays: 12,
          status: "IN_PREPARATION",
          eventStatus: "CONFIRMED",
          depositPaid: true,
          paidInFull: true,
          method: "NETBANKING",
          customerNote: "Two vegan mains required; badge printing is our responsibility, not theirs.",
        },
        {
          slug: "corpus-quarterly-review",
          vendorSlug: "bombay-buffet-co",
          packageSlug: "corporate-launch-buffet",
          eventTitle: "Q3 Leadership Offsite Lunch",
          eventType: "CORPORATE",
          venue: "Corpus Labs, Level 8",
          startTime: "12:30",
          startHour: 12,
          guests: 64,
          budget: 260_000,
          inDays: -26,
          status: "COMPLETED",
          eventStatus: "COMPLETED",
          depositPaid: true,
          paidInFull: true,
          method: "NETBANKING",
          review: {
            rating: 4,
            title: "Solid execution, generous quantities",
            body:
              "Lunch finished thirty minutes early which is rare for a 64-person service. Live counter was the talk of the room. Would like to see a Jain option at future events.",
            tags: ["Punctuality", "Live counters"],
            reply: "Noted on the Jain menu — we are adding it to the standard corporate set for Q4.",
          },
        },
      ],
    },
  ] as SeedCustomer[],

  vendors: [
    {
      email: "hello@saffrontable.in",
      ownerName: "Kabir Anand",
      phone: "+91 98205 77210",
      slug: "saffron-table",
      businessName: "Saffron Table",
      legalName: "Saffron Table Hospitality LLP",
      tagline: "Contemporary Indian, cooked over fire",
      description:
        "A Mumbai kitchen built around the ghodi, the sigri and a two-year-old mother dough. Menus are tasted with the couple before they are signed off.",
      about:
        "Founded in 2016 by chef Kabir Anand after eleven years in Michelin-starred kitchens in Europe and Singapore. We cook on charcoal and copper, source produce from three named farms in Alibaug and Nashik, and never send a menu out untasted. Our brigade is 1 chef per 25 guests.",
      foundedYear: 2016,
      ratingSeed: 4.8,
      status: "APPROVED",
      featured: true,
      city: "Mumbai",
      state: "Maharashtra",
      lat: 19.0596,
      lng: 72.8295,
      website: "https://saffrontable.in",
      instagram: "@saffrontable",
      pricingModel: "BOTH",
      fromPrice: 2_450,
      depositPercent: 30,
      minGuests: 60,
      maxGuests: 600,
      responseTimeHrs: 3,
      instantBookable: true,
      commissionPercent: null,
      gstNumber: "27AABCS4471K1ZP",
      panNumber: "AABCS4471K",
      fssai: "11522011000432",
      ifsc: "HDFC0000321",
      accountLast4: "7721",
      primaryCategory: "caterers",
      categories: ["caterers", "event-planners"],
      tags: ["north-indian", "mughlai", "live-counter", "farm-to-table", "luxury"],
      coverImage:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400",
      logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
      gallery: [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900",
        "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900",
      ],
      serviceAreas: [
        { city: "Mumbai", state: "Maharashtra", lat: 19.0596, lng: 72.8295, radiusKm: 40 },
        { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, radiusKm: 160 },
        { city: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898, radiusKm: 170 },
      ],
      availability: [
        { weekday: 0, isAvailable: false, capacity: 0 },
        { weekday: 1, isAvailable: false, capacity: 0 },
        { weekday: 2, isAvailable: true, capacity: 1, startTime: "09:00", endTime: "23:30" },
        { weekday: 3, isAvailable: true, capacity: 1 },
        { weekday: 4, isAvailable: true, capacity: 2 },
        { weekday: 5, isAvailable: true, capacity: 2 },
        { weekday: 6, isAvailable: true, capacity: 2, startTime: "08:00", endTime: "23:59" },
      ],
      packages: [
        {
          slug: "wedding-feast-bandra",
          category: "caterers",
          title: "The Wedding Feast",
          summary: "Seven courses, two counters, one long table service",
          description:
            "Built for a full-day Indian wedding: a slow morning counter, six seated courses at dinner, and a dessert table designed to be photographed. Includes a menu tasting for up to six people.",
          kind: "PACKAGE",
          pricingModel: "PER_PLATE",
          pricePerPlate: 2_450,
          minGuests: 120,
          maxGuests: 600,
          durationMins: 420,
          dietary: ["VEG", "JAIN"],
          highlights: [
            "Menu tasting included",
            "Live pani puri and kulcha counters",
            "Silver service and crockery included",
            "Six service staff per 50 guests",
          ],
          includes: [
            "All kitchen and service staff",
            "Vegetarian and Jain kitchen separation",
            "Dessert table and props",
            "Bar setup coordination",
          ],
          allergens: ["Dairy", "Gluten", "Tree nuts"],
          tags: ["mughlai", "north-indian", "luxury"],
          featured: true,
          images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200"],
          courses: [
            {
              name: "Welcome counter",
              note: "Served as guests arrive from 18:30",
              items: [
                { name: "Kachori chaat", description: "Winter/summer kachori, tamarind, smoked paneer", dietary: ["VEG"] },
                { name: "Pani puri station", description: "Three puris, two chutneys, kept warm to order", dietary: ["VEG"] },
              ],
            },
            {
              name: "From the fire",
              items: [
                { name: "Galouti on mini sheermal", dietary: ["VEG"] },
                { name: "Charred paneer tikka", description: "Hung curd, ajwain, burnt onion", dietary: ["VEG"] },
              ],
            },
            {
              name: "Main course",
              items: [
                { name: "Dum ka mutton", description: "Six hours, red chilli removed on request", dietary: [] },
                { name: "Kashmiri morel pulao", dietary: ["VEG"] },
                { name: "Subz handi", description: "Winter vegetables, cashew-free option available", dietary: ["VEG", "JAIN"] },
              ],
            },
            {
              name: "Dessert",
              items: [
                { name: "Molten chocolate", description: "Valrhona 70%, sea salt", dietary: ["VEG"] },
                { name: "Jain shrikhand", dietary: ["JAIN"] },
              ],
            },
          ],
          addOns: [
            { name: "Raw bar", description: "Eight-item oyster and prawn counter", pricingModel: "PER_PLATE", price: 850, unit: "per guest", maxQuantity: 1, dietary: [] },
            { name: "Premium bar setup", description: "Glassware, ice and mixers for six hours", pricingModel: "PER_EVENT", price: 24_000, unit: "per event", maxQuantity: 1 },
            { name: "Live dessert cart", pricingModel: "PER_EVENT", price: 18_000, unit: "per event", maxQuantity: 1, dietary: ["VEG"] },
          ],
        },
        {
          slug: "private-dining-menu",
          category: "caterers",
          title: "Private Dining Menu",
          summary: "Six courses served in-staff, no minimum venue spend",
          description:
            "A seated menu for 24 to 80 guests, served family-style or plated. Our chefs cook on site in your kitchen where possible, or bring a mobile kitchen for venues without one.",
          kind: "MENU",
          pricingModel: "PER_PLATE",
          pricePerPlate: 3_200,
          minGuests: 24,
          maxGuests: 80,
          durationMins: 210,
          dietary: ["VEG", "GLUTEN_FREE"],
          highlights: ["Plated or family-style", "Mobile kitchen included", "Wine pairing available"],
          includes: ["Two chefs on site", "Table service", "Menu card printing"],
          allergens: ["Dairy", "Seafood"],
          tags: ["tasting-menu", "luxury"],
          featured: false,
          courses: [
            {
              name: "To begin",
              items: [
                { name: "Tuna tartare, saffron aioli", dietary: [] },
                { name: "Heirloom tomato, burrata, basil oil", dietary: ["VEG", "GLUTEN_FREE"] },
              ],
            },
            {
              name: "Main",
              items: [
                { name: "Miso-glazed seabass", dietary: [] },
                { name: "Wild mushroom risotto", dietary: ["VEG", "GLUTEN_FREE"] },
              ],
            },
          ],
          addOns: [
            { name: "Wine pairing", pricingModel: "PER_PLATE", price: 1_900, unit: "per guest", maxQuantity: 1 },
          ],
        },
      ],
    },
    {
      email: "team@bombaybuffet.in",
      ownerName: "Ritu Menon",
      phone: "+91 99201 88421",
      slug: "bombay-buffet-co",
      businessName: "Bombay Buffet Co.",
      legalName: "Bombay Buffet Company Private Limited",
      tagline: "Office catering that people actually queue for",
      description:
        "Corporate and mid-scale event catering across Bengaluru and Pune. High-volume kitchens, punctual service windows, and dietary labelling on every tray.",
      about:
        "Twelve years running canteens for technology campuses taught us one thing: service windows matter more than menus. We publish a five-day rotation, hit setup times within fifteen minutes, and label every tray for allergens and diet.",
      foundedYear: 2014,
      ratingSeed: 4.6,
      status: "APPROVED",
      featured: true,
      city: "Bengaluru",
      state: "Karnataka",
      lat: 12.9716,
      lng: 77.5946,
      website: "https://bombaybuffet.in",
      instagram: "@bombaybuffetco",
      pricingModel: "PER_PLATE",
      fromPrice: 850,
      depositPercent: 25,
      minGuests: 40,
      maxGuests: 900,
      responseTimeHrs: 2,
      instantBookable: true,
      commissionPercent: 10,
      gstNumber: "29AABCB8812M1Z2",
      panNumber: "AABCB8812M",
      fssai: "11619011000871",
      ifsc: "ICIC0000231",
      accountLast4: "8842",
      primaryCategory: "caterers",
      categories: ["caterers"],
      tags: ["continental", "south-indian", "live-counter", "corporate-specialist"],
      coverImage:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400",
      logo: "https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400",
      gallery: [
        "https://images.unsplash.com/photo-1555244162-803834f70033?w=900",
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=900",
      ],
      serviceAreas: [
        { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, radiusKm: 45 },
        { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, radiusKm: 570 },
      ],
      availability: [
        { weekday: 0, isAvailable: false, capacity: 0 },
        { weekday: 1, isAvailable: true, capacity: 3 },
        { weekday: 2, isAvailable: true, capacity: 3 },
        { weekday: 3, isAvailable: true, capacity: 3 },
        { weekday: 4, isAvailable: true, capacity: 4 },
        { weekday: 5, isAvailable: true, capacity: 4 },
        { weekday: 6, isAvailable: true, capacity: 3 },
      ],
      packages: [
        {
          slug: "corporate-launch-buffet",
          category: "caterers",
          title: "Corporate Buffet",
          summary: "Live counters, labelled trays, service in 15 minutes",
          description:
            "Our standard corporate set: four counters, a buffet line with clear dietary labelling, and a service crew sized to hit your start time within fifteen minutes.",
          kind: "PACKAGE",
          pricingModel: "PER_PLATE",
          pricePerPlate: 850,
          minGuests: 60,
          maxGuests: 900,
          durationMins: 180,
          dietary: ["VEG", "VEGAN", "GLUTEN_FREE", "HALAL"],
          highlights: [
            "Setup complete 30 minutes before your doors open",
            "Every tray labelled for allergens",
            "Halal kitchen on request",
          ],
          includes: ["Service crew", "Buffet props and linen", "Water and soft drinks"],
          allergens: ["Dairy", "Gluten", "Soy"],
          tags: ["continental", "corporate-specialist", "live-counter"],
          featured: true,
          images: ["https://images.unsplash.com/photo-1555244162-803834f70033?w=1200"],
          courses: [
            {
              name: "Counters",
              items: [
                { name: "Pasta bar", description: "Two sauces, seasonal vegetables", dietary: ["VEG"] },
                { name: "Grill counter", description: "Chicken and paneer skewers", dietary: [] },
              ],
            },
            {
              name: "Buffet line",
              items: [
                { name: "Dal makhani and steamed rice", dietary: ["VEG", "GLUTEN_FREE"] },
                { name: "Grain and quinoa salad", dietary: ["VEGAN", "GLUTEN_FREE"] },
              ],
            },
          ],
          addOns: [
            { name: "Bar service", description: "Beer, wine and cocktails with a licensed bartender", pricingModel: "PER_PLATE", price: 650, unit: "per guest", maxQuantity: 1 },
            { name: "Dessert cart", pricingModel: "PER_EVENT", price: 12_000, unit: "per event", maxQuantity: 1, dietary: ["VEG"] },
          ],
        },
        {
          slug: "five-day-office-lunch",
          category: "caterers",
          title: "Five-Day Office Lunch",
          summary: "Rotating menu, billed monthly, one invoice",
          description:
            "A rotating weekday lunch programme for offices of 40 and above. Menu published on Fridays for the following week, dietary requests collected through a simple form.",
          kind: "SERVICE",
          pricingModel: "PER_PLATE",
          pricePerPlate: 420,
          minGuests: 40,
          maxGuests: 600,
          durationMins: 60,
          dietary: ["VEG", "VEGAN", "HALAL"],
          highlights: ["Menu published weekly", "Monthly consolidated invoice"],
          includes: ["Delivery", "Setup and clearance"],
          allergens: ["Dairy", "Gluten"],
          tags: ["corporate-specialist", "budget-friendly"],
          featured: false,
          addOns: [],
        },
      ],
    },
    {
      email: "hello@thegrandtable.in",
      ownerName: "Farhan Qureshi",
      phone: "+91 98119 30221",
      slug: "the-grand-table",
      businessName: "The Grand Table",
      legalName: "Grand Table Events Private Limited",
      tagline: "Multi-day weddings, run like productions",
      description:
        "Full-service wedding and corporate planning across Maharashtra with in-house production, décor and guest management.",
      about:
        "We plan and produce 40 to 60 events a year. Everything in-house: planning, décor, sound, lighting and guest management, which means one accountable team instead of four.",
      foundedYear: 2011,
      ratingSeed: 4.7,
      status: "APPROVED",
      featured: false,
      city: "Pune",
      state: "Maharashtra",
      lat: 18.5204,
      lng: 73.8567,
      website: "https://thegrandtable.in",
      instagram: "@thegrandtable",
      pricingModel: "PER_EVENT",
      fromPrice: 450_000,
      depositPercent: 40,
      minGuests: 150,
      maxGuests: 1200,
      responseTimeHrs: 6,
      instantBookable: false,
      commissionPercent: null,
      gstNumber: "27AAFCG9021D1ZQ",
      panNumber: "AAFCG9021D",
      fssai: null,
      ifsc: "SBIN0000442",
      accountLast4: "3022",
      primaryCategory: "event-planners",
      categories: ["event-planners", "venue-managers"],
      tags: ["destination-wedding", "luxury", "heritage"],
      coverImage:
        "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1400",
      logo: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400",
      gallery: [
        "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=900",
        "https://images.unsplash.com/photo-1470753937643-efeb931202a9?w=900",
      ],
      serviceAreas: [
        { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, radiusKm: 80 },
        { city: "Mahabaleshwar", state: "Maharashtra", lat: 17.8297, lng: 73.6473, radiusKm: 130 },
        { city: "Mumbai", state: "Maharashtra", lat: 19.0596, lng: 72.8295, radiusKm: 150 },
      ],
      availability: [
        { weekday: 0, isAvailable: false, capacity: 0 },
        { weekday: 1, isAvailable: false, capacity: 0 },
        { weekday: 2, isAvailable: true, capacity: 1 },
        { weekday: 3, isAvailable: true, capacity: 1 },
        { weekday: 4, isAvailable: true, capacity: 1 },
        { weekday: 5, isAvailable: true, capacity: 2 },
        { weekday: 6, isAvailable: true, capacity: 2 },
      ],
      packages: [
        {
          slug: "signature-wedding-production",
          category: "event-planners",
          title: "Signature Wedding Production",
          summary: "Planning, décor, production and guest management",
          description:
            "End-to-end production for three-day weddings: planning and vendor coordination, décor across all functions, sound and lighting, and a guest management desk on site.",
          kind: "SERVICE",
          pricingModel: "PER_EVENT",
          basePrice: 450_000,
          pricePerPlate: 1_200,
          minGuests: 200,
          maxGuests: 1200,
          durationMins: 1440,
          dietary: [],
          highlights: [
            "Dedicated planner from enquiry to wrap",
            "Sound, lighting and LED walls",
            "Guest desk, welcome hampers and signage",
          ],
          includes: ["Production crew", "Décort", "Guest management", "Vendor coordination"],
          allergens: [],
          tags: ["destination-wedding", "luxury"],
          featured: true,
          addOns: [
            { name: "Additional function day", pricingModel: "PER_EVENT", price: 220_000, unit: "per day", maxQuantity: 3 },
            { name: "Drone and content team", pricingModel: "PER_EVENT", price: 65_000, unit: "per event", maxQuantity: 1 },
          ],
        },
      ],
    },
    {
      email: "hello@thegreenleafkitchen.in",
      ownerName: "Meera Iyer",
      phone: "+91 98450 66120",
      slug: "greenleaf-kitchen",
      businessName: "Greenleaf Kitchen",
      legalName: "Greenleaf Plant Kitchen LLP",
      tagline: "Plant-forward, zero-waste, entirely delicious",
      description:
        "A 100% plant-based kitchen doing vegan and Jain menus for weddings and corporate events across Chennai and Hyderabad.",
      about:
        "Everything we serve is plant-based — not a vegetable menu. We built our own breads, cheeses and butters, and we compost every scrap through a city facility.",
      foundedYear: 2019,
      ratingSeed: 4.5,
      status: "PENDING",
      featured: false,
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0827,
      lng: 80.2707,
      website: "https://greenleafkitchen.in",
      instagram: "@greenleafkitchen",
      pricingModel: "PER_PLATE",
      fromPrice: 1_150,
      depositPercent: 30,
      minGuests: 30,
      maxGuests: 400,
      responseTimeHrs: 8,
      instantBookable: false,
      commissionPercent: null,
      gstNumber: "33AAJFG2291H1ZQ",
      panNumber: "AAJFG2291H",
      fssai: "11623011000455",
      ifsc: "HDFC0000112",
      accountLast4: "6612",
      primaryCategory: "caterers",
      categories: ["caterers"],
      tags: ["vegan", "sustainable", "farm-to-table", "jain"],
      coverImage:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1400",
      logo: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",
      gallery: ["https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900"],
      serviceAreas: [
        { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, radiusKm: 50 },
      ],
      availability: [
        { weekday: 0, isAvailable: false, capacity: 0 },
        { weekday: 1, isAvailable: true, capacity: 1 },
        { weekday: 2, isAvailable: true, capacity: 1 },
        { weekday: 3, isAvailable: true, capacity: 1 },
        { weekday: 4, isAvailable: true, capacity: 1 },
        { weekday: 5, isAvailable: true, capacity: 2 },
        { weekday: 6, isAvailable: true, capacity: 2 },
      ],
      packages: [
        {
          slug: "wholly-plant-feast",
          category: "caterers",
          title: "Wholly Plant Feast",
          summary: "Five plant-based courses, Jain-friendly by default",
          description:
            "A five-course plant-based menu built around South Indian technique and modern plating. Every dish is Jain-friendly unless it uses onion or garlic by intent.",
          kind: "MENU",
          pricingModel: "PER_PLATE",
          pricePerPlate: 1_150,
          minGuests: 30,
          maxGuests: 400,
          durationMins: 240,
          dietary: ["VEG", "VEGAN", "JAIN", "DAIRY_FREE"],
          highlights: ["Zero-waste service", "Jain kitchen separation", "Plant-based wine pairing"],
          includes: ["Plant-based service crew", "Compostable serviceware"],
          allergens: ["Soy", "Tree nuts"],
          tags: ["vegan", "sustainable", "jain"],
          featured: false,
          courses: [
            {
              name: "Small plates",
              items: [
                { name: "Banana blossom kofta", dietary: ["VEG", "JAIN"] },
                { name: "Watermelon and basil salad", dietary: ["VEGAN", "JAIN"] },
              ],
            },
            {
              name: "Main",
              items: [
                { name: "Smoked jackfruit biryani", dietary: ["VEGAN"] },
                { name: "Coconut and sesame stew", dietary: ["VEGAN", "GLUTEN_FREE"] },
              ],
            },
          ],
          addOns: [],
        },
      ],
    },
    {
      email: "hello@harbourbanquet.in",
      ownerName: "Imran Sheikh",
      phone: "+91 98330 12345",
      slug: "harbour-banquet-halls",
      businessName: "Harbour Banquet Halls",
      legalName: "Harbour Hospitality Ventures LLP",
      tagline: "Two hundred guests, four halls, one waterfront",
      description:
        "A heritage waterfront property with four banquet halls, a 200-cover terrace and in-house banqueting.",
      about:
        "Restored in 2019 from a 1920s customs warehouse. Four halls seating 60 to 400, a 200-cover terrace, and a kitchen that has run banquets here for three decades.",
      foundedYear: 2019,
      ratingSeed: 4.4,
      status: "DRAFT",
      featured: false,
      city: "Kolkata",
      state: "West Bengal",
      lat: 22.5726,
      lng: 88.3639,
      website: "https://harbourbanquet.in",
      instagram: "@harbourbanquet",
      pricingModel: "PER_EVENT",
      fromPrice: 180_000,
      depositPercent: 50,
      minGuests: 60,
      maxGuests: 400,
      responseTimeHrs: 12,
      instantBookable: false,
      commissionPercent: null,
      gstNumber: "19AAHCH4412K1Z8",
      panNumber: "AAHCH4412K",
      fssai: null,
      ifsc: "ICIC0000553",
      accountLast4: "1234",
      primaryCategory: "venue-managers",
      categories: ["venue-managers"],
      tags: ["heritage", "luxury"],
      coverImage:
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1400",
      logo: null,
      gallery: ["https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=900"],
      serviceAreas: [
        { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, radiusKm: 40 },
      ],
      availability: [
        { weekday: 0, isAvailable: false, capacity: 0 },
        { weekday: 1, isAvailable: true, capacity: 2 },
        { weekday: 2, isAvailable: true, capacity: 2 },
        { weekday: 3, isAvailable: true, capacity: 2 },
        { weekday: 4, isAvailable: true, capacity: 2 },
        { weekday: 5, isAvailable: true, capacity: 2 },
        { weekday: 6, isAvailable: true, capacity: 3 },
      ],
      packages: [
        {
          slug: "heritage-hall-rental",
          category: "venue-managers",
          title: "Heritage Hall Rental",
          summary: "Hall, air conditioning, in-house banqueting for eight hours",
          description:
            "Eight hours of exclusive use of the Marine Hall, including air conditioning, house lighting, tables and chairs, and in-house banqueting at a fixed per-plate rate.",
          kind: "SERVICE",
          pricingModel: "PER_EVENT",
          basePrice: 180_000,
          pricePerPlate: 750,
          minGuests: 100,
          maxGuests: 400,
          durationMins: 480,
          dietary: ["VEG", "JAIN"],
          highlights: ["Eight hours exclusive", "In-house banqueting", "Valet parking for 60 cars"],
          includes: ["Hall rental", "Banquet furniture", "House sound", "Valet parking"],
          allergens: [],
          tags: ["heritage"],
          featured: false,
          addOns: [
            { name: "Overnight venue access", pricingModel: "PER_EVENT", price: 90_000, unit: "per night", maxQuantity: 1 },
          ],
        },
      ],
    },
  ] as SeedVendor[],

  coupons: [
    {
      code: "AURELIA10",
      description: "10% off your first booking, up to ₹40,000",
      discountType: "PERCENT",
      discountValue: 10,
      minOrder: 150_000,
      firstOrderOnly: true,
      endsInDays: 45,
    },
    {
      code: "WINTER5000",
      description: "Flat ₹5,000 off orders above ₹2,00,000",
      discountType: "FIXED",
      discountValue: 5_000,
      minOrder: 200_000,
      endsInDays: 30,
    },
  ] as SeedCoupon[],

  faqs: [
    {
      question: "When does Aurelia release my payment to the vendor?",
      answer:
        "Funds are held by the platform from the moment you pay. The vendor's share is released after you mark the event complete, or automatically seven days after the event date. If a dispute is raised, release pauses until it is resolved.",
    },
    {
      question: "What happens if I need to cancel?",
      answer:
        "Refund percentages depend on how far ahead you cancel and are shown on every booking before you pay — 90% up to 30 days out, 50% up to 7 days, and no refund inside 72 hours. Vendor-set cancellation windows apply and are always displayed on the package.",
    },
    {
      question: "Are vendors verified before they can list?",
      answer:
        "Yes. Every vendor submits GST, PAN and, where the category requires it, an FSSAI licence. Our curation team then reviews the portfolio, menu and service model manually before a listing goes live.",
    },
    {
      question: "Can I change the guest count after booking?",
      answer:
        "Guest counts can be adjusted up to 14 days before the event for per-plate packages. The balance invoice is recalculated automatically and any difference is charged or refunded to the original payment method.",
    },
    {
      question: "Do you charge a booking fee?",
      answer:
        "No booking fee. The price you see includes the package, applicable GST and any platform contribution shown at checkout. Vendor commission is drawn from the listed price rather than added to it.",
    },
  ] as SeedFaq[],

  pages: [
    {
      slug: "how-it-works",
      title: "How Aurelia works",
      excerpt:
        "From first search to final payout: escrow, verification and cancellation terms explained end to end.",
      body: "Aurelia sits between the customer and a curated vendor network.\n\n1. Search by city, guest count, date and cuisine. Every listing shows total price including GST.\n2. Request a quote or book instantly if the vendor offers it.\n3. Pay a deposit into escrow. The vendor confirms once capacity is locked.\n4. We hold the funds, notify both sides at each milestone, and release the vendor's share after the event.\n\nCancellation windows and refund percentages are set by each vendor and shown before payment.",
    },
    {
      slug: "legal/terms",
      title: "Terms of service",
      excerpt: "The agreement between you, Aurelia, and vendors on the platform.",
      body: "These terms govern use of the Aurelia platform.\n\nAurelia operates a marketplace. Contracts for supply of catering, planning or venue services are formed directly between the customer and the vendor. Aurelia holds and releases funds, records the audit trail, and administers refunds and disputes under the schedule published at checkout.",
    },
    {
      slug: "legal/refunds",
      title: "Cancellation and refunds",
      excerpt: "Refund percentages, timelines and how escrow release works.",
      body: "Default schedule unless the vendor publishes a stricter one:\n\n• More than 30 days before the event — 90% refunded.\n• 7 to 30 days before the event — 50% refunded.\n• Under 7 days before the event — no refund.\n• Within 72 hours of the event — no refund.\n\nRefunds are returned to the original payment method within 5 to 7 business days.",
    },
    {
      slug: "legal/privacy",
      title: "Privacy policy",
      excerpt: "What we collect, why, and the controls you have.",
      body: "We collect the account details needed to run a marketplace: identity, contact information, venue addresses and payment references. Payment card data never touches our servers — it is handled by the payment provider.\n\nYou can request an export or deletion of your data from account settings. Deletion removes personal data while retaining legally required transaction records for the statutory period.",
    },
  ] as SeedPage[],
};
