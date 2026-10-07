import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, AuthInlineLink } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join Aurelia to collect quotes, compare vendors and manage every booking for your events.",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);

  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(next);

  return (
    <AuthShell
      eyebrow="Join Aurelia"
      title="Create your account"
      subtitle="Free to join. Send enquiries, compare real totals and keep every vendor conversation in one place."
      footer={
        <>
          Already have an account?{" "}
          <AuthInlineLink href={next === "/dashboard" ? "/auth/login" : `/auth/login?next=${encodeURIComponent(next)}`}>
            Sign in
          </AuthInlineLink>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
