import Link from "next/link";
import { BadgeCheck, Sparkles, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";

/**
 * Shared chrome for /auth/*.
 *
 * Two columns on desktop: the promise on the left, the form on the right, so
 * the form itself stays a single narrow measure regardless of viewport. The
 * marketing column collapses on small screens where the form is the only
 * thing worth seeing.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-10 py-10 md:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
      <section className="hidden lg:flex lg:flex-col lg:justify-center">
        <p className="eyebrow">
          <span className="eyebrow-rule" />
          {eyebrow}
        </p>

        <h1 className="text-display mt-5 text-[clamp(2.25rem,3.6vw,3.5rem)]">
          Every event you plan,
          <br />
          <span className="italic text-accent-muted">held together.</span>
        </h1>

        <p className="measure mt-5 text-base leading-relaxed text-body">
          Quotes, bookings, payments and vendors — one account for the whole journey, from
          first enquiry to the final invoice.
        </p>

        <ul className="mt-9 space-y-4">
          {[
            {
              icon: Sparkles,
              title: "One enquiry, every vendor",
              body: "Send a brief once and collect comparable quotes with real totals, taxes included.",
            },
            {
              icon: BadgeCheck,
              title: "Verified partners only",
              body: "Every listing is reviewed for licences, references and delivery history.",
            },
            {
              icon: ShieldCheck,
              title: "Deposits protected",
              body: "Payment schedules and refunds follow a published policy, not a negotiation.",
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent-soft/60">
                <item.icon className="size-4 text-accent-muted" />
              </span>
              <div>
                <p className="text-sm font-medium text-heading">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-body">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Logo />
        </div>

        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-display mt-3 text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">{subtitle}</p>

        <div className="mt-8">{children}</div>

        {footer ? <div className="mt-7 text-center text-sm text-body">{footer}</div> : null}

        <p className="mt-8 text-center text-2xs text-subtle">
          By continuing you agree to Aurelia&rsquo;s terms and privacy policy.
        </p>
      </section>
    </div>
  );
}

export function AuthInlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-accent-muted underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}
