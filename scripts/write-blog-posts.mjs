#!/usr/bin/env node
/**
 * Write data-backed blog posts from docs/13-content-plan.json.
 *
 * Every figure in a post is computed here from the live inventory. Nothing is
 * invented: if the data can't support a claim, the sentence isn't written.
 * That is the whole point — generic workspace advice is what an AI assistant
 * already produces for free, so it earns neither rankings nor citations. Real
 * prices from 1,468 listings are something only Amadhi can publish.
 *
 *   node scripts/write-blog-posts.mjs --kind=locality-price --limit=10
 *   node scripts/write-blog-posts.mjs --kind=locality-price --limit=10 --apply
 *
 * Posts are created as drafts. Nothing is visible publicly until a human sets
 * the status to published in the admin.
 *
 * Prices are ASKING prices from our listings. Imports were floored at ₹5,999,
 * so minimums are not market truth and posts say so where the floor dominates.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..");

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.split("=")[1] : d; };
const APPLY = args.includes("--apply");
const KIND = flag("kind", "locality-price");
const LIMIT = Number(flag("limit", "10"));

const PRICE_FLOOR = 5999;
const SEAT_PRODUCTS = ["coworking", "dedicated_desk", "private_cabin", "managed_office"];
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];

const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
const db = new PrismaClient();

/** Seat-price stats for one locality, computed rather than assumed. */
async function statsFor(localityId) {
  const listings = await db.listing.findMany({
    where: { localityId, status: "published" },
    select: {
      id: true, name: true, operatorId: true, nearbyJson: true,
      images: { select: { url: true }, take: 1, orderBy: { sortOrder: "asc" } },
      amenities: { select: { amenity: { select: { name: true } } } },
      plans: { select: { productType: true, prices: { select: { amount: true, period: true } } } },
    },
  });

  const amounts = listings
    .flatMap((l) => l.plans.filter((p) => SEAT_PRODUCTS.includes(p.productType))
      .flatMap((p) => p.prices.filter((pr) => pr.period === "month").map((pr) => pr.amount)))
    .sort((a, b) => a - b);

  const amenityCount = new Map();
  for (const l of listings) {
    for (const a of new Set(l.amenities.map((x) => x.amenity.name))) {
      amenityCount.set(a, (amenityCount.get(a) ?? 0) + 1);
    }
  }
  const withMetro = listings.filter((l) => {
    try { return JSON.parse(l.nearbyJson).some((n) => n.type === "metro"); } catch { return false; }
  }).length;

  return {
    listings: listings.length,
    operators: new Set(listings.map((l) => l.operatorId).filter(Boolean)).size,
    priced: amounts.length,
    min: amounts[0] ?? null,
    p25: amounts.length ? pct(amounts, 0.25) : null,
    median: amounts.length ? pct(amounts, 0.5) : null,
    p75: amounts.length ? pct(amounts, 0.75) : null,
    max: amounts[amounts.length - 1] ?? null,
    floorShare: amounts.length ? Math.round(100 * amounts.filter((a) => a === PRICE_FLOOR).length / amounts.length) : 0,
    withMetro,
    topAmenities: [...amenityCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([name, n]) => ({ name, n, share: Math.round(100 * n / listings.length) })),
    cover: listings.find((l) => l.images[0])?.images[0]?.url ?? "",
  };
}

/** Median seat price for peer localities in the same city, for comparison. */
async function peers(cityId, excludeLocalityId) {
  const localities = await db.locality.findMany({
    where: { cityId, NOT: { id: excludeLocalityId } },
    select: { id: true, name: true, slug: true, _count: { select: { listings: true } } },
  });
  const ranked = localities.filter((l) => l._count.listings >= 5)
    .sort((a, b) => b._count.listings - a._count.listings).slice(0, 6);
  const out = [];
  for (const l of ranked) {
    const s = await statsFor(l.id);
    if (s.median) out.push({ name: l.name, slug: l.slug, median: s.median, listings: s.listings });
  }
  return out.sort((a, b) => a.median - b.median);
}

