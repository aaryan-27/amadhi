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
import { readFileSync, existsSync } from "node:fs";
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


/* ─── Additional data sources for the other post types ──────────────── */

/** Listings in a locality, with the facts a "best spaces" post can state. */
async function spacesIn(localityId, limit = 8) {
  const rows = await db.listing.findMany({
    where: { localityId, status: "published" },
    select: {
      name: true, slug: true, capacity: true, openDays: true, verified: true,
      operator: { select: { name: true } },
      amenities: { select: { amenity: { select: { name: true } } } },
      plans: { select: { productType: true, prices: { select: { amount: true, period: true } } } },
    },
  });
  return rows.map((l) => {
    const seat = l.plans.filter((p) => SEAT_PRODUCTS.includes(p.productType))
      .flatMap((p) => p.prices.filter((pr) => pr.period === "month").map((pr) => pr.amount)).sort((a, b) => a - b);
    return {
      name: l.name, slug: l.slug, operator: l.operator?.name ?? null, capacity: l.capacity,
      from: seat[0] ?? null,
      products: [...new Set(l.plans.map((p) => p.productType))],
      amenities: [...new Set(l.amenities.map((a) => a.amenity.name))],
    };
  }).filter((l) => l.from).sort((a, b) => a.from - b.from).slice(0, limit);
}

/** Price and coverage for one product across a city, by locality. */
async function cityProductStats(cityName, productKey) {
  const listings = await db.listing.findMany({
    where: { status: "published", city: { name: cityName }, plans: { some: { productType: productKey } } },
    select: {
      operatorId: true, locality: { select: { name: true, slug: true } },
      plans: { where: { productType: productKey }, select: { prices: { select: { amount: true, period: true } } } },
    },
  });
  const byPeriod = new Map();
  const byLocality = new Map();
  for (const l of listings) {
    const amounts = l.plans.flatMap((p) => p.prices);
    for (const pr of amounts) {
      if (!byPeriod.has(pr.period)) byPeriod.set(pr.period, []);
      byPeriod.get(pr.period).push(pr.amount);
    }
    const k = l.locality.name;
    if (!byLocality.has(k)) byLocality.set(k, { name: k, slug: l.locality.slug, n: 0, amounts: [] });
    const rec = byLocality.get(k);
    rec.n++;
    rec.amounts.push(...amounts.filter((a) => a.period === "month").map((a) => a.amount));
  }
  const periods = [...byPeriod.entries()].map(([period, a]) => {
    a.sort((x, y) => x - y);
    return { period, n: a.length, p25: pct(a, 0.25), median: pct(a, 0.5), p75: pct(a, 0.75) };
  }).sort((a, b) => b.n - a.n);
  const localities = [...byLocality.values()].map((r) => {
    r.amounts.sort((a, b) => a - b);
    return { ...r, median: r.amounts.length ? pct(r.amounts, 0.5) : null };
  }).sort((a, b) => b.n - a.n).slice(0, 6);
  return { listings: listings.length, operators: new Set(listings.map((l) => l.operatorId).filter(Boolean)).size, periods, localities };
}

const PERIOD_LABEL = { month: "per month", hour: "per hour", day: "per day", sqft_month: "per sq ft per month", year: "per year" };

/* ─── Builders ──────────────────────────────────────────────────────── */

