/**
 * Sensitive-field encryption (AES-256-GCM).
 *
 * Vendor bank account numbers are the only genuinely sensitive value we hold,
 * and storing them in plaintext in a database that ops staff can browse is an
 * unacceptable trade. Values are encrypted with a key derived from AUTH_SECRET
 * so there is one secret to rotate, and are stored as
 *
 *     v1:<iv>:<authTag>:<ciphertext>   (all base64url)
 *
 * The version prefix leaves room to rotate the scheme without a migration.
 *
 * Caveat worth stating plainly: this protects the database at rest. It does not
 * protect against an attacker who already has the application secret, and it is
 * not a substitute for a KMS/HSM in a regulated deployment. docs/SCHEMA.md
 * notes the production upgrade path.
 */

import crypto from "node:crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm";

function key() {
  const secret =
    process.env.AUTH_SECRET ?? "dev-only-change-me-in-production-0000000000";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(":");
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const [version, ivB64, tagB64, ctB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Last four digits for display — safe to store in plaintext alongside. */
export function last4(value: string) {
  return value.replace(/\D/g, "").slice(-4);
}

/** Mask an Indian bank account / PAN / GSTIN for admin views. */
export function maskIdentifier(value: string | null | undefined, visible = 4) {
  if (!value) return "—";
  const compact = value.replace(/\s/g, "");
  if (compact.length <= visible) return compact;
  return `${"•".repeat(Math.min(compact.length - visible, 8))}${compact.slice(-visible)}`;
}

/** Deterministic, non-reversible lookup key for "does this account exist?". */
export function blindIndex(value: string) {
  return crypto
    .createHmac("sha256", key())
    .update(value.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

/* ─────────────────────────── Webhook signing ─────────────────────────── */

export function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}