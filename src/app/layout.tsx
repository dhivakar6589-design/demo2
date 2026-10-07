import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/lib/auth/session";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { cn } from "@/lib/utils";
import "./globals.css";

/* Fonts are loaded through next/font so they're self-hosted, preloaded and
   subset — no render-blocking request to a third party, no layout shift. */

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aurelia — Exceptional vendors for unforgettable events",
    template: "%s · Aurelia",
  },
  description:
    "Aurelia is a curated marketplace for India's finest event planners, caterers and venue partners. Curated collections, transparent pricing, and escrow-protected payments.",
  keywords: [
    "event management",
    "catering marketplace",
    "wedding vendors India",
    "corporate catering",
    "event planners",
    "banquet halls",
  ],
  authors: [{ name: "Aurelia" }],
  creator: "Aurelia",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Aurelia",
    title: "Aurelia — Exceptional vendors for unforgettable events",
    description:
      "A curated marketplace for India's finest event planners, caterers and venue partners.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurelia",
    description: "Exceptional vendors for unforgettable events.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "shopping",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1B2D" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved once per request and passed down so the header renders the right
  // account state without a client-side session fetch.
  const user = await getCurrentUser().catch(() => null);

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={cn(inter.variable, playfair.variable, mono.variable)}
    >
      <body className="min-h-dvh bg-background text-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to content
        </a>

        <Providers user={user}>
          <div className="flex min-h-dvh flex-col">
            {/* The header reads the query string (active search, pre-filled
                city), which opts the shell out of static prerendering unless it
                sits behind a boundary. The fallback reserves the same height so
                navigation never shifts. */}
            <Suspense fallback={<HeaderFallback />}>
              <SiteHeader />
            </Suspense>
            <main id="main" className="flex-1 pb-16 lg:pb-0">
              {children}
            </main>
            <SiteFooter />
          </div>
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}

/** Matches the sticky header's height so the fallback swap is invisible. */
function HeaderFallback() {
  return (
    <div aria-hidden className="h-16 border-b border-line bg-surface/80 backdrop-blur-md" />
  );
}