function buildLocalityBest(t, s, spaces) {
  const rows = spaces.map((l) =>
    `| [${l.name}](/spaces/${l.slug}) | ${l.operator ?? "Independent"} | ${inr(l.from)} | ${l.amenities.slice(0, 3).join(", ") || "—"} |`
  ).join("\n");
  const with247 = spaces.filter((l) => l.amenities.some((a) => /24/.test(a))).length;
  const withMeeting = spaces.filter((l) => l.amenities.some((a) => /meeting/i.test(a))).length;

  return `${t.loc} in ${t.city} has **${s.listings} coworking and managed workspaces from ${s.operators} operators**, with desks from ${inr(s.min)} a month and a median of ${inr(s.median)}. Below are spaces across the price range, with what each includes.

## Workspaces in ${t.loc}

| Space | Operator | From (per desk/month) | Notable facilities |
|---|---|---|---|
${rows}

Listed lowest price first. These are asking prices from the operator; what you pay depends on desk type, term length and how many seats you take.

## How to choose between them

There is no single "best" space — the right one depends on which trade-off you care about.

- **Lowest cost:** the entry end of ${t.loc} starts around ${inr(s.min)} a desk. Expect a shared hot desk in an open area.
- **Predictable monthly bill:** ask which of meeting rooms, parking and printing are bundled. This is where two quotes at the same headline price diverge.
- **Room to grow:** with ${s.operators} operators here, you can usually expand without leaving the micro-market — worth confirming the operator has adjacent inventory before signing.
- **Client-facing space:** ${withMeeting} of these spaces list meeting rooms${with247 ? `, and ${with247} list 24x7 access` : ""}.

## What a desk costs here

Median ${inr(s.median)} per desk per month, with most between ${inr(s.p25)} and ${inr(s.p75)}. For the full breakdown and how ${t.loc} compares with nearby areas, see our [${t.loc} price guide](/blog/coworking/coworking-space-price-${t.localitySlug}-${t.citySlug}).

See live availability for [coworking spaces in ${t.loc}](/coworking-space/${t.citySlug}/${t.localitySlug}).

## Frequently asked questions

### Which is the best coworking space in ${t.loc}?

It depends on what you optimise for. ${t.loc} has ${s.listings} spaces from ${s.operators} operators, ranging from ${inr(s.min)} to ${inr(s.max)} per desk per month. For cost, look at the entry end; for client meetings, the ${withMeeting} spaces listing meeting rooms; for shift work, those listing 24x7 access.

### How much do coworking spaces in ${t.loc} cost?

The median is ${inr(s.median)} per desk per month, with most desks listed between ${inr(s.p25)} and ${inr(s.p75)}.

### Which coworking spaces in ${t.loc} have meeting rooms?

${withMeeting} of the spaces listed here include meeting rooms among their facilities. Meeting-room hours are often capped per seat per month, with extra hours charged separately.

### Do coworking spaces in ${t.loc} offer 24x7 access?

${with247 ? `${with247} of the spaces shown list 24x7 access.` : `Access hours vary by operator in ${t.loc}; confirm before signing if you need out-of-hours entry.`} Most spaces otherwise operate standard business hours, commonly ${spaces[0]?.openDays ?? "Mon–Sat"}.

### How do I book a visit to a coworking space in ${t.loc}?

Open any space on [coworking spaces in ${t.loc}](/coworking-space/${t.citySlug}/${t.localitySlug}) and request a visit. Amadhi arranges the tour with the operator at no cost to you.

### Is there a brokerage fee?

No. Amadhi is free for occupiers; you pay the operator directly at their own rate.
`;
}

function buildCityProduct(t, st) {
  const monthly = st.periods.find((p) => p.period === "month");
  const headline = monthly
    ? `Most ${t.productLabel.toLowerCase()} options in ${t.city} are listed between **${inr(monthly.p25)} and ${inr(monthly.p75)} per month**, with a median of **${inr(monthly.median)}**.`
    : st.periods[0]
      ? `${t.productLabel} in ${t.city} is typically priced ${PERIOD_LABEL[st.periods[0].period]}, with a median of **${inr(st.periods[0].median)}**.`
      : `Pricing for ${t.productLabel.toLowerCase()} in ${t.city} is quoted on request.`;

  const priceRows = st.periods.map((p) =>
    `| ${PERIOD_LABEL[p.period]} | ${inr(p.p25)} | **${inr(p.median)}** | ${inr(p.p75)} | ${p.n} |`
  ).join("\n");

  const locRows = st.localities.map((l) =>
    `| [${l.name}](/coworking-space/${t.city.toLowerCase()}/${l.slug}) | ${l.n} | ${l.median ? inr(l.median) : "on request"} |`
  ).join("\n");

  return `Amadhi lists **${st.listings} ${t.productLabel.toLowerCase()} options in ${t.city}** from ${st.operators} operators. ${headline}

## What it costs in ${t.city}

| Priced | Entry (25th) | Typical (median) | Premium (75th) | Plans priced |
|---|---|---|---|---|
${priceRows}

These are asking prices across ${st.listings} listings. What you pay depends on the building, the term and how much is bundled.

## Where the supply is

| Micro-market | Options | Median (per month) |
|---|---|---|
${locRows}

Availability is concentrated in these areas, which is worth knowing before you fix on a location: a micro-market with more operators gives you more negotiating room and somewhere to expand into later.

## How to choose

- **Start from commute, not price.** A cheaper building your team won't travel to costs more in attrition than it saves in rent.
- **Compare total monthly cost.** Meeting-room hours, parking, printing and internet upgrades are the line items that separate two quotes at the same headline rate.
- **Check the exit, not just the entry.** Notice period and lock-in decide what happens if the team shrinks.
- **Ask what happens when you grow.** Adding seats mid-term is normal; the terms for it are not standard.

Browse live options: [${t.productLabel} in ${t.city}](${t.internalLinks[0]}).

## Frequently asked questions

### How much does ${t.productLabel.toLowerCase()} cost in ${t.city}?

${monthly ? `The median is ${inr(monthly.median)} per month, with most listings between ${inr(monthly.p25)} and ${inr(monthly.p75)}, across ${st.listings} options on Amadhi.` : st.periods[0] ? `It is usually quoted ${PERIOD_LABEL[st.periods[0].period]}, with a median of ${inr(st.periods[0].median)} across ${st.listings} listings.` : `Pricing is quoted on request for the ${st.listings} options currently listed.`}

### How many ${t.productLabel.toLowerCase()} options are available in ${t.city}?

Amadhi lists ${st.listings} from ${st.operators} operators${st.localities.length ? `, concentrated in ${st.localities.slice(0, 3).map((l) => l.name).join(", ")}` : ""}.

### Which area of ${t.city} has the most ${t.productLabel.toLowerCase()} options?

${st.localities[0] ? `${st.localities[0].name}, with ${st.localities[0].n} listings${st.localities[0].median ? ` and a median of ${inr(st.localities[0].median)} per month` : ""}.` : `Supply is spread across the city.`}

### What is the notice period?

Commonly one to three months for flexible workspace, and longer for conventional leases. It is negotiable and worth settling before you agree a rate — it decides your exposure if the team changes size.

### How quickly can we move in?

Ready-to-use workspace can often be occupied within days of signing, since it is furnished and connected. Anything requiring a fit-out runs to weeks or months.

### Does Amadhi charge occupiers a fee?

No. You pay the operator directly at their own rate; Amadhi is free to use.
`;
}

