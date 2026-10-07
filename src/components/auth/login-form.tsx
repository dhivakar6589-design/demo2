"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiRequest } from "@/lib/client";

interface LoginData {
  redirectTo: string;
}

/**
 * Password sign-in.
 *
 * Field-level errors from the API are rendered against their inputs; a
 * credential failure has no field, so it lands in the alert above the form.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string[]>>({});

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setFormError(null);
    setFields({});

    const form = new FormData(event.currentTarget);
    const result = await apiRequest<LoginData>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        ...(next ? { redirectTo: next } : {}),
      }),
    });

    if (!result.ok) {
      setFormError(result.message);
      setFields(result.fields);
      setBusy(false);
      return;
    }

    // Full navigation rather than a client transition: the root layout reads
    // the session cookie server-side, and a hard push guarantees the header
    // re-renders signed in.
    router.push(result.data?.redirectTo ?? "/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {formError ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger-soft/70 px-4 py-3 text-sm text-danger"
        >
          {formError}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-invalid={fields.email ? true : undefined}
          aria-describedby={fields.email ? "email-error" : undefined}
        />
        {fields.email ? (
          <p id="email-error" className="text-xs text-danger">
            {fields.email[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Your password"
          required
          aria-invalid={fields.password ? true : undefined}
          aria-describedby={fields.password ? "password-error" : undefined}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="grid size-8 place-items-center rounded-md text-subtle transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        {fields.password ? (
          <p id="password-error" className="text-xs text-danger">
            {fields.password[0]}
          </p>
        ) : null}
      </div>

      <Button type="submit" block size="lg" loading={busy}>
        {!busy ? <LogIn className="size-4" /> : null}
        {busy ? "Signing you in…" : "Sign in"}
      </Button>
    </form>
  );
}
