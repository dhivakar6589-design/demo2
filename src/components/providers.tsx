"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/overlays";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/session-provider";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Single client boundary for the whole app.
 *
 * Order matters: theme must be set before anything paints, the session is
 * needed by the header, and the tooltip/toast layers mount last so they sit
 * above everything without needing a portal per call site.
 */
export function Providers({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="aurelia-theme"
    >
      <SessionProvider user={user}>
        <TooltipProvider delayDuration={220} skipDelayDuration={400}>
          {children}
          <Toaster
            position="bottom-right"
            offset={24}
            duration={4200}
            visibleToasts={3}
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-xl !border !border-line !bg-surface !text-body !shadow-[var(--shadow-xl)]",
                title: "!font-display !text-heading",
                description: "!text-body",
                actionButton: "!bg-primary !text-primary-foreground",
                cancelButton: "!bg-muted !text-body",
                error: "!border-danger/30",
                success: "!border-success/30",
              },
            }}
          />
        </TooltipProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}