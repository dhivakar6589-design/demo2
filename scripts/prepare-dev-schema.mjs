/**
 * Derives the zero-config development schema.
 *
 * Aurelia's canonical model targets PostgreSQL. SQLite needs no server, which
 * makes `npm run dev` instant for reviewers, so we emit an identical schema
 * with a single dialect swap. The portability contract documented at the top
 * of prisma/schema.prisma (no enums, no scalar lists, no @db.* attributes)
 * guarantees this rewrite is lossless.
 *
 * Emits: prisma/schema.dev.prisma   (git-ignored)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const canonical = resolve(root, "prisma/schema.prisma");
const target = resolve(root, "prisma/schema.dev.prisma");

const dialectNotes = [
  "// ─────────────────────────────────────────────────────────────────────────",
  "//  GENERATED FILE — do not edit. Source of truth: prisma/schema.prisma",
  "//  Regenerate with: npm run db:sqlite",
  "//  Dialect: SQLite (local development). Behaviour is equivalent to the",
  "//  PostgreSQL canonical schema for every query this application issues.",
  "// ─────────────────────────────────────────────────────────────────────────",
  "",
].join("\n");

function build() {
  const src = readFileSync(canonical, "utf8");
  const out = src.replace(
    /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"postgresql"/s,
    '$1"sqlite"',
  );
  if (out === src) {
    throw new Error(
      "prepare-dev-schema: could not rewrite the datasource provider. " +
        "The canonical schema may have changed shape — update this script.",
    );
  }
  writeFileSync(target, dialectNotes + out, "utf8");
  return target;
}

if (!existsSync(canonical)) {
  console.error("prisma/schema.prisma is missing.");
  process.exit(1);
}

const written = build();
console.log(`✔ dev schema ready → ${written.replace(root + "\\", "")}`);