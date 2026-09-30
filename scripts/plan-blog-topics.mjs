#!/usr/bin/env node
/**
 * Build the blog content plan from the live inventory.
 *
 * Topics are derived from what Amadhi actually has data about — localities
 * with enough listings to quote a credible price, operators with real
 * coverage, product types that are genuinely priced — so every post can cite
 * a number no competitor publishes. That is what earns rankings and what AI
 * assistants quote; generic advice posts earn neither.
 *
 *   node scripts/plan-blog-topics.mjs            # writes docs/13-content-plan.json
 *   node scripts/plan-blog-topics.mjs --print    # summary to stdout
 *
 * Prices are ASKING prices from our own listings. The ₹5,999 floor applied
 * during import means minimums are not market truth, so the plan carries
 * medians and quartiles and flags any locality where the floor dominates.
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..");
const db = new DatabaseSync(path.join(PROJECT, "prisma", "dev.db"), { readOnly: true });

const PRICE_FLOOR = 5999;
const SEAT_PRODUCTS = ["coworking", "dedicated_desk", "private_cabin", "managed_office"];

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

/** Monthly seat prices per locality, with floor contamination measured. */
function localityStats() {
  const rows = db.prepare(`
    SELECT lo.id, lo.slug, lo.name loc, c.name city, c.slug citySlug,
           count(DISTINCT l.id) listings,
           count(DISTINCT l.operatorId) operators,
           group_concat(pr.amount) amounts
      FROM Listing l
      JOIN Locality lo ON lo.id = l.localityId
      JOIN City c      ON c.id  = l.cityId
      LEFT JOIN Plan p  ON p.listingId = l.id AND p.productType IN (${SEAT_PRODUCTS.map(() => "?").join(",")})
      LEFT JOIN Price pr ON pr.planId = p.id AND pr.period = 'month'
     WHERE l.status = 'published'
     GROUP BY lo.id
    HAVING listings >= 3
  `).all(...SEAT_PRODUCTS);

  return rows.map((r) => {
    const a = (r.amounts ?? "").split(",").filter(Boolean).map(Number).sort((x, y) => x - y);
    const onFloor = a.length ? a.filter((x) => x === PRICE_FLOOR).length / a.length : 0;
    return {
      ...r,
      priced: a.length,
      median: a.length ? pct(a, 0.5) : null,
      p25: a.length ? pct(a, 0.25) : null,
      p75: a.length ? pct(a, 0.75) : null,
      // Above ~40% the floor is doing the talking, not the market.
      floorDominated: onFloor > 0.4,
      floorShare: Math.round(onFloor * 100),
    };
  }).filter((r) => r.priced >= 5).sort((a, b) => b.listings - a.listings);
}

const CITY_BLURB = { Gurugram: "Gurugram", Noida: "Noida", Delhi: "Delhi" };

/** Questions real buyers type — the AEO surface. */
const faqsFor = (t) => {
  switch (t.kind) {
    case "locality-price":
      return [
        `How much does a coworking desk cost in ${t.loc}?`,
        `What is the cheapest coworking space in ${t.loc}?`,
        `Is ${t.loc} cheaper than nearby ${t.city} micro-markets?`,
        `What is included in a coworking seat price in ${t.loc}?`,
        `How many coworking spaces are there in ${t.loc}?`,
      ];
    case "locality-best":
      return [
        `Which is the best coworking space in ${t.loc}?`,
        `Which coworking spaces in ${t.loc} have meeting rooms?`,
        `Which ${t.loc} coworking spaces offer 24x7 access?`,
        `How do I book a visit to a coworking space in ${t.loc}?`,
      ];
    case "city-product":
      return [
        `How much does a ${t.productLabel.toLowerCase()} cost in ${t.city}?`,
        `What is the notice period for a ${t.productLabel.toLowerCase()} in ${t.city}?`,
        `How long does it take to move into a ${t.productLabel.toLowerCase()} in ${t.city}?`,
        `Do I pay brokerage on a ${t.productLabel.toLowerCase()} in ${t.city}?`,
      ];
    case "team-size":
      return [
        `How much does an office for ${t.seats} people cost in ${t.city}?`,
        `How much space does a team of ${t.seats} need?`,
        `Is a managed office or coworking cheaper for ${t.seats} people?`,
        `What deposit is required for a ${t.seats}-seat office in ${t.city}?`,
      ];
    default:
      return t.faqs ?? [];
  }
};

