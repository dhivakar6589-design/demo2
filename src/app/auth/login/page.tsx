import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, AuthInlineLink } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to track quotes, bookings and saved vendors on Aurelia.",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);

  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(next);

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Your quotes, bookings and saved vendors are exactly where you left them."
      footer={
        <>
          New to Aurelia?{" "}
          <AuthInlineLink href={next === "/dashboard" ? "/auth/register" : `/auth/register?next=${encodeURIComponent(next)}`}>
            Create an account
          </AuthInlineLink>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
