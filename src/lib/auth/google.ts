/**
 * Google OAuth 2.0 (Authorization Code flow).
 *
 * Deliberately env-gated: the button and the whole route tree only exist when
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are present, so a fresh clone with
 * zero credentials boots cleanly with email/password only.
 *
 * The provider handles account linking by email: an existing local account with
 * a matching email and no linked Google subject gets its googleSub populated,
 * which is the behaviour users expect from "Sign in with Google" on a site
 * they already registered on.
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPE = "openid email profile";

export const GOOGLE_STATE_COOKIE = "aurelia_google_state";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`
  );
}

export function buildAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "offline",
    prompt: "select_account",
    // Force a fresh Google account selection so a shared device can't silently
    // sign in as the previous user.
    hd: "",
  });
  params.delete("hd");
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export function newState() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return (await res.json()) as { access_token: string; id_token?: string };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google profile fetch failed: ${res.status}`);
  return (await res.json()) as GoogleProfile;
}

/**
 * Resolve a Google profile to a local user, creating one if needed.
 * Never links across a mismatched email — that would be an account takeover.
 */
export async function upsertGoogleUser(profile: GoogleProfile) {
  if (!profile.emailVerified) {
    throw new Error("Your Google account email is not verified.");
  }

  const existingByGoogle = await prisma.user.findUnique({
    where: { googleSub: profile.sub },
  });
  if (existingByGoogle) return existingByGoogle;

  const existingByEmail = await prisma.user.findUnique({
    where: { email: profile.email.toLowerCase() },
  });

  if (existingByEmail) {
    if (existingByEmail.passwordHash && existingByEmail.googleSub === null) {
      // Safe to link: the user proved ownership of this email via Google.
      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleSub: profile.sub,
          emailVerified: existingByEmail.emailVerified ?? new Date(),
          avatarUrl: existingByEmail.avatarUrl ?? profile.picture ?? null,
        },
      });
    }
    return existingByEmail;
  }

  return prisma.user.create({
    data: {
      email: profile.email.toLowerCase(),
      name: profile.name,
      avatarUrl: profile.picture ?? null,
      googleSub: profile.sub,
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: new Date(),
      marketing: false,
      dataConsentAt: new Date(),
    },
  });
}

/** Read + clear the CSRF state cookie. */
export async function consumeState(expected: string | null) {
  if (!expected) return false;
  const jar = await cookies();
  const stored = jar.get(GOOGLE_STATE_COOKIE)?.value;
  const ok =
    Boolean(stored) &&
    stored === expected &&
    stored.length >= 20;
  if (stored) jar.delete(GOOGLE_STATE_COOKIE);
  return ok;
}