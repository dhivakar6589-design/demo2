import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { CATEGORY_NAV } from "@/lib/constants";

const COLUMNS = [
  {
    title: "For customers",
    links: [
      { href: "/vendors", label: "Find vendors" },
      { href: "/compare", label: "Compare shortlisted vendors" },
      { href: "/vendors?instant=1", label: "Instant booking" },
      { href: "/vendors?dietary=VEG", label: "Vegetarian & Jain menus" },
      { href: "/how-it-works", label: "How escrow works" },
    ],
  },
  {
    title: "For vendors",
    links: [
      { href: "/vendor/onboarding", label: "List your business" },
      { href: "/vendor/dashboard", label: "Vendor dashboard" },
      { href: "/vendor/dashboard/listings", label: "Packages & menus" },
      { href: "/vendor/dashboard/availability", label: "Availability calendar" },
      { href: "/vendor/fees", label: "Fees & payouts" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Aurelia" },
      { href: "/curation", label: "How we curate" },
      { href: "/careers", label: "Careers" },
      { href: "/press", label: "Press" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/legal/terms", label: "Terms of service" },
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/refunds", label: "Cancellation & refunds" },
      { href: "/legal/grievance", label: "Grievance officer" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-surface-raised/45">
      <div className="container-page">
        {/* Trust strip: the three promises the marketplace actually makes. */}
        <div className="grid gap-6 border-b border-line py-10 sm:grid-cols-3">
          <Promise
            title="Escrow-protected payments"
            body="Funds are held by the platform and released to the vendor only after your event is completed."
          />
          <Promise
            title="Every vendor is vetted"
            body="GST, FSSAI and PAN verification, plus a human curation review, before a listing goes live."
          />
          <Promise
            title="Transparent pricing"
            body="Taxes, deposits and cancellation terms are shown before you pay — never in a footnote."
          />
        </div>

        <div className="grid gap-12 py-14 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="measure mt-5 text-sm leading-relaxed text-body">
              Aurelia is a curated marketplace connecting India&apos;s finest event planners,
              caterers and venue partners with people who want an occasion handled properly.
            </p>

            <address className="mt-7 space-y-3 not-italic">
              <p className="flex items-start gap-2.5 text-sm text-body">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent-muted" />
                <span>
                  12 Altamount Road, Bandra West
                  <br />
                  Mumbai 400050, India
                </span>
              </p>
              <p className="flex items-center gap-2.5 text-sm text-body">
                <Phone className="size-4 shrink-0 text-accent-muted" />
                <a href="tel:+912266778899" className="link-underline">
                  +91 22 6677 8899
                </a>
              </p>
              <p className="flex items-center gap-2.5 text-sm text-body">
                <Mail className="size-4 shrink-0 text-accent-muted" />
                <a href="mailto:concierge@aurelia.events" className="link-underline">
                  concierge@aurelia.events
                </a>
              </p>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-overline">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-body transition-colors hover:text-heading"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-t border-line py-7">
          <p className="text-overline mb-4">Browse by category</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-2">
            {CATEGORY_NAV.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/vendors?category=${category.slug}`}
                  className="inline-flex rounded-full border border-line px-3 py-1.5 text-xs text-body transition-colors hover:border-accent/40 hover:text-accent-muted"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-7 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Aurelia Experiences Pvt. Ltd. · CIN U74999MH2024PTC000000 · All rights
            reserved.
          </p>
          <p className="flex items-center gap-4">
            <span>GSTIN 27AABCA1234C1ZV</span>
            <span aria-hidden className="h-3 w-px bg-line" />
            <span>Prices shown in INR, inclusive of applicable taxes</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function Promise({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-base font-medium text-heading">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-body">{body}</p>
    </div>
  );
}