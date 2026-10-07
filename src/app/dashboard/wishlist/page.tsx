import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, Search } from "lucide-react";
import { RemoveFromWishlist } from "@/components/dashboard/wishlist-heart";
import { VendorCard, type VendorCardData } from "@/components/vendor/vendor-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Vendors you have saved on Aurelia.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login?next=/dashboard/wishlist");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      vendorProfile: {
        select: {
          id: true,
          slug: true,
          businessName: true,
          tagline: true,
          baseCity: true,
          coverImageUrl: true,
          logoUrl: true,
          ratingAvg: true,
          ratingCount: true,
          completedOrders: true,
          fromPrice: true,
          pricingModel: true,
          instantBookable: true,
          isFeatured: true,
          minGuests: true,
          primaryCategory: { select: { name: true } },
          tags: { select: { tag: { select: { label: true } } }, take: 3 },
        },
      },
    },
  });

  const vendors: VendorCardData[] = items.map((item) => ({
    id: item.vendorProfile.id,
    slug: item.vendorProfile.slug,
    businessName: item.vendorProfile.businessName,
    tagline: item.vendorProfile.tagline,
    baseCity: item.vendorProfile.baseCity,
    coverImageUrl: item.vendorProfile.coverImageUrl,
    logoUrl: item.vendorProfile.logoUrl,
    ratingAvg: item.vendorProfile.ratingAvg,
    ratingCount: item.vendorProfile.ratingCount,
    completedOrders: item.vendorProfile.completedOrders,
    fromPrice: item.vendorProfile.fromPrice,
    pricingModel: item.vendorProfile.pricingModel,
    instantBookable: item.vendorProfile.instantBookable,
    isFeatured: item.vendorProfile.isFeatured,
    minGuests: item.vendorProfile.minGuests,
    primaryCategoryName: item.vendorProfile.primaryCategory?.name ?? null,
    topTags: item.vendorProfile.tags.map((row) => row.tag.label),
  }));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h2 className="text-display text-2xl">Wishlist</h2>
          <p className="mt-2 measure text-sm leading-relaxed text-body">
            Shortlisted vendors, kept in one place while you compare. Removing one doesn&rsquo;t
            cancel anything — you have no obligation until you accept a quote.
          </p>
        </div>

        <span className="tnum text-2xs text-subtle">
          {vendors.length} saved
        </span>
      </header>

      {vendors.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="relative">
              <RemoveFromWishlist
                vendorProfileId={vendor.id}
                vendorName={vendor.businessName}
                className="absolute right-3 top-3 z-20"
              />
              <VendorCard vendor={vendor} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          icon={HeartHandshake}
          title="Nothing saved yet"
          description="Tap the heart on a vendor to keep them here while you narrow down your shortlist."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="sm">
                <Link href="/vendors">
                  <Search className="size-4" />
                  Browse vendors
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/quotes">View my quotes</Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
