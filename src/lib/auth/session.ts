/**
 * Session + RBAC.
 *
 * Sessions are stateless JWTs in an httpOnly, SameSite=Lax cookie, backed by a
 * Session row for revocation (logout-all, role change, admin suspension). The
 * JWT carries only the user id and role; everything authorisation-related is
 * re-read from the database so a suspended user loses access immediately
 * rather than at token expiry.
 *
 * Server Components call `requireUser` / `requireRole`; Route Handlers call
 * the `api` helpers in lib/api.ts. Both read the same cookie.
 */

import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role, StaffPermission, StaffRole, VendorStatus } from "@/lib/constants";
import { STAFF_ROLE_PERMISSIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "aurelia_session";

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 14);

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "dev-only-change-me-in-production-0000000000",
  );
}

/* ──────────────────────────── Passwords ──────────────────────────────── */

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string | null) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/* ───────────────────────────── Tokens ────────────────────────────────── */

export interface SessionPayload {
  sub: string;
  role: Role;
  sid: string;
}

export async function createToken(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, sid: payload.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret());
}

export async function readToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.sid !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      sid: payload.sid,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

/* ─────────────────────────── Current user ────────────────────────────── */

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  vendorProfileId: string | null;
  vendorSlug: string | null;
  vendorStatus: VendorStatus | null;
  staffRole: StaffRole | null;
  staffPermissions: StaffPermission[];
}

async function loadUser(userId: string, sessionId: string): Promise<CurrentUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.userId !== userId || session.expiresAt < new Date()) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      city: true,
      state: true,
      vendorProfile: {
        select: { id: true, slug: true, status: true },
      },
      staffMemberships: {
        where: { status: "ACTIVE" },
        select: { role: true, permissionsJson: true, vendorProfileId: true },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const membership = user.staffMemberships[0];

  const staffRole = (membership?.role as StaffRole | undefined) ?? null;

  let permissions: StaffPermission[] = [];
  if (membership) {
    const byRole = staffRole ? STAFF_ROLE_PERMISSIONS[staffRole] ?? [] : [];
    try {
      const explicit = JSON.parse(membership.permissionsJson || "[]") as StaffPermission[];
      permissions = explicit.length ? explicit : byRole;
    } catch {
      permissions = byRole;
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatarUrl: user.avatarUrl,
    city: user.city,
    state: user.state,
    vendorProfileId: user.vendorProfile?.id ?? membership?.vendorProfileId ?? null,
    vendorSlug: user.vendorProfile?.slug ?? null,
    vendorStatus: (user.vendorProfile?.status as VendorStatus) ?? null,
    staffRole,
    staffPermissions: permissions,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await readToken(token);
  if (!payload) return null;

  return loadUser(payload.sub, payload.sid);
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You need to sign in to continue.");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("You do not have access to this area.", 403);
  }
  return user;
}

/** Vendor owners and admins only — staff sub-accounts are excluded. */
export async function requireVendorOwner(): Promise<CurrentUser & { vendorProfileId: string }> {
  const user = await requireUser();
  if (user.role === "ADMIN") {
    throw new AuthError("Admins manage vendors through the admin console.", 403);
  }
  if (user.role !== "VENDOR" || !user.vendorProfileId) {
    throw new AuthError("This area is for registered vendors.", 403);
  }
  if (user.staffRole) {
    throw new AuthError("This section is restricted to the business owner.", 403);
  }
  return user as CurrentUser & { vendorProfileId: string };
}

export async function requireVendorAccess(permission?: StaffPermission) {
  const user = await requireUser();
  if (!user.vendorProfileId) {
    throw new AuthError("This area is for registered vendors.", 403);
  }
  if (permission && !user.staffPermissions.includes(permission)) {
    throw new AuthError("You do not have permission for this action.", 403);
  }
  return user as CurrentUser & { vendorProfileId: string };
}

/* ───────────────────────── Session lifecycle ─────────────────────────── */

export async function startSession(input: {
  userId: string;
  role: Role;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const row = await prisma.session.create({
    data: {
      userId: input.userId,
      token: crypto.randomUUID(),
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000),
    },
    select: { id: true },
  });

  const token = await createToken({
    sub: input.userId,
    role: input.role,
    sid: row.id,
  });

  return { sessionId: row.id, token };
}

export async function destroySession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Called on privilege change so a stale cookie cannot outlive it. */
export async function invalidateUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export { SESSION_TTL_DAYS };