function buildPlan() {
  const locs = localityStats();
  const topics = [];
  const push = (t) => topics.push({ ...t, faqs: faqsFor(t) });

  // A. Locality price guides — the highest-intent, most citable pages.
  // Every locality with enough priced inventory earns one: these are the
  // pages only Amadhi can write, so depth here beats generic advice posts.
  for (const l of locs.slice(0, 55)) {
    push({
      kind: "locality-price",
      category: "Coworking",
      city: l.city, loc: l.loc, citySlug: l.citySlug, localitySlug: l.slug,
      title: `Coworking Space Price in ${l.loc}, ${l.city} (${new Date().getFullYear()})`,
      slug: `coworking-space-price-${l.slug}-${l.citySlug}`,
      targetQuery: `coworking space price in ${l.loc.toLowerCase()}`,
      facts: {
        listings: l.listings, operators: l.operators, pricedSeats: l.priced,
        median: l.median, p25: l.p25, p75: l.p75,
        floorDominated: l.floorDominated, floorShare: l.floorShare,
      },
      internalLinks: [`/coworking-space/${l.citySlug}/${l.slug}`, `/coworking-space/${l.citySlug}`],
    });
  }

  // B. "Best spaces in X" — comparison intent (15)
  for (const l of locs.slice(0, 15)) {
    push({
      kind: "locality-best",
      category: "Coworking",
      city: l.city, loc: l.loc, citySlug: l.citySlug, localitySlug: l.slug,
      title: `Best Coworking Spaces in ${l.loc}, ${l.city}`,
      slug: `best-coworking-spaces-${l.slug}-${l.citySlug}`,
      targetQuery: `best coworking space in ${l.loc.toLowerCase()}`,
      facts: { listings: l.listings, operators: l.operators, median: l.median },
      internalLinks: [`/coworking-space/${l.citySlug}/${l.slug}`],
    });
  }

  // C. City × product (21)
  const PRODUCTS = [
    ["coworking", "Coworking Space", "Coworking", "coworking-space"],
    ["managed_office", "Managed Office", "Managed Offices", "managed-office"],
    ["private_cabin", "Private Cabin", "Coworking", "private-cabin"],
    ["dedicated_desk", "Dedicated Desk", "Coworking", "dedicated-desk"],
    ["meeting_room", "Meeting Room", "Business", "meeting-room"],
    ["office_leasing", "Office Space for Lease", "Office Leasing", "office-leasing"],
    ["virtual_office", "Virtual Office", "Virtual Office", "virtual-office"],
  ];
  for (const city of ["Gurugram", "Noida", "Delhi"]) {
    const citySlug = city.toLowerCase() === "gurugram" ? "gurugram" : city.toLowerCase();
    for (const [key, label, category, urlSlug] of PRODUCTS) {
      const n = db.prepare(`
        SELECT count(DISTINCT l.id) n FROM Listing l
        JOIN City c ON c.id = l.cityId JOIN Plan p ON p.listingId = l.id
        WHERE l.status='published' AND c.name = ? AND p.productType = ?`).get(city, key).n;
      push({
        kind: "city-product",
        category, city, productKey: key, productLabel: label,
        title: `${label} in ${CITY_BLURB[city]}: Prices, Areas and How to Choose`,
        slug: `${urlSlug}-${citySlug}-guide`,
        targetQuery: `${label.toLowerCase()} in ${city.toLowerCase()}`,
        facts: { listings: n },
        internalLinks: [`/${urlSlug}/${citySlug}`],
      });
    }
  }

  // D. Team-size / budget calculators (8)
  for (const city of ["Gurugram", "Noida", "Delhi"]) {
    for (const seats of [10, 25, 50]) {
      if (topics.filter((t) => t.kind === "team-size").length >= 8) break;
      push({
        kind: "team-size", category: "Startup", city, seats,
        title: `Office Space for ${seats} People in ${city}: What It Costs`,
        slug: `office-for-${seats}-people-${city.toLowerCase()}`,
        targetQuery: `office space for ${seats} people in ${city.toLowerCase()}`,
        facts: {},
        internalLinks: [`/managed-office/${city.toLowerCase()}`],
      });
    }
  }

  // E. Comparisons, compliance and buying-process posts — evergreen, high AEO value (31)
  // E. Evergreen. Deliberately short: these can't lean on our price data, so
  // each one has to justify itself on genuine buyer intent. Anything a
  // chatbot already answers well was cut rather than padded out.
  const EVERGREEN = [
    ["Coworking vs Managed Office: Which Is Right for Your Team?", "coworking-vs-managed-office", "Managed Offices"],
    ["Managed Office vs Conventional Lease: What Actually Differs", "managed-office-vs-conventional-lease", "Office Leasing"],
    ["How to Get GST Registration With a Virtual Office in Delhi NCR", "gst-registration-virtual-office-ncr", "Virtual Office"],
    ["Coworking Agreements: The Clauses That Cost You Later", "coworking-agreement-clauses", "Business"],
    ["Security Deposit and Lock-In in Indian Coworking", "coworking-security-deposit-lock-in", "Business"],
    ["Hot Desk vs Dedicated Desk vs Private Cabin", "hot-desk-vs-dedicated-desk-vs-cabin", "Coworking"],
    ["How Much Office Space Does a Team Need? Sq Ft Per Person", "sq-ft-per-person-office", "Office Leasing"],
    ["Questions to Ask on a Coworking Space Tour", "coworking-tour-questions", "Coworking"],
    ["Gurugram vs Noida vs Delhi: Where Should Your Office Be?", "gurugram-vs-noida-vs-delhi-office", "Real Estate"],
  ];
  for (const [title, slug, category] of EVERGREEN) {
    push({ kind: "evergreen", category, title, slug, targetQuery: title.toLowerCase(), facts: {}, internalLinks: ["/coworking-space/gurugram"], faqs: [] });
  }

  return topics;
}

const topics = buildPlan();
const out = {
  generatedAt: new Date().toISOString(),
  note: "Prices are asking prices from Amadhi's own listings; the ₹5,999 import floor means minimums are not market truth.",
  total: topics.length,
  topics,
};
writeFileSync(path.join(PROJECT, "docs", "13-content-plan.json"), JSON.stringify(out, null, 2));

const byKind = {};
for (const t of topics) byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
console.log(`planned ${topics.length} topics`);
for (const [k, v] of Object.entries(byKind)) console.log(`  ${k.padEnd(16)} ${v}`);
const withData = topics.filter((t) => t.facts && Object.keys(t.facts).length).length;
console.log(`  grounded in real inventory data: ${withData}/${topics.length}`);
const flagged = topics.filter((t) => t.facts?.floorDominated).length;
console.log(`  localities where the price floor dominates (handle carefully): ${flagged}`);
db.close();
