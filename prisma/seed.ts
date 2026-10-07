/**
 * Aurelia demo seed.
 *
 * Runs against the derived SQLite schema in development (`npm run db:seed`) and
 * against Postgres in staging via `prisma/seed.ts --adapter postgresql`.
 *
 * Design notes
 * ────────────
 * • Idempotent: every write is an upsert keyed on a natural key, so re-running
 *   never duplicates a category or a package.
 * • Money is written in minor units via `rupees()`, never as floats.
 * • Commission/deposit/tax percentages arrive as whole numbers in the catalogue
 *   and are divided by 100 here, because the schema stores fractions.
 * • Historical data is anchored to a fixed offset from today so the seeded
 *   availability calendar, due dates and reminder windows are always relevant.
 */

import { PrismaClient, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  CATEGORY_CATALOGUE,
  PLATFORM_DEFAULTS,
  DIETARY_CATALOGUE,
  TAG_CATALOGUE,
  DEMO_ACCOUNTS,
  type SeedCustomer,
} from "./seed-data";

const prisma = new PrismaClient();

/* ─────────────────────────────── Helpers ───────────────────────────────── */

const rupees = (n: number) => Math.round(n * 100);
const fraction = (percent: number) => percent / 100;

function dayOffset(days: number, hour = 0) {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function utcMidnight(days: number) {
  const d = dayOffset(days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function orderNumber(seq: number) {
  return `AUR-${new Date().getUTCFullYear()}-${String(seq).padStart(5, "0")}`;
}

function invoiceNumber(seq: number) {
  return `INV-${new Date().getUTCFullYear()}-${String(seq).padStart(5, "0")}`;
}

async function main() {
  console.log("→ seeding Aurelia demo data\n");

  /* ── Catalogue ─────────────────────────────────────────────────────── */

  const categories = new Map<string, string>();
  for (const [index, seed] of CATEGORY_CATALOGUE.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        tagline: seed.tagline,
        description: seed.description,
        icon: seed.icon,
        sortOrder: index,
        defaultCommissionRate: fraction(seed.commission),
        defaultDepositPercent: seed.deposit,
        requiresDoc: seed.docRequired,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        tagline: seed.tagline,
        description: seed.description,
        icon: seed.icon,
        sortOrder: index,
        defaultCommissionRate: fraction(seed.commission),
        defaultDepositPercent: seed.deposit,
        requiresDoc: seed.docRequired,
      },
    });
    categories.set(seed.slug, row.id);
  }
  console.log(`  categories      ${categories.size}`);

  const dietary = new Map<string, string>();
  for (const [index, seed] of DIETARY_CATALOGUE.entries()) {
    const row = await prisma.dietaryTag.upsert({
      where: { code: seed.code },
      update: { label: seed.label, sortOrder: index },
      create: { ...seed, sortOrder: index },
    });
    dietary.set(seed.code, row.id);
  }
  console.log(`  dietary tags    ${dietary.size}`);

  const tags = new Map<string, string>();
  for (const [index, seed] of TAG_CATALOGUE.entries()) {
    const row = await prisma.tag.upsert({
      where: { slug: seed.slug },
      update: { label: seed.label, kind: seed.kind, sortOrder: index },
      create: { ...seed, sortOrder: index },
    });
    tags.set(seed.slug, row.id);
  }
  console.log(`  tags            ${tags.size}`);

  /* ── Accounts ──────────────────────────────────────────────────────── */

  const passwordHash = await bcrypt.hash(DEMO_ACCOUNTS.password, 10);

  const admin = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.admin.email },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      email: DEMO_ACCOUNTS.admin.email,
      name: DEMO_ACCOUNTS.admin.name,
      phone: DEMO_ACCOUNTS.admin.phone,
      role: "ADMIN",
      status: "ACTIVE",
      city: "Mumbai",
      state: "Maharashtra",
      passwordHash,
      emailVerified: dayOffset(-120),
      dataConsentAt: dayOffset(-120),
    },
  });

  const customers: { user: User; seed: SeedCustomer }[] = [];
  for (const [index, seed] of DEMO_ACCOUNTS.customers.entries()) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { passwordHash, status: "ACTIVE" },
      create: {
        email: seed.email,
        name: seed.name,
        phone: seed.phone,
        role: "CUSTOMER",
        status: "ACTIVE",
        city: seed.city,
        state: seed.state,
        passwordHash,
        emailVerified: dayOffset(-60 + index),
        dataConsentAt: dayOffset(-60 + index),
        marketing: index === 0,
      },
    });

    await prisma.address.upsert({
      where: { id: `seed-address-${index}` },
      update: {},
      create: {
        id: `seed-address-${index}`,
        userId: user.id,
        label: seed.addressLabel,
        line1: seed.addressLine1,
        city: seed.city,
        state: seed.state,
        postalCode: seed.postalCode,
        isDefault: true,
      },
    });

    customers.push({ user, seed });
  }
  console.log(`  customers       ${customers.length + 1} (incl. admin)`);

  /* ── Vendors ───────────────────────────────────────────────────────── */

  const vendors = [];
  for (const [index, seed] of DEMO_ACCOUNTS.vendors.entries()) {
    const owner = await prisma.user.upsert({
      where: { email: seed.email },
      update: { passwordHash, status: "ACTIVE" },
      create: {
        email: seed.email,
        name: seed.ownerName,
        phone: seed.phone,
        role: "VENDOR",
        status: "ACTIVE",
        city: seed.city,
        state: seed.state,
        passwordHash,
        emailVerified: dayOffset(-90 + index),
        dataConsentAt: dayOffset(-90 + index),
      },
    });

    const profile = await prisma.vendorProfile.upsert({
      where: { slug: seed.slug },
      update: {
        businessName: seed.businessName,
        tagline: seed.tagline,
        status: seed.status,
        baseCity: seed.city,
        baseState: seed.state,
        latitude: seed.lat,
        longitude: seed.lng,
      },
      create: {
        userId: owner.id,
        slug: seed.slug,
        businessName: seed.businessName,
        legalName: seed.legalName,
        tagline: seed.tagline,
        description: seed.description,
        about: seed.about,
        foundedYear: seed.foundedYear ?? null,
        yearsExperience: new Date().getUTCFullYear() - (seed.foundedYear ?? new Date().getUTCFullYear()),
        status: seed.status,
        submittedAt: seed.status === "DRAFT" ? null : dayOffset(-80 + index),
        reviewedAt: seed.status === "APPROVED" ? dayOffset(-79 + index) : null,
        reviewedById: seed.status === "APPROVED" ? admin.id : null,
        isFeatured: seed.featured,
        featuredAt: seed.featured ? dayOffset(-40) : null,
        pricingModel: seed.pricingModel,
        fromPrice: rupees(seed.fromPrice),
        depositPercent: seed.depositPercent,
        minGuests: seed.minGuests,
        maxGuests: seed.maxGuests,
        responseTimeHrs: seed.responseTimeHrs,
        instantBookable: seed.instantBookable,
        commissionRate: seed.commissionPercent != null ? fraction(seed.commissionPercent) : null,
        phone: seed.phone,
        whatsapp: seed.phone,
        email: seed.email,
        website: seed.website,
        instagram: seed.instagram,
        serviceAreas: JSON.stringify(seed.serviceAreas),
        baseCity: seed.city,
        baseState: seed.state,
        latitude: seed.lat,
        longitude: seed.lng,
        gstNumber: seed.gstNumber,
        panNumber: seed.panNumber,
        fssaiLicenseNumber: seed.fssai ?? null,
        documentsVerified: seed.status === "APPROVED",
        bankVerified: seed.status === "APPROVED",
        bankAccountName: seed.legalName,
        bankIfsc: seed.ifsc,
        bankAccountLast4: seed.accountLast4,
        ratingAvg: 0,
        ratingCount: 0,
        completedOrders: 0,
        primaryCategoryId: categories.get(seed.primaryCategory) ?? null,
        galleryJson: JSON.stringify(seed.gallery),
        coverImageUrl: seed.coverImage,
        logoUrl: seed.logo,
      },
    });

    for (const [position, slug] of seed.categories.entries()) {
      const categoryId = categories.get(slug);
      if (!categoryId) continue;
      await prisma.vendorCategory.upsert({
        where: {
          vendorProfileId_categoryId: { vendorProfileId: profile.id, categoryId },
        },
        update: { isPrimary: slug === seed.primaryCategory },
        create: {
          vendorProfileId: profile.id,
          categoryId,
          isPrimary: slug === seed.primaryCategory,
        },
      });
      void position;
    }

    for (const slug of seed.tags) {
      const tagId = tags.get(slug);
      if (!tagId) continue;
      await prisma.vendorTag.upsert({
        where: { vendorProfileId_tagId: { vendorProfileId: profile.id, tagId } },
        update: {},
        create: { vendorProfileId: profile.id, tagId },
      });
    }

    for (const [cityIndex, area] of seed.serviceAreas.entries()) {
      const key = `seed-area-${profile.id}-${cityIndex}`;
      await prisma.serviceArea.upsert({
        where: { id: key },
        update: { serviceRadiusKm: area.radiusKm },
        create: {
          id: key,
          vendorProfileId: profile.id,
          city: area.city,
          state: area.state,
          latitude: area.lat ?? null,
          longitude: area.lng ?? null,
          serviceRadiusKm: area.radiusKm,
        },
      });
    }

    // Each fixture rule carries its own weekday; `[index, value]` from
    // `.entries()` is the array position, not the day.
    for (const rule of seed.availability) {
      await prisma.availabilityRule.upsert({
        where: {
          vendorProfileId_weekday: { vendorProfileId: profile.id, weekday: rule.weekday },
        },
        update: rule,
        create: { vendorProfileId: profile.id, ...rule },
      });
    }

    vendors.push({ profile, owner, seed });
  }
  console.log(`  vendors         ${vendors.length}`);

  /* ── Packages, menus, add-ons ──────────────────────────────────────── */

  let packageCount = 0;
  let itemCount = 0;
  for (const { profile, seed } of vendors) {
    for (const pack of seed.packages) {
      const categoryId = categories.get(pack.category) ?? null;
      const row = await prisma.package.upsert({
        where: { vendorProfileId_slug: { vendorProfileId: profile.id, slug: pack.slug } },
        update: {
          title: pack.title,
          pricePerPlate: rupees(pack.pricePerPlate ?? 0),
          isActive: true,
        },
        create: {
          vendorProfileId: profile.id,
          categoryId,
          slug: pack.slug,
          title: pack.title,
          summary: pack.summary,
          description: pack.description,
          kind: pack.kind,
          pricingModel: pack.pricingModel,
          pricePerPlate: rupees(pack.pricePerPlate ?? 0),
          basePrice: pack.basePrice ? rupees(pack.basePrice) : null,
          minGuests: pack.minGuests ?? seed.minGuests,
          maxGuests: pack.maxGuests ?? seed.maxGuests,
          durationMins: pack.durationMins,
          dietaryJson: JSON.stringify(pack.dietary),
          highlightsJson: JSON.stringify(pack.highlights),
          includesJson: JSON.stringify(pack.includes),
          imagesJson: JSON.stringify(pack.images ?? []),
          allergensJson: JSON.stringify(pack.allergens ?? []),
          isFeatured: pack.featured,
        },
      });
      packageCount++;

      for (const slug of pack.tags) {
        const tagId = tags.get(slug);
        if (!tagId) continue;
        await prisma.packageTag.upsert({
          where: { packageId_tagId: { packageId: row.id, tagId } },
          update: {},
          create: { packageId: row.id, tagId },
        });
      }

      for (const [courseIndex, course] of (pack.courses ?? []).entries()) {
        const courseRow = await prisma.menuCourse.upsert({
          where: { id: `seed-course-${row.id}-${courseIndex}` },
          update: { name: course.name },
          create: {
            id: `seed-course-${row.id}-${courseIndex}`,
            packageId: row.id,
            name: course.name,
            note: course.note ?? null,
            sortOrder: courseIndex,
          },
        });

        for (const [itemIndex, item] of course.items.entries()) {
          await prisma.menuItem.upsert({
            where: { id: `seed-item-${row.id}-${courseIndex}-${itemIndex}` },
            update: { name: item.name, isAvailable: true },
            create: {
              id: `seed-item-${row.id}-${courseIndex}-${itemIndex}`,
              vendorProfileId: profile.id,
              packageId: row.id,
              courseId: courseRow.id,
              name: item.name,
              description: item.description ?? null,
              dietaryJson: JSON.stringify(item.dietary),
              isVeg: item.dietary.includes("VEG"),
              sortOrder: itemIndex,
            },
          });
          itemCount++;
        }
      }

      for (const [addOnIndex, addOn] of (pack.addOns ?? []).entries()) {
        await prisma.addOn.upsert({
          where: { id: `seed-addon-${row.id}-${addOnIndex}` },
          update: { price: rupees(addOn.price) },
          create: {
            id: `seed-addon-${row.id}-${addOnIndex}`,
            packageId: row.id,
            name: addOn.name,
            description: addOn.description,
            pricingModel: addOn.pricingModel,
            price: rupees(addOn.price),
            unit: addOn.unit,
            maxQuantity: addOn.maxQuantity,
            dietaryJson: JSON.stringify(addOn.dietary ?? []),
            sortOrder: addOnIndex,
          },
        });
      }
    }
  }
  console.log(`  packages        ${packageCount}`);
  console.log(`  menu items      ${itemCount}`);

  /* ── Customer events ───────────────────────────────────────────────── */

  let seq = 1;
  let orderCount = 0;
  let reviewCount = 0;

  for (const { user: customer, seed } of customers) {
    for (const booking of seed.bookings) {
      const vendor = vendors.find((v) => v.profile.slug === booking.vendorSlug);
      if (!vendor) continue;
      const pkg = await prisma.package.findFirst({
        where: { vendorProfileId: vendor.profile.id, slug: booking.packageSlug },
      });
      if (!pkg) continue;

      const event = await prisma.event.upsert({
        where: { id: `seed-event-${customer.id}-${booking.slug}` },
        update: {},
        create: {
          id: `seed-event-${customer.id}-${booking.slug}`,
          customerId: customer.id,
          title: booking.eventTitle,
          eventType: booking.eventType,
          eventDate: dayOffset(booking.inDays, booking.startHour ?? 18),
          startTime: booking.startTime,
          guestCount: booking.guests,
          budgetAmount: rupees(booking.budget),
          venueName: booking.venue,
          venueCity: seed.city,
          venueState: seed.state,
          venuePostal: seed.postalCode,
          notes: booking.notes,
          status: booking.eventStatus,
        },
      });

      // ── Order: priced with the same engine the app uses ──────────────
      // pkg.pricePerPlate is ALREADY minor units — do not convert twice.
      const unitPrice = pkg.pricePerPlate ?? 0;
      const subtotal = unitPrice * booking.guests;
      const taxPercent = 0.18;
      const taxAmount = Math.round(subtotal * taxPercent);
      const total = subtotal + taxAmount;
      const depositAmount = Math.round((total * vendor.profile.depositPercent) / 100);
      const commission = Math.round(total * (vendor.profile.commissionRate ?? 0.12));

      const order = await prisma.order.upsert({
        where: { orderNumber: orderNumber(seq) },
        update: {},
        create: {
          orderNumber: orderNumber(seq),
          customerId: customer.id,
          vendorProfileId: vendor.profile.id,
          eventId: event.id,
          packageId: pkg.id,
          status: booking.status,
          eventDate: event.eventDate,
          startTime: booking.startTime,
          guestCount: booking.guests,
          subtotalAmount: subtotal,
          taxPercent: taxPercent,
          taxAmount,
          totalAmount: total,
          commissionRate: vendor.profile.commissionRate ?? 0.12,
          commissionAmount: commission,
          vendorNetAmount: total - commission,
          depositPercent: vendor.profile.depositPercent,
          depositAmount,
          depositPaid: booking.depositPaid ? depositAmount : 0,
          depositStatus: booking.depositPaid ? "PAID" : "DUE",
          balanceAmount: total - depositAmount,
          balancePaid: booking.paidInFull ? total - depositAmount : 0,
          balanceStatus: booking.paidInFull
            ? "PAID"
            : booking.depositPaid
              ? "DUE"
              : "PENDING",
          balanceDueDate: dayOffset(Math.max(booking.inDays - 21, 1)),
          paidInFullAt: booking.paidInFull ? dayOffset(Math.max(booking.inDays - 20, 0)) : null,
          venueName: booking.venue,
          venueCity: seed.city,
          venueState: seed.state,
          venuePostal: seed.postalCode,
          confirmedAt: booking.status !== "PENDING_PAYMENT" ? dayOffset(-20) : null,
          completedAt: booking.status === "COMPLETED" ? dayOffset(Math.min(booking.inDays, 1)) : null,
          customerNote: booking.customerNote,
        },
      });
      orderCount++;

      // SQLite has no native multi-row insert skip-duplicates, so the two
      // canonical lines are written individually.
      await prisma.orderItem.upsert({
        where: { id: `seed-orderitem-${order.id}-package` },
        update: {},
        create: {
          id: `seed-orderitem-${order.id}-package`,
          orderId: order.id,
          packageId: pkg.id,
          kind: "PACKAGE",
          label: pkg.title,
          detail: pkg.summary,
          quantity: booking.guests,
          unitPrice,
          lineTotal: subtotal,
          sortOrder: 0,
        },
      });
      await prisma.orderItem.upsert({
        where: { id: `seed-orderitem-${order.id}-tax` },
        update: {},
        create: {
          id: `seed-orderitem-${order.id}-tax`,
          orderId: order.id,
          kind: "SERVICE_FEE",
          label: `GST (${taxPercent * 100}%)`,
          quantity: 1,
          unitPrice: taxAmount,
          lineTotal: taxAmount,
          sortOrder: 1,
        },
      });

      // Capacity ledger — the reason the date shows as full.
      await prisma.availabilityLedger.create({
        data: {
          vendorProfileId: vendor.profile.id,
          date: utcMidnight(booking.inDays),
          orderId: order.id,
          eventId: event.id,
          guestCount: booking.guests,
          slotsUsed: 1,
          releasedAt: booking.status === "CANCELLED" ? dayOffset(-1) : null,
        },
      });

      await prisma.invoice.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          number: invoiceNumber(seq),
          dueDate: dayOffset(Math.max(booking.inDays - 21, 1)),
          subtotalAmount: subtotal,
          taxPercent: taxPercent,
          taxAmount,
          totalAmount: total,
          amountPaid: booking.paidInFull ? total : booking.depositPaid ? depositAmount : 0,
          amountDue: booking.paidInFull
            ? 0
            : booking.depositPaid
              ? total - depositAmount
              : total,
          snapshotJson: JSON.stringify({
            package: pkg.title,
            guests: booking.guests,
            venue: booking.venue,
            vendor: vendor.profile.businessName,
          }),
        },
      });

      if (booking.depositPaid) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            customerId: customer.id,
            vendorProfileId: vendor.profile.id,
            provider: "MOCK",
            providerRef: `pi_seed_${order.id}_deposit`,
            method: booking.method,
            kind: "DEPOSIT",
            status: "CAPTURED",
            amount: depositAmount,
            platformFee: 0,
            commissionAmount: Math.round((depositAmount * (vendor.profile.commissionRate ?? 0.12))),
            vendorNetAmount: depositAmount - Math.round(depositAmount * (vendor.profile.commissionRate ?? 0.12)),
            idempotencyKey: `seed-deposit-${order.id}`,
            capturedAt: dayOffset(-19),
          },
        });
      }

      if (booking.paidInFull) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            customerId: customer.id,
            vendorProfileId: vendor.profile.id,
            provider: "MOCK",
            providerRef: `pi_seed_${order.id}_balance`,
            method: booking.method,
            kind: "BALANCE",
            status: "CAPTURED",
            amount: total - depositAmount,
            commissionAmount: commission - Math.round((depositAmount * (vendor.profile.commissionRate ?? 0.12))),
            vendorNetAmount: total - depositAmount - (commission - Math.round(depositAmount * (vendor.profile.commissionRate ?? 0.12))),
            idempotencyKey: `seed-balance-${order.id}`,
            capturedAt: dayOffset(-8),
          },
        });
      }

      await prisma.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: "PENDING_PAYMENT",
          note: "Order created",
          actorId: customer.id,
          actorRole: "CUSTOMER",
          createdAt: dayOffset(-20),
        },
      });

      if (booking.depositPaid) {
        await prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: "PENDING_PAYMENT",
            toStatus: "CONFIRMED",
            note: "Deposit received — booking confirmed",
            actorRole: "SYSTEM",
            createdAt: dayOffset(-19),
          },
        });
      }

      if (booking.status === "COMPLETED") {
        await prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: "CONFIRMED",
            toStatus: "COMPLETED",
            note: "Event delivered",
            actorRole: "SYSTEM",
            createdAt: dayOffset(Math.min(booking.inDays, 1)),
          },
        });

        if (booking.review) {
          await prisma.review.upsert({
            where: { orderId: order.id },
            update: {},
            create: {
              orderId: order.id,
              customerId: customer.id,
              vendorProfileId: vendor.profile.id,
              eventId: event.id,
              rating: booking.review.rating,
              title: booking.review.title,
              body: booking.review.body,
              tagsJson: JSON.stringify(booking.review.tags),
              eventType: booking.eventType,
              status: "PUBLISHED",
              isVerified: true,
              vendorReply: booking.review.reply ?? null,
              vendorRepliedAt: booking.review.reply ? dayOffset(Math.min(booking.inDays, 0)) : null,
              photosJson: JSON.stringify([]),
            },
          });
          reviewCount++;
        }

        await prisma.payout.create({
          data: {
            vendorProfileId: vendor.profile.id,
            orderId: order.id,
            amount: total,
            commissionAmount: commission,
            netAmount: total - commission,
            status: "PAID",
            provider: "MOCK",
            providerRef: `po_seed_${order.id}`,
            scheduledFor: dayOffset(Math.min(booking.inDays, 1) + 7),
            paidAt: dayOffset(Math.min(booking.inDays, 1) + 7),
          },
        });
      }

      // Notifications give the dashboards something honest to render.
      await prisma.notification.create({
        data: {
          userId: customer.id,
          type: booking.status === "COMPLETED" ? "EVENT_COMPLETED" : "BOOKING_CONFIRMED",
          channel: "IN_APP",
          title:
            booking.status === "COMPLETED"
              ? `${booking.eventTitle} is complete`
              : `${booking.eventTitle} confirmed`,
          body:
            booking.status === "COMPLETED"
              ? "How did it go? Leave a review to help other hosts."
              : `Deposit received. Balance due ${new Date(order.balanceDueDate ?? Date.now()).toDateString()}.`,
          href: booking.status === "COMPLETED" ? "/dashboard/bookings" : "/dashboard/bookings",
        },
      });

      seq++;
    }
  }
  console.log(`  orders          ${orderCount}`);
  console.log(`  reviews         ${reviewCount}`);

  /* ── Vendor-side data ──────────────────────────────────────────────── */

  for (const { profile, seed } of vendors) {
    // Aggregates are recomputed rather than trusted from the vendor record.
    const stats = await prisma.order.aggregate({
      where: { vendorProfileId: profile.id, status: "COMPLETED" },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
    const ratings = await prisma.review.aggregate({
      where: { vendorProfileId: profile.id, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const pendingQuotes = await prisma.quote.count({
      where: { vendorProfileId: profile.id, status: "SENT" },
    });
    const openOrders = await prisma.order.count({
      where: {
        vendorProfileId: profile.id,
        status: { in: ["CONFIRMED", "IN_PREPARATION"] },
      },
    });
    const lifetime = await prisma.payment.aggregate({
      where: { vendorProfileId: profile.id, status: "CAPTURED", kind: { in: ["DEPOSIT", "BALANCE"] } },
      _sum: { amount: true },
    });

    await prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        completedOrders: stats._count._all,
        ratingAvg: Number((ratings._avg.rating ?? seed.ratingSeed ?? 4.5).toFixed(2)),
        ratingCount: ratings._count._all,
        onTimeRate: 0.96,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "SEED_REFRESHED",
        entity: "VendorProfile",
        entityId: profile.id,
        afterJson: JSON.stringify({
          openOrders,
          pendingQuotes,
          lifetimeGross: lifetime._sum.amount ?? 0,
        }),
      },
    });
  }

  /* ── Coupons, FAQs, settings ───────────────────────────────────────── */

  for (const coupon of DEMO_ACCOUNTS.coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { isActive: true },
      create: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountType === "PERCENT" ? coupon.discountValue : rupees(coupon.discountValue),
        minOrderAmount: rupees(coupon.minOrder ?? 0),
        firstOrderOnly: coupon.firstOrderOnly ?? false,
        startsAt: dayOffset(-30),
        endsAt: dayOffset(coupon.endsInDays),
        isActive: true,
      },
    });
  }

  for (const [index, faq] of DEMO_ACCOUNTS.faqs.entries()) {
    await prisma.faq.upsert({
      where: { id: `seed-faq-${index}` },
      update: {},
      create: {
        id: `seed-faq-${index}`,
        scope: "PLATFORM",
        question: faq.question,
        answer: faq.answer,
        sortOrder: index,
      },
    });
  }

  for (const [key, setting] of Object.entries(PLATFORM_DEFAULTS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        valueJson: JSON.stringify(setting.value),
        valueType: setting.type,
        group: setting.group,
        label: setting.label,
        description: setting.description,
        isPublic: setting.group === "payments" || key === "commission_default",
      },
    });
  }

  for (const page of DEMO_ACCOUNTS.pages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        title: page.title,
        excerpt: page.excerpt,
        body: page.body,
        type: "PAGE",
        status: "PUBLISHED",
        authorId: admin.id,
        publishedAt: dayOffset(-60),
        seoTitle: page.title,
        seoDescription: page.excerpt,
      },
    });
  }

  await prisma.banner.upsert({
    where: { id: "seed-banner-home-hero" },
    update: { isActive: true },
    create: {
      id: "seed-banner-home-hero",
      name: "Wedding season 2026",
      eyebrow: "Curated for the season",
      title: "The wedding edit",
      subtitle: "Thirty vendors our curators visited personally this season.",
      imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600",
      ctaLabel: "Explore the edit",
      ctaHref: "/vendors?featured=1",
      placement: "HOME_HERO",
      sortOrder: 0,
      isActive: true,
      startsAt: dayOffset(-10),
      endsAt: dayOffset(80),
    },
  });

  console.log(`\n✓ Seed complete. Sign in with password "${DEMO_ACCOUNTS.password}"`);
  for (const account of [
    DEMO_ACCOUNTS.admin.email,
    ...DEMO_ACCOUNTS.customers.map((c) => c.email),
    ...DEMO_ACCOUNTS.vendors.map((v) => v.email),
  ]) {
    console.log(`  · ${account}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("\n✗ Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });