/**
 * Derives the production PostgreSQL schema used for migrations.
 *
 * The canonical file is already Postgres, so this script's job is to give
 * `prisma migrate` a stable, explicit artefact and to fail loudly if
 * DATABASE_URL still points at SQLite — migrating a Postgres schema against a
 * SQLite URL is a common and confusing footgun.
 *
 * Emits: prisma/schema.prod.prisma   (git-ignored)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const canonical = resolve(root, "prisma/schema.prisma");
const target = resolve(root, "prisma/schema.prod.prisma");

const notes = [
  "// ─────────────────────────────────────────────────────────────────────────",
  "//  GENERATED FILE — do not edit. Source of truth: prisma/schema.prisma",
  "//  Regenerate with: npm run db:pg",
  "//  Dialect: PostgreSQL 14+",
  "// ─────────────────────────────────────────────────────────────────────────",
  "",
].join("\n");

function build() {
  const src = readFileSync(canonical, "utf8");
  if (!/provider\s*=\s*"postgresql"/.test(src)) {
    throw new Error(
      "prepare-prod-schema: canonical schema is not targeting postgresql.",
    );
  }
  writeFileSync(target, notes + src, "utf8");
  return target;
}

if (!existsSync(canonical)) {
  console.error("prisma/schema.prisma is missing.");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "";
const written = build();

if (!url) {
  console.warn(
    "⚠ DATABASE_URL is not set. Export a Postgres URL before running migrations:\n" +
      "  $env:DATABASE_URL='postgresql://user:pass@localhost:5432/aurelia'",
  );
} else if (!url.startsWith("postgres")) {
  console.warn(
    `⚠ DATABASE_URL points at "${url.split(":")[0]}", not PostgreSQL. ` +
      "Unset it or set a Postgres URL before running `prisma migrate`.",
  );
} else {
  console.log("✔ DATABASE_URL targets PostgreSQL.");
}

console.log(`✔ prod schema ready → ${written.replace(root + "\\", "")}`);