function buildTeamSize(t, city) {
  const cw = city.coworking, mo = city.managed;
  const seats = t.seats;
  const cwLow = cw ? cw.p25 * seats : null, cwMid = cw ? cw.median * seats : null, cwHigh = cw ? cw.p75 * seats : null;
  const sqft = seats * 80;

  return `A ${seats}-person team in ${t.city} should budget roughly **${cwMid ? inr(cwMid) : "—"} a month** for coworking desks, based on a median of ${cw ? inr(cw.median) : "—"} per desk. Depending on building and location that ranges from about ${cwLow ? inr(cwLow) : "—"} to ${cwHigh ? inr(cwHigh) : "—"}.

## Monthly cost for ${seats} seats in ${t.city}

| Option | Per seat | ${seats} seats |
|---|---|---|
| Coworking, entry level | ${cw ? inr(cw.p25) : "—"} | ${cwLow ? inr(cwLow) : "—"} |
| **Coworking, typical** | ${cw ? inr(cw.median) : "—"} | **${cwMid ? inr(cwMid) : "—"}** |
| Coworking, premium | ${cw ? inr(cw.p75) : "—"} | ${cwHigh ? inr(cwHigh) : "—"} |
${mo ? `| Managed office, typical | ${inr(mo.median)} | ${inr(mo.median * seats)} |` : ""}

Figures are desk rent from live listings in ${t.city}. They exclude one-off costs: a security deposit (commonly two to three months) and any custom branding or fit-out.

## How much space ${seats} people need

At the usual Indian planning density of 70–90 sq ft per person including circulation and meeting space, ${seats} people need roughly **${(sqft * 0.875).toLocaleString("en-IN")}–${(sqft * 1.125).toLocaleString("en-IN")} sq ft**. In flexible workspace you buy seats rather than area, so this matters mainly when comparing against a conventional lease.

## Coworking or managed office at ${seats} seats?

${seats < 20
  ? `At ${seats} people, coworking is almost always the cheaper and faster answer. A managed office starts to make sense when you need a branded, private floor or have data and access requirements a shared floor can't meet.`
  : `${seats} is around the size where a managed office becomes competitive. You get a private, branded floor with your own access control, and per-seat pricing narrows against coworking at this volume. Coworking still wins on flexibility if headcount is uncertain.`}

Compare live options: [managed offices in ${t.city}](/managed-office/${t.city.toLowerCase()}) or [coworking spaces in ${t.city}](/coworking-space/${t.city.toLowerCase()}).

## Frequently asked questions

### How much does an office for ${seats} people cost in ${t.city}?

About ${cwMid ? inr(cwMid) : "—"} a month at the median coworking rate of ${cw ? inr(cw.median) : "—"} per desk, ranging from roughly ${cwLow ? inr(cwLow) : "—"} to ${cwHigh ? inr(cwHigh) : "—"} depending on building and micro-market.

### How much space does a team of ${seats} need?

