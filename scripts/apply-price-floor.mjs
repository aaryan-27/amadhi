#!/usr/bin/env node
/**
 * Apply Amadhi's published minimum price (₹5,999) to monthly workspace pricing.
 *
 * Scope — deliberately narrow:
 *   ✔ period = "month"      (coworking, dedicated desk, private cabin, managed office)
 *   ✘ period = "sqft_month" (office leasing is ₹25–450 per sq ft — a floor here is nonsense)
 *   ✘ virtual office / meeting rooms — no published pricing, quoted on request
 *
 *   node scripts/apply-price-floor.mjs            # report only
 *   node scripts/apply-price-floor.mjs --commit   # write
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${path.join(PROJECT, "prisma", "dev.db")}`;
const COMMIT = process.argv.includes("--commit");
export const PRICE_FLOOR = 5999;

const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
const db = new PrismaClient();

const targets = await db.price.findMany({
  where: { period: "month", amount: { lt: PRICE_FLOOR } },
  select: { id: true, amount: true, plan: { select: { productType: true } } },
});
const byType = {};
for (const t of targets) byType[t.plan.productType] = (byType[t.plan.productType] ?? 0) + 1;

console.log(`\n₹${PRICE_FLOOR} floor — monthly prices below it: ${targets.length}`);
console.log(`   ${JSON.stringify(byType)}`);

if (!COMMIT) {
  console.log(`\nDRY RUN — nothing written. Add --commit to apply.\n`);
} else {
  await db.price.updateMany({
    where: { period: "month", amount: { lt: PRICE_FLOOR } },
    data: { amount: PRICE_FLOOR },
  });
  console.log(`   ✅ raised ${targets.length} prices to ₹${PRICE_FLOOR}`);
}

console.log(`\nMinimums now:`);
for (const t of ["coworking", "dedicated_desk", "private_cabin", "managed_office", "office_leasing"]) {
  const r = await db.price.findFirst({ where: { plan: { productType: t } }, orderBy: { amount: "asc" }, select: { amount: true, period: true } });
  if (r) console.log(`   ${t.padEnd(16)} ₹${r.amount} / ${r.period}`);
}
const med = async (t) => {
  const a = (await db.price.findMany({ where: { plan: { productType: t }, period: "month" }, orderBy: { amount: "asc" }, select: { amount: true } })).map((x) => x.amount);
  return a.length ? a[Math.floor(a.length / 2)] : null;
};
console.log(`   median coworking: ₹${await med("coworking")}`);
await db.$disconnect();
console.log("");