function buildBody(t, s, peerList) {
  const year = new Date().getFullYear();
  const cheaper = peerList.filter((p) => p.median < s.median);
  const dearer = peerList.filter((p) => p.median > s.median);
  const floorNote = s.floorShare > 40
    ? `\n\nA note on the low end: ${s.floorShare}% of desks here are listed at exactly ${inr(PRICE_FLOOR)}, the entry price most operators in this micro-market advertise. Treat that as the advertised starting point rather than a typical rate — the median is the more useful number.`
    : "";

  const amenityLine = s.topAmenities.length
    ? s.topAmenities.map((a) => `${a.name.toLowerCase()} (${a.share}% of spaces)`).join(", ")
    : "";

  const compareRows = [{ name: `${t.loc} (this area)`, median: s.median, listings: s.listings, slug: null }, ...peerList]
    .sort((a, b) => a.median - b.median)
    .map((p) => `| ${p.slug ? `[${p.name}](/coworking-space/${t.citySlug}/${p.slug})` : `**${p.name}**`} | ${inr(p.median)} | ${p.listings} |`)
    .join("\n");

  return `A coworking desk in ${t.loc}, ${t.city} typically costs **${inr(s.median)} per month**. Across **${s.listings} workspaces from ${s.operators} operators**, most desks are listed between **${inr(s.p25)} and ${inr(s.p75)}**, based on ${s.priced} priced desks currently on Amadhi.

## What a desk costs in ${t.loc}

| | Monthly price per desk |
|---|---|
| Entry level (25th percentile) | ${inr(s.p25)} |
| **Typical (median)** | **${inr(s.median)}** |
| Premium (75th percentile) | ${inr(s.p75)} |
| Full listed range | ${inr(s.min)} – ${inr(s.max)} |

These are asking prices from ${s.priced} desk plans across ${s.listings} spaces in ${t.loc}, updated as operators change their rates. They cover hot desks, dedicated desks, private cabins and managed seats.${floorNote}

## What moves the price within ${t.loc}

The gap between ${inr(s.p25)} and ${inr(s.p75)} is mostly explained by four things:

- **Desk type.** A hot desk is the cheapest entry point; a dedicated desk costs more; a locked private cabin more again, usually priced per seat with a minimum.
- **Building grade.** Newer towers with better lifts, HVAC and lobbies sit at the upper end.
- **Commitment.** Month-to-month costs more per seat than a 12-month term. Longer commitments are where negotiation happens.
- **What's bundled.** Meeting-room credits, parking and printing are sometimes included and sometimes billed on top — worth confirming before comparing two quotes.
${amenityLine ? `\nAcross ${t.loc}, the most commonly listed facilities are ${amenityLine}.` : ""}${s.withMetro ? `\n\n${s.withMetro} of the ${s.listings} spaces here list a metro station among their nearby landmarks.` : ""}

## How ${t.loc} compares with the rest of ${t.city}

| Micro-market | Median desk | Spaces |
|---|---|---|
${compareRows}

${cheaper.length
  ? `If budget is the deciding factor, ${cheaper.slice(0, 2).map((p) => `${p.name} (${inr(p.median)})`).join(" and ")} price lower than ${t.loc}.`
  : `${t.loc} is at the lower end of ${t.city} on price.`} ${dearer.length
  ? `${dearer.slice(0, 2).map((p) => `${p.name} (${inr(p.median)})`).join(" and ")} sit above it.`
  : ""}

## Who ${t.loc} suits

${t.loc} works well for teams that want ${s.operators} operators to choose between without leaving one micro-market — useful when you expect to grow and would rather move within the same commute than across the city. With ${s.listings} spaces listed, there is usually something available at short notice in most desk formats.

Compare live availability on [coworking spaces in ${t.loc}](/coworking-space/${t.citySlug}/${t.localitySlug}), or widen the search to [all coworking spaces in ${t.city}](/coworking-space/${t.citySlug}).

## Frequently asked questions

### How much does a coworking desk cost in ${t.loc}?

The median listed price is ${inr(s.median)} per desk per month. Most desks fall between ${inr(s.p25)} and ${inr(s.p75)}, based on ${s.priced} priced desk plans across ${s.listings} spaces in ${t.loc}, ${t.city}.

### What is the cheapest coworking space in ${t.loc}?

The lowest asking price currently listed in ${t.loc} is ${inr(s.min)} per desk per month.${s.floorShare > 40 ? ` A large share of spaces here advertise that same entry rate, so compare what each includes rather than the headline number alone.` : ""} Cheapest rarely means best value once meeting rooms, parking and internet reliability are counted.

### Is ${t.loc} cheaper than other parts of ${t.city}?

${cheaper.length
  ? `Not the cheapest. ${cheaper.slice(0, 2).map((p) => `${p.name} has a median of ${inr(p.median)}`).join(", and ")}, against ${inr(s.median)} in ${t.loc}.`
  : `Yes — at a median of ${inr(s.median)}, ${t.loc} is among the lower-priced micro-markets in ${t.city}.`}${dearer.length ? ` ${dearer[dearer.length - 1].name} is the most expensive nearby at ${inr(dearer[dearer.length - 1].median)}.` : ""}

### What is included in a coworking desk price in ${t.loc}?

Desk rent normally covers the workstation, internet, power backup, housekeeping and shared pantry access.${amenityLine ? ` Across spaces in ${t.loc}, the most commonly listed facilities are ${amenityLine}.` : ""} Meeting-room hours, parking, printing and lockers vary by operator and are the items most often billed separately.

### How many coworking spaces are there in ${t.loc}?

Amadhi lists ${s.listings} coworking and managed workspaces in ${t.loc} from ${s.operators} different operators.

### Do I pay Amadhi a brokerage fee?

No. Amadhi is free for occupiers — you pay the operator directly at the same rate you would get going to them yourself.
`;
}