Roughly ${(sqft * 0.875).toLocaleString("en-IN")}–${(sqft * 1.125).toLocaleString("en-IN")} sq ft at 70–90 sq ft per person including meeting rooms and circulation.

### Is a managed office cheaper than coworking for ${seats} people?

${mo && cw ? `On listed rates in ${t.city}, managed offices run a median of ${inr(mo.median)} per seat against ${inr(cw.median)} for coworking. ` : ""}${seats < 20 ? `At ${seats} seats coworking is usually cheaper; managed offices pay off higher up the headcount range.` : `At ${seats} seats the two are often close, and a managed office adds a private, branded floor.`}

### What deposit is required?

Typically two to three months of rent, refundable at exit subject to dilapidations. It is negotiable, particularly on longer terms.

### How quickly can ${seats} people move in?

Flexible workspace of this size can usually be occupied within days to a couple of weeks. Anything needing a custom fit-out takes longer.

### Does Amadhi charge a fee?

No. Amadhi is free for occupiers — you pay the operator directly.
`;
}


/**
 * Evergreen posts are hand-written markdown in content/blog/, not generated.
 * These topics can't lean on our price data, so templating them would produce
 * exactly the generic filler that earns no rankings and no citations.
 * Frontmatter is a few plain key: value lines — no parser dependency needed.
 */
function readEvergreen(slug) {
  const file = path.join(PROJECT, "content", "blog", `${slug}.md`);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2].trim() };
}

/** Per-seat medians for a city, used by the team-size posts. */
async function citySeatStats(cityName) {
  const grab = async (types) => {
    const rows = await db.plan.findMany({
      where: { productType: { in: types }, listing: { status: "published", city: { name: cityName } } },
      select: { prices: { where: { period: "month" }, select: { amount: true } } },
    });
    const a = rows.flatMap((r) => r.prices.map((p) => p.amount)).sort((x, y) => x - y);
    return a.length ? { n: a.length, p25: pct(a, 0.25), median: pct(a, 0.5), p75: pct(a, 0.75) } : null;
  };
  return { coworking: await grab(["coworking", "dedicated_desk"]), managed: await grab(["managed_office"]) };
}

const plan = JSON.parse(readFileSync(path.join(PROJECT, "docs", "13-content-plan.json"), "utf8"));
const KINDS = KIND === "all"
  ? ["locality-price", "locality-best", "city-product", "team-size", "evergreen"]
  : KIND.split(",");
const selected = plan.topics.filter((t) => KINDS.includes(t.kind)).slice(0, LIMIT);

const author = await db.author.findFirst({ where: { role: { contains: "SEO" } } }) ?? await db.author.findFirst();
const cities = await db.city.findMany({ select: { id: true, slug: true, name: true } });

/** Turn a planned topic into post fields, or null when the data won't carry it. */
async function renderTopic(t) {
  if (t.kind === "locality-price" || t.kind === "locality-best") {
    const city = cities.find((c) => c.slug === t.citySlug);
    const locality = city && await db.locality.findUnique({ where: { cityId_slug: { cityId: city.id, slug: t.localitySlug } } });
    if (!locality) return null;
    const s = await statsFor(locality.id);
    if (!s.median || s.priced < 5) return null;

    if (t.kind === "locality-price") {
      return {
        body: buildBody(t, s, await peers(city.id, locality.id)), cover: s.cover,
        excerpt: `A coworking desk in ${t.loc}, ${t.city} typically costs ${inr(s.median)} a month. Here is the full price range across ${s.listings} spaces, and how it compares with the rest of ${t.city}.`,
        seoDesc: `Median ${inr(s.median)} per desk per month across ${s.listings} coworking spaces in ${t.loc}, ${t.city}. Full price range, comparison with nearby areas and what's included.`,
        tags: [t.citySlug, "coworking-space"],
      };
    }
    const spaces = await spacesIn(locality.id);
    if (spaces.length < 3) return null;
    return {
      body: buildLocalityBest(t, s, spaces), cover: s.cover,
      excerpt: `${s.listings} coworking spaces from ${s.operators} operators in ${t.loc}, ${t.city}, with prices from ${inr(s.min)} a desk and what each includes.`,
      seoDesc: `Compare ${s.listings} coworking spaces in ${t.loc}, ${t.city}. Prices from ${inr(s.min)} per desk per month, facilities and how to choose between them.`,
      tags: [t.citySlug, "coworking-space"],
    };
  }

  if (t.kind === "city-product") {
    const st = await cityProductStats(t.city, t.productKey);
    if (!st.listings) return null;
    const m = st.periods.find((p) => p.period === "month") ?? st.periods[0];
    const cover = (await db.listing.findFirst({
      where: { status: "published", city: { name: t.city }, plans: { some: { productType: t.productKey } }, images: { some: {} } },
      select: { images: { select: { url: true }, take: 1 } },
    }))?.images[0]?.url ?? "";
    return {
      body: buildCityProduct(t, st), cover,
      excerpt: `${st.listings} ${t.productLabel.toLowerCase()} options in ${t.city} from ${st.operators} operators${m ? `, typically ${inr(m.median)} ${PERIOD_LABEL[m.period]}` : ""}.`,
      seoDesc: `${t.productLabel} in ${t.city}: ${st.listings} options from ${st.operators} operators${m ? `, median ${inr(m.median)} ${PERIOD_LABEL[m.period]}` : ""}. Prices by area and how to choose.`,
      tags: [t.city.toLowerCase(), t.internalLinks[0].split("/")[1]],
    };
  }

  if (t.kind === "team-size") {
    const st = await citySeatStats(t.city);
    if (!st.coworking) return null;
    const cover = (await db.listing.findFirst({
      where: { status: "published", city: { name: t.city }, images: { some: {} } },
      select: { images: { select: { url: true }, take: 1 } },
    }))?.images[0]?.url ?? "";
    return {
      body: buildTeamSize(t, st), cover,
      excerpt: `Budget roughly ${inr(st.coworking.median * t.seats)} a month for ${t.seats} desks in ${t.city}, plus deposit. Full cost breakdown and how much space you need.`,
      seoDesc: `Office space for ${t.seats} people in ${t.city} costs about ${inr(st.coworking.median * t.seats)} a month at median rates. Cost table, sq ft needed, coworking vs managed office.`,
      tags: [t.city.toLowerCase(), "managed-office"],
    };
  }
  if (t.kind === "evergreen") {
    const file = readEvergreen(t.slug);
    if (!file) { console.log(`  ! no content/blog/${t.slug}.md — write it first`); return null; }
    const tags = (file.meta.tags ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const cover = (await db.listing.findFirst({
      where: { status: "published", images: { some: {} }, ...(tags[0] ? { city: { slug: tags[0] } } : {}) },
      orderBy: { slug: "asc" },
      select: { images: { select: { url: true }, take: 1 } },
    }))?.images[0]?.url ?? "";
    return {
      body: file.body, cover,
      excerpt: file.meta.excerpt ?? "",
      seoDesc: file.meta.seoDesc ?? file.meta.excerpt ?? "",
      tags,
      title: file.meta.title,
      category: file.meta.category,
    };
  }
  return null;
}

