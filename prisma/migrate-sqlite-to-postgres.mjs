#!/usr/bin/env node
/**
 * Copy every row from the bundled SQLite database into Postgres.
 *
 * The repo ships prisma/dev.db with the full NCR inventory (1,468 listings,
 * 8,930 images, 378 operators). Hosted platforms — Vercel included — have a
 * read-only, ephemeral filesystem, so production must run Postgres. This moves
 * the data across once.
 *
 *   1. Provision Postgres (Vercel Postgres / Neon / Supabase).
 *   2. DATABASE_URL="postgres://…" npx prisma db push
 *   3. DATABASE_URL="postgres://…" node prisma/migrate-sqlite-to-postgres.mjs
 *   4. (optional) psql "$DATABASE_URL" -f prisma/postgres-fts.sql
 *
 * Flags:
 *   --sqlite=<path>   source file (default prisma/dev.db)
 *   --wipe            clear destination tables before inserting
 *   --dry-run         report row counts without writing
 *
 * Column types are read from prisma/schema.sqlite.prisma, so DateTime and
 * Boolean values are converted correctly without hand-maintained lists.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const WIPE = args.includes("--wipe");
const SQLITE_PATH = (args.find((a) => a.startsWith("--sqlite=")) || "").split("=")[1]
  || path.join(HERE, "dev.db");

// Bulk loading goes over the DIRECT connection: transaction poolers (Supabase
// Supavisor, PgBouncer) cap concurrent statements and break prepared statements,
// which makes a 25k-row load slow and flaky. Fall back to DATABASE_URL when no
// pooler is in play and DIRECT_URL was never set.
const TARGET_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!TARGET_URL || !/^postgres/.test(TARGET_URL)) {
  console.error(`
✖ Need a postgres:// connection string in DIRECT_URL (preferred) or DATABASE_URL.

  DIRECT_URL="postgres://user:pass@host:5432/db" node prisma/migrate-sqlite-to-postgres.mjs
`);
  process.exit(1);
}

if (/6543|pgbouncer=true/.test(TARGET_URL)) {
  console.warn("⚠  This looks like a POOLED URL. Use the direct connection (port 5432) for bulk loads.\n");
}

/** Parse the SQLite schema so we know which fields are dates/booleans/ints. */
function fieldTypes() {
  const schema = readFileSync(path.join(HERE, "schema.sqlite.prisma"), "utf8");
  const models = {};
  for (const m of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, name, body] = m;
    const fields = {};
    for (const line of body.split("\n")) {
      const f = line.trim().match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
      if (!f) continue;
      const [, field, type, isList] = f;
      if (isList) continue; // relation array, not a column
      if (["DateTime", "Boolean", "Int", "Float", "String"].includes(type)) fields[field] = type;
    }
    models[name] = fields;
  }
  return models;
}

/** Insert order respects foreign keys. */
const ORDER = [
  "City", "Locality", "Operator", "Amenity", "Role", "AdminUser",
  "Listing", "ListingImage", "ListingAmenity", "Plan", "Price", "AvailabilitySlot",
  "Author", "BlogCategory", "Tag", "BlogPost", "BlogPostTag",
  "Company", "Lead", "VisitBooking", "MeetingRoomRequest", "Review",
  "Media", "Faq", "SeoMeta", "ActivityLog", "Notification", "Setting",
];
/** Prisma delegate name for each model (lowercase first letter). */
const delegate = (m) => m[0].toLowerCase() + m.slice(1);

const types = fieldTypes();
const src = new DatabaseSync(SQLITE_PATH, { readOnly: true });
const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
const pg = new PrismaClient({ datasourceUrl: TARGET_URL });

console.log(`\n📦 source: ${SQLITE_PATH}`);
console.log(`🎯 target: ${TARGET_URL.replace(/:[^:@/]+@/, ":****@")}\n`);

if (WIPE && !DRY) {
  console.log("🧹 clearing destination tables…");
  for (const model of [...ORDER].reverse()) {
    try { await pg[delegate(model)].deleteMany({}); } catch { /* table may be empty */ }
  }
}

let grandTotal = 0;
const report = [];

for (const model of ORDER) {
  let rows;
  try {
    rows = src.prepare(`SELECT * FROM "${model}"`).all();
  } catch {
    report.push({ model, count: 0, note: "table missing in source" });
    continue;
  }
  if (!rows.length) { report.push({ model, count: 0 }); continue; }

  const spec = types[model] ?? {};
  const data = rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const t = spec[k];
      if (v === null || v === undefined) { out[k] = null; continue; }
      if (t === "DateTime") out[k] = v instanceof Date ? v : new Date(Number(v));
      else if (t === "Boolean") out[k] = Boolean(Number(v));
      else if (t === "Int") out[k] = Number(v);
      else if (t === "Float") out[k] = Number(v);
      else out[k] = v;
    }
    return out;
  });

  if (DRY) { report.push({ model, count: data.length, note: "dry-run" }); grandTotal += data.length; continue; }

  // chunked so large tables (8,930 images) don't blow the statement limit
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < data.length; i += CHUNK) {
    const slice = data.slice(i, i + CHUNK);
    try {
      const res = await pg[delegate(model)].createMany({ data: slice, skipDuplicates: true });
      written += res.count;
    } catch (e) {
      // fall back row-by-row so one bad record can't lose the whole chunk
      for (const rec of slice) {
        try { await pg[delegate(model)].create({ data: rec }); written++; }
        catch (err) { console.log(`   ! ${model}: skipped a row — ${err.message.split("\n")[0]}`); }
      }
    }
  }
  grandTotal += written;
  report.push({ model, count: written });
  console.log(`   ${model.padEnd(20)} ${written}`);
}

src.close();
await pg.$disconnect();

console.log(`\n${DRY ? "DRY RUN — nothing written." : "✅ migrated"} ${grandTotal} rows across ${report.filter(r => r.count).length} tables`);
if (DRY) console.log("Re-run without --dry-run to write.\n");
else console.log("\nNext: apply prisma/postgres-fts.sql, then set SEARCH_ENGINE=postgres.\n");
