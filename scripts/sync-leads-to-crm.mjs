#!/usr/bin/env node
/**
 * Copy every lead in the website admin panel into Amadhi CRM.
 *   node scripts/sync-leads-to-crm.mjs            # send all leads
 *   node scripts/sync-leads-to-crm.mjs --dry-run  # count only
 *
 * Safe to re-run: the CRM skips any lead whose website id it already has.
 * Historical leads keep their original date, pipeline status and notes, and
 * do not trigger "new lead" emails, follow-up tasks or SLA timers.
 * Needs CRM_URL, CRM_API_KEY, CRM_API_SECRET (env or .env).
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
for (const key of ["DATABASE_URL", "CRM_URL", "CRM_API_KEY", "CRM_API_SECRET"]) {
  process.env[key] = process.env[key] || readEnv(key) || "";
}
const { CRM_URL, CRM_API_KEY, CRM_API_SECRET } = process.env;
const dryRun = process.argv.includes("--dry-run");
if (!dryRun && (!CRM_URL || !CRM_API_KEY || !CRM_API_SECRET)) {
  console.error("CRM_URL, CRM_API_KEY and CRM_API_SECRET must be set.");
  process.exit(1);
}

// Mirrors PRODUCTS in src/lib/site.ts.
const PRODUCT_NAMES = {
  coworking: "Coworking Space",
  managed_office: "Managed Office",
  private_cabin: "Private Cabin",
  dedicated_desk: "Dedicated Desk",
  meeting_room: "Meeting Room",
  office_leasing: "Office Leasing",
  virtual_office: "Virtual Office",
};
const SITE_DOMAIN = "https://www.amadhi.com";

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

const leads = await db.lead.findMany({
  orderBy: { createdAt: "asc" },
  include: { city: true, locality: true, listing: true, company: true },
});
console.log(`${leads.length} leads in the admin panel`);
if (dryRun) {
  await db.$disconnect();
  process.exit(0);
}

function parseJson(text, fallback) {
  try { return JSON.parse(text); } catch { return fallback; }
}

let created = 0, skipped = 0, failed = 0;
for (const lead of leads) {
  const body = {
    backfill: true,
    website_lead_id: lead.id,
    created_at: lead.createdAt.toISOString(),
    pipeline_status: lead.status,
    notes: parseJson(lead.notesJson, []),
    enquiry_type: lead.type,
    lead_name: lead.name,
    phone: lead.phone || null,
    email: lead.email || null,
    message: lead.message || null,
    company: lead.company?.name ?? null,
    workspace_type: PRODUCT_NAMES[lead.productType] ?? (lead.productType || null),
    seats: lead.seats || null,
    budget: lead.budget || null,
    move_in: lead.moveIn || null,
    city: lead.city?.name ?? null,
    locality: lead.locality?.name ?? null,
    space: lead.listing?.name ?? null,
    space_url: lead.listing ? `${SITE_DOMAIN}/spaces/${lead.listing.slug}` : null,
    utm: parseJson(lead.utmJson, {}),
  };
  try {
    const res = await fetch(`${CRM_URL}/api/method/amadhi_crm.api.website_lead`, {
      method: "POST",
      headers: {
        Authorization: `token ${CRM_API_KEY}:${CRM_API_SECRET}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      failed++;
      console.error(`✗ ${lead.id} ${lead.name}: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    } else if (json.message?.duplicate) {
      skipped++;
    } else {
      created++;
    }
  } catch (err) {
    failed++;
    console.error(`✗ ${lead.id} ${lead.name}: ${err.message}`);
  }
}

console.log(`created ${created}, already in CRM ${skipped}, failed ${failed}`);
await db.$disconnect();
process.exit(failed ? 1 : 0);
