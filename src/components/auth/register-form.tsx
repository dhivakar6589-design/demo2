"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Checkbox } from "@/components/ui/input";
import { apiRequest } from "@/lib/client";
import { cn } from "@/lib/utils";

interface RegisterData {
  redirectTo: string;
}

const RULES = [
  { test: (v: string) => v.length >= 10, label: "10 characters or more" },
  { test: (v: string) => /[a-z]/.test(v), label: "one lowercase letter" },
  { test: (v: string) => /[A-Z]/.test(v), label: "one uppercase letter" },
  { test: (v: string) => /[0-9]/.test(v), label: "one number" },
];

/**
 * Account creation.
 *
 * The password rules are mirrored from `passwordField` in lib/validations as
 * a live checklist so the form never fails a submit the user could have seen
 * coming — the server remains the authority either way.
 */
export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string[]>>({});

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setFormError(null);
    setFields({});

    const form = new FormData(event.currentTarget);
    const endpoint = next ? `/api/auth/register?next=${encodeURIComponent(next)}` : "/api/auth/register";
    const result = await apiRequest<RegisterData>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        password: String(form.get("password") ?? ""),
        confirmPassword: String(form.get("confirmPassword") ?? ""),
        role: "CUSTOMER",
        city: String(form.get("city") ?? ""),
        marketing: form.get("marketing") === "on",
        acceptTerms: form.get("acceptTerms") === "on",
      }),
    });

    if (!result.ok) {
      setFormError(result.message);
      setFields(result.fields);
      setBusy(false);
      return;
    }

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
        <Label htmlFor="name" required>
          Full name
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Ananya Sharma"
          required
          aria-invalid={fields.name ? true : undefined}
        />
        {fields.name ? <p className="text-xs text-danger">{fields.name[0]}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
          />
          {fields.email ? <p className="text-xs text-danger">{fields.email[0]}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            aria-invalid={fields.phone ? true : undefined}
          />
          {fields.phone ? <p className="text-xs text-danger">{fields.phone[0]}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Create a password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fields.password ? true : undefined}
          aria-describedby="password-rules"
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
        <ul id="password-rules" className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
          {RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.label}
                className={cn("text-2xs transition-colors", met ? "text-success" : "text-subtle")}
              >
                <span aria-hidden>{met ? "✓ " : "· "}</span>
                {rule.label}
              </li>
            );
          })}
        </ul>
        {fields.password ? <p className="text-xs text-danger">{fields.password[0]}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" required>
          Confirm password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repeat it"
          required
          aria-invalid={fields.confirmPassword ? true : undefined}
        />
        {fields.confirmPassword ? (
          <p className="text-xs text-danger">{fields.confirmPassword[0]}</p>
        ) : null}
      </div>

      <div className="space-y-3 pt-1">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-body">
          <Checkbox name="acceptTerms" id="acceptTerms" required className="mt-0.5" />
          <span>
            I agree to the terms of service and privacy policy.
            {fields.acceptTerms ? (
              <span className="mt-1 block text-xs text-danger">{fields.acceptTerms[0]}</span>
            ) : null}
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-body">
          <Checkbox name="marketing" id="marketing" className="mt-0.5" />
          <span>
            Send me occasional collection drops and planning guides.
            <span className="mt-0.5 block text-xs text-subtle">No vendor spam, ever.</span>
          </span>
        </label>
      </div>

      <Button type="submit" block size="lg" loading={busy}>
        {!busy ? <Sparkles className="size-4" /> : null}
        {busy ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
