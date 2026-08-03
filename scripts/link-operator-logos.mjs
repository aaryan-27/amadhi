#!/usr/bin/env node
/**
 * Attach the operator logos we hold (extracted from the Amadhi brochure) to the
 * matching operator records imported from the myHQ inventory.
 *
 *   node scripts/link-operator-logos.mjs            # preview matches
 *   node scripts/link-operator-logos.mjs --commit   # write logoUrl
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${path.join(PROJECT, "prisma", "dev.db")}`;
const COMMIT = process.argv.includes("--commit");

/** logo file → pattern that identifies the operator by name */
const LOGOS = [
  { file: "/partners/altf.png", match: /^alt\.?\s*f\b/i },
  { file: "/partners/regus.png", match: /^regus\b/i },
  { file: "/partners/cowrks.png", match: /^cowrks\b/i },
  { file: "/partners/circlework.png", match: /circle\s*\.?\s*work/i },
  { file: "/partners/ofissquare.png", match: /ofis\s*square/i },
  { file: "/partners/springhouse.png", match: /spring\s*house/i },
  { file: "/partners/91springboard.png", match: /^91\s*spring/i },
  { file: "/partners/smartworks.png", match: /^smartworks\b/i },
  { file: "/partners/urbanwrk.png", match: /urb[a4]nwrk|urban\s*wrk/i },
  { file: "/partners/awfis.png", match: /^awfis\b/i },
  { file: "/partners/incuspaze.png", match: /^incuspaze\b/i },
  { file: "/partners/synqwork.png", match: /^synq\s*\.?\s*work/i },
  { file: "/partners/tablespace.png", match: /^table\s*space\b/i },
  { file: "/partners/supremework.png", match: /^supremework\b/i },
  { file: "/partners/wework.png", match: /^wework\b/i },
  { file: "/partners/simpliwork.png", match: /^simpliwork\b/i },
  { file: "/partners/aihp.png", match: /^aihp\b/i },
  { file: "/partners/innov8.png", match: /^innov8\b/i },
  { file: "/partners/theofficepass.png", match: /^the\s*office\s*pass\b/i },
  { file: "/partners/spacetime.png", match: /^spacetime\b/i },
  { file: "/partners/executivecentre.png", match: /^the\s*executive\s*cent(re|er)\b/i },
];

const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
const db = new PrismaClient();

const operators = await db.operator.findMany({ include: { _count: { select: { listings: true } } } });
let matched = 0;
for (const logo of LOGOS) {
  const hits = operators.filter((o) => logo.match.test(o.name));
  if (!hits.length) { console.log(`   —  no operator matches ${logo.file}`); continue; }
  for (const o of hits) {
    console.log(`   ✔  ${o.name.padEnd(28)} (${o._count.listings} listings) → ${logo.file}`);
    if (COMMIT) await db.operator.update({ where: { id: o.id }, data: { logoUrl: logo.file } });
    matched++;
  }
}

const withLogo = COMMIT ? await db.operator.count({ where: { NOT: { logoUrl: "" } } }) : matched;
console.log(`\n${COMMIT ? "linked" : "would link"} ${matched} operators; operators with a logo: ${withLogo} of ${operators.length}`);
if (!COMMIT) console.log("Add --commit to write.\n");
await db.$disconnect();