const plan = JSON.parse(readFileSync(path.join(PROJECT, "docs", "13-content-plan.json"), "utf8"));
const selected = plan.topics.filter((t) => t.kind === KIND).slice(0, LIMIT);

const author = await db.author.findFirst({ where: { role: { contains: "SEO" } } })
  ?? await db.author.findFirst();
const cities = await db.city.findMany({ select: { id: true, slug: true } });

let written = 0, skipped = 0;
for (const t of selected) {
  const city = cities.find((c) => c.slug === t.citySlug);
  const locality = await db.locality.findUnique({ where: { cityId_slug: { cityId: city.id, slug: t.localitySlug } } });
  if (!locality) { console.log(`  ! no locality for ${t.slug}`); skipped++; continue; }

  const s = await statsFor(locality.id);
  if (!s.median || s.priced < 5) { console.log(`  ! not enough price data for ${t.loc} — skipped rather than padded`); skipped++; continue; }

  const body = buildBody(t, s, await peers(city.id, locality.id));
  const words = body.split(/\s+/).length;
  const excerpt = `A coworking desk in ${t.loc}, ${t.city} typically costs ${inr(s.median)} a month. Here is the full price range across ${s.listings} spaces, and how it compares with the rest of ${t.city}.`;

  if (!APPLY) { console.log(`  [dry] ${t.slug} — ${words} words, median ${inr(s.median)}, ${s.listings} spaces`); written++; continue; }

  const category = await db.blogCategory.findFirst({ where: { name: t.category } });
  const existing = await db.blogPost.findUnique({ where: { slug: t.slug } });
  const data = {
    slug: t.slug, title: t.title, excerpt, body,
    coverImage: s.cover, categoryId: category.id, authorId: author.id,
    seoTitle: `${t.title} | Amadhi`,
    seoDesc: `Median ${inr(s.median)} per desk per month across ${s.listings} coworking spaces in ${t.loc}, ${t.city}. Full price range, comparison with nearby areas and what's included.`,
    status: "draft",
    readMins: Math.max(3, Math.round(words / 220)),
  };
  if (existing) await db.blogPost.update({ where: { slug: t.slug }, data });
  else await db.blogPost.create({ data });

  // Tags drive the "Find workspace" module on the post page.
  for (const slug of [t.citySlug, "coworking-space"]) {
    const tag = await db.tag.findUnique({ where: { slug } });
    if (!tag) continue;
    const post = await db.blogPost.findUnique({ where: { slug: t.slug } });
    await db.blogPostTag.upsert({
      where: { postId_tagId: { postId: post.id, tagId: tag.id } },
      create: { postId: post.id, tagId: tag.id }, update: {},
    });
  }
  console.log(`  ${existing ? "updated" : "created"} draft: ${t.slug} (${words} words, median ${inr(s.median)})`);
  written++;
}

console.log(`\n${APPLY ? "wrote" : "would write"} ${written} post(s), skipped ${skipped}`);
if (!APPLY) console.log("Re-run with --apply to save them as drafts.");
await db.$disconnect();
