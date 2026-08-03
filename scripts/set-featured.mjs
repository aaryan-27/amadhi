#!/usr/bin/env node
/**
 * Flag a spread of real listings as featured/trending so the homepage
 * "Featured spaces" carousel and trending badges have content.
 *   node scripts/set-featured.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, "..");
function readEnv(key) {
  try {
    const txt = readFileSync(path.resolve(PROJECT, ".env"), "utf8");
    const m = txt.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
    return m ? m[1] : null;
  } catch { return null; }
}
process.env.DATABASE_URL = process.env.DATABASE_URL || readEnv("DATABASE_URL") || "file:./dev.db";

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

// reset any existing flags first (idempotent)
await db.listing.updateMany({ data: { featured: false, trending: false } });

// pick published, priced listings — a few per city — favour higher capacity
const cities = await db.city.findMany({ select: { id: true, slug: true } });
let featured = 0, trending = 0;
for (const c of cities) {
  const rows = await db.listing.findMany({
    where: { status: "published", cityId: c.id, plans: { some: { productType: "coworking" } } },
    orderBy: [{ capacity: "desc" }],
    select: { id: true },
    take: 8,
  });
  const feat = rows.slice(0, 4).map((r) => r.id);
  const trend = rows.slice(4, 8).map((r) => r.id);
  if (feat.length) { await db.listing.updateMany({ where: { id: { in: feat } }, data: { featured: true } }); featured += feat.length; }
  if (trend.length) { await db.listing.updateMany({ where: { id: { in: trend } }, data: { trending: true } }); trending += trend.length; }
}

await db.$disconnect();
console.log(`\n✅ Marked ${featured} listings featured and ${trending} trending (across ${cities.length} cities).\n`);