let written = 0, skipped = 0;
for (const t of selected) {
  const r = await renderTopic(t);
  if (!r) { console.log(`  ! skipped ${t.slug} — data won't support it`); skipped++; continue; }

  const words = r.body.split(/\s+/).length;
  if (!APPLY) { console.log(`  [dry] ${t.slug} — ${words} words`); written++; continue; }

  const category = await db.blogCategory.findFirst({ where: { name: r.category ?? t.category } });
  if (!category) { console.log(`  ! no category "${t.category}" for ${t.slug}`); skipped++; continue; }
  const existing = await db.blogPost.findUnique({ where: { slug: t.slug } });
  const data = {
    slug: t.slug, title: r.title ?? t.title, excerpt: r.excerpt, body: r.body,
    coverImage: r.cover, categoryId: category.id, authorId: author.id,
    seoTitle: `${r.title ?? t.title} | Amadhi`, seoDesc: r.seoDesc,
    // Never demote something already live.
    ...(existing && existing.status !== "draft" ? {} : { status: "draft" }),
    readMins: Math.max(3, Math.round(words / 220)),
  };
  if (existing) await db.blogPost.update({ where: { slug: t.slug }, data });
  else await db.blogPost.create({ data });

  const post = await db.blogPost.findUnique({ where: { slug: t.slug } });
  for (const slug of r.tags) {
    const tag = await db.tag.findUnique({ where: { slug } });
    if (!tag) continue;
    await db.blogPostTag.upsert({
      where: { postId_tagId: { postId: post.id, tagId: tag.id } },
      create: { postId: post.id, tagId: tag.id }, update: {},
    });
  }
  console.log(`  ${existing ? "updated" : "created"}: ${t.slug} (${words} words)`);
  written++;
}

console.log(`\n${APPLY ? "wrote" : "would write"} ${written} post(s), skipped ${skipped}`);
if (!APPLY) console.log("Re-run with --apply to save them as drafts.");
await db.$disconnect();
