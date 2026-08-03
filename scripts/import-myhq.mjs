#!/usr/bin/env node
/**
 * Amadhi — import the myHQ NCR inventory workbooks.
 *
 *   myHQ_Delhi_Inventory.xlsx    → Delhi
 *   myHQ_Gurgaon_Inventory.xlsx  → Gurugram
 *   myHQ_Noida_Inventory.xlsx    → Noida
 *
 * All three share an identical "Inventory" sheet schema. City comes from the
 * filename, so only these three NCR cities can ever be created.
 *
 *   node scripts/import-myhq.mjs                    # DRY RUN (writes nothing)
 *   node scripts/import-myhq.mjs --commit           # replace all listings
 *   node scripts/import-myhq.mjs --commit --ratings  # also import myHQ ratings
 *
 * NOTE: --ratings is OFF by default on purpose — the Rating/Review Count columns
 * are myHQ's aggregate scores, not Amadhi's own reviews, and emitting them as
 * AggregateRating schema would misrepresent third-party reviews as first-party.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, "..");
const ROOT = path.resolve(PROJECT, "..");
const require_ = createRequire(path.join(PROJECT, "package.json"));

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const WITH_RATINGS = args.includes("--ratings");
// "Verified" on this site means an Amadhi expert visited the space. Imported
// inventory has not been visited, so it stays unverified unless asked for.
const MARK_VERIFIED = args.includes("--verified");

/**
 * Amadhi's published minimum monthly price. Anything cheaper in the source is
 * raised to this floor. Applies to per-month pricing only — never to per-sq-ft
 * leasing rates (₹25–450), where a ₹5,999 floor would be meaningless.
 */
const PRICE_FLOOR = 5999;
const withFloor = (price, period) =>
  price != null && period === "month" ? Math.max(price, PRICE_FLOOR) : price;

// Absolute DB URL so the script works from any cwd.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.join(PROJECT, "prisma", "dev.db")}`;

const FILES = [
  { file: "myHQ_Gurgaon_Inventory.xlsx", slug: "gurugram", name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266 },
  { file: "myHQ_Noida_Inventory.xlsx", slug: "noida", name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391 },
  { file: "myHQ_Delhi_Inventory.xlsx", slug: "delhi", name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209 },
];

/* ─── small helpers ────────────────────────────────────────────────── */
const clean = (v) => String(v ?? "").trim();
const num = (v) => {
  const s = clean(v).replace(/[₹,\s]/g, "");
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
};
const inRange = (n, lo, hi) => (n != null && n >= lo && n <= hi ? Math.round(n) : null);
const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/* ─── locality normalisation ───────────────────────────────────────── */
/** Corridors/districts we prefer as the canonical locality for a listing. */
const MAJORS = [
  // Gurugram
  "DLF Cyber City", "Cyber City", "Golf Course Road Extension", "Golf Course Extension",
  "Golf Course Road", "MG Road", "Sohna Road", "Udyog Vihar", "NH-48", "Huda City Centre",
  "Unitech Cyber Park", "Nirvana Country", "Sikanderpur",
  // Noida — sectors are the searched unit here, so the Expressway is NOT a
  // major (its sectors keep their own identity, e.g. "Sector 126").
  "Noida Extension", "Film City", "Greater Noida",
  // Delhi
  "Connaught Place", "Nehru Place", "Saket", "Aerocity", "Jasola", "Netaji Subhash Place",
  "Mohan Cooperative Industrial Estate", "Mohan Cooperative", "Okhla Phase I", "Okhla Phase II",
  "Okhla Phase III", "Okhla", "Dwarka", "Janakpuri", "Green Park", "Rohini", "Vasant Kunj",
  "Jhandewalan", "Lajpat Nagar", "Laxmi Nagar", "Defence Colony", "Malviya Nagar",
  "Preet Vihar", "Shahpur Jat", "Greater Kailash", "Najafgarh",
];
/** Canonical renames so variants merge into one locality. */
const CANON = {
  "dlf cyber city": "Cyber City",
  "unitech cyber park": "Cyber City",
  "golf course road extension": "Golf Course Extension",
  "mohan cooperative industrial estate": "Mohan Cooperative",
  "netaji subash place": "Netaji Subhash Place",
  "huda city centre": "Huda City Centre",
  "nh 48": "NH-48",
};

function normaliseLocality(raw, city) {
  let s = clean(raw);
  if (!s) return "";
  if (/greater[-\s]?noida/i.test(s)) return "Greater Noida";

  // Match majors against the RAW parts first — names like "Noida Extension"
  // must be recognised before any city-name stripping happens.
  const rawParts = s.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  for (const p of rawParts) {
    const hit = MAJORS.find((m) => p.toLowerCase() === m.toLowerCase());
    if (hit) return CANON[hit.toLowerCase()] ?? hit;
  }
  for (const p of rawParts) {
    const hit = MAJORS.find((m) => p.toLowerCase().includes(m.toLowerCase()));
    if (hit) return CANON[hit.toLowerCase()] ?? hit;
  }

  // no corridor matched → use the first part, minus the city suffix
  const parts = rawParts.map((p) =>
    p.replace(/\b(gurgaon|gurugram|noida|delhi|new delhi)\b/gi, "")
     .replace(/\bsector[-\s]*(\d+)/gi, "Sector $1")
     .replace(/\s{2,}/g, " ").replace(/^[-\s]+|[-\s]+$/g, "").trim()
  ).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0];
  return CANON[first.toLowerCase()] ?? first.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── amenity token → our Amenity.slug ─────────────────────────────── */
const AMENITY_MAP = {
  "four-wheeler-parking": "parking", "two-wheeler-parking": "parking",
  wifi: "high-speed-internet", lan: "high-speed-internet",
  "pantry-area": "cafe", tea: "cafe", coffee: "cafe", water: "cafe", "tea-coffee-snacks": "cafe",
  "meeting-rooms": "meeting-rooms", "conference-room": "meeting-rooms",
  "training-room": "event-space", "brainstorming-room": "meeting-rooms",
  "power-backup": "power-backup", charging: "power-backup",
  printer: "printing", stationery: "printing",
  "security-personnel": "security", "fire-extinguisher": "security", "first-aid-kit": "security",
  "nearby-eateries": "food-court", "phone-booth": "phone-booths",
};

/**
 * Photo URLs are space-separated — but a few source rows also have spaces
 * *inside* a Cloudinary transformation (".../upload/fl_lossy, f_auto, q_auto/
 * space-images/x.jpg"), which naive splitting shatters into dead fragments.
 * Keep well-formed URLs, and rebuild the asset path out of any fragment.
 */
function parsePhotos(raw) {
  const out = new Set();
  for (const tok of clean(raw).split(/\s+/).filter(Boolean)) {
    if (/^https?:\/\/\S+\.(jpg|jpeg|png|webp|avif)$/i.test(tok)) { out.add(tok); continue; }
    const m = tok.match(/((?:space-images|workspaces)\/\S+\.(?:jpg|jpeg|png|webp|avif))$/i);
    if (m) out.add(`https://res.cloudinary.com/myhq/image/upload/${m[1]}`);
  }
  return [...out];
}

/* ─── metro connectivity parser ────────────────────────────────────── */
// "Cyber City (400 m, 6 mins walk); Belvedere Towers (1.2 km, 5 mins drive)"
function parseNearby(raw) {
  const out = [];
  for (const chunk of clean(raw).split(/\s*;\s*/).filter(Boolean)) {
    const m = chunk.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
    const name = clean(m ? m[1] : chunk);
    if (!name) continue;
    let km = null;
    if (m) {
      const d = m[2].match(/([\d.]+)\s*(km|m)\b/i);
      if (d) km = d[2].toLowerCase() === "m" ? +(parseFloat(d[1]) / 1000).toFixed(2) : parseFloat(d[1]);
    }
    out.push({ name, distanceKm: km ?? 0, type: "metro" });
    if (out.length >= 5) break;
  }
  return out;
}

/* ─── read + build records ─────────────────────────────────────────── */
function buildRecords(XLSX) {
  const all = [];
  const perFile = [];
  for (const cityDef of FILES) {
    const wb = XLSX.readFile(path.join(ROOT, cityDef.file));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["Inventory"], { header: 1, defval: "", raw: false, blankrows: false });
    const hdr = rows[0].map((h) => clean(h));
    const C = (n) => hdr.indexOf(n);
    const I = {
      type: C("Listing Type"), cats: C("Categories"), brand: C("Brand Name"), name: C("Centre / Building Name"),
      link: C("Link"), addr: C("Address"), micro: C("Micro Market"), region: C("Region"),
      lat: C("Latitude"), lng: C("Longitude"), metro: C("Metro Connectivity"),
      p2: C("Parking - 2 Wheeler"), p4: C("Parking - 4 Wheeler"), night: C("24x7 / Night Shift"),
      rmin: C("Rack Rate Min"), rmax: C("Rack Rate Max"), runit: C("Rate Unit"),
      area: C("Total Centre Area (sq ft)"), floorplate: C("Typical Floorplate (sq ft)"), floors: C("Total Floors"),
      cap: C("Total Seating Capacity"), vacant: C("Vacant Seats"),
      desk: C("Dedicated Desk Price (INR/seat/mo)"), cabCfg: C("Private Cabin Configs"),
      cabCab: C("Private Cabin Price (INR/cabin/mo)"), cabSeat: C("Private Cabin Price (INR/seat/mo)"),
      managed: C("Managed Office Price (INR/seat/mo)"), vo: C("Virtual Office Price (INR/mo)"),
      btype: C("Building Type"), grade: C("Building Grade"), year: C("Year Built"), invType: C("Inventory Type"),
      rent: C("Rent (INR/sq ft/mo)"), maint: C("Maintenance (INR/sq ft/mo)"), total: C("Total Charges (INR/sq ft/mo)"),
      lease: C("Min Lease (months)"), deposit: C("Security Deposit (months)"),
      rating: C("Rating"), reviews: C("Review Count"), amen: C("Amenities"),
      photos: C("Photo URLs"), slug: C("Slug"),
    };
    const data = rows.slice(1).filter((r) => r.some((c) => clean(c) !== ""));
    let kept = 0;
    for (const [n, r] of data.entries()) {
      const g = (i) => (i >= 0 ? clean(r[i]) : "");
      const name = g(I.name) || g(I.brand);
      if (!name) continue;

      const cats = g(I.cats).split(/\s*[,;|]\s*/).filter(Boolean);
      const isCowork = g(I.type).toLowerCase().includes("coworking");
      const rateUnit = g(I.runit).toLowerCase();
      const rackMin = num(g(I.rmin));
      const seatFallback = rateUnit.includes("seat") ? inRange(rackMin, 1000, 200000) : null;
      const sqftFallback = rateUnit.includes("sq ft") ? inRange(rackMin, 10, 2000) : null;

      const deskPrice = inRange(num(g(I.desk)), 1000, 200000) ?? (cats.some((c) => /coworking/i.test(c)) ? seatFallback : null);
      const cabinSeat = inRange(num(g(I.cabSeat)), 1000, 300000);
      const cabinCabin = inRange(num(g(I.cabCab)), 3000, 5000000);
      const managedPrice = inRange(num(g(I.managed)), 1000, 300000) ?? (cats.some((c) => /managed/i.test(c)) ? seatFallback : null);
      const voPrice = inRange(num(g(I.vo)), 300, 100000);
      const rentSqft = inRange(num(g(I.rent)), 10, 2000) ?? (cats.some((c) => /office space for rent/i.test(c)) ? sqftFallback : null);

      const amenTokens = g(I.amen).split(/\s*,\s*/).map((t) => t.toLowerCase()).filter(Boolean);
      const photos = parsePhotos(g(I.photos));

      all.push({
        city: cityDef, row: n + 2, name,
        brand: g(I.brand), link: g(I.link), address: g(I.addr),
        localityRaw: g(I.micro), locality: normaliseLocality(g(I.micro), cityDef),
        region: g(I.region),
        lat: num(g(I.lat)), lng: num(g(I.lng)),
        nearby: parseNearby(g(I.metro)),
        parking: /yes/i.test(g(I.p4)) || /yes/i.test(g(I.p2)),
        night: /yes|24/i.test(g(I.night)),
        capacity: inRange(num(g(I.cap)), 1, 20000) ?? 0,
        vacant: inRange(num(g(I.vacant)), 0, 20000),
        area: inRange(num(g(I.area)), 100, 10000000),
        floorplate: inRange(num(g(I.floorplate)), 100, 1000000),
        floors: inRange(num(g(I.floors)), 1, 200),
        grade: g(I.grade), year: inRange(num(g(I.year)), 1900, 2030),
        btype: g(I.btype), invType: g(I.invType),
        lease: inRange(num(g(I.lease)), 1, 240), deposit: inRange(num(g(I.deposit)), 0, 24),
        maint: inRange(num(g(I.maint)), 0, 2000),
        rating: WITH_RATINGS ? (num(g(I.rating)) ?? 0) : 0,
        reviews: WITH_RATINGS ? (inRange(num(g(I.reviews)), 0, 100000) ?? 0) : 0,
        cats, isCowork, amenTokens, photos,
        cabinCfg: g(I.cabCfg),
        sheetSlug: slugify(g(I.slug)),
        prices: { deskPrice, cabinSeat, cabinCabin, managedPrice, voPrice, rentSqft },
      });
      kept++;
    }
    perFile.push({ file: cityDef.file, city: cityDef.slug, rows: data.length, kept });
  }
  return { all, perFile };
}

/** product plans for a record */
function plansFor(r) {
  const p = [];
  const { deskPrice, cabinSeat, cabinCabin, managedPrice, voPrice, rentSqft } = r.prices;
  const hasCowork = r.cats.some((c) => /coworking/i.test(c));
  const hasManaged = r.cats.some((c) => /managed/i.test(c));
  const hasLease = r.cats.some((c) => /office space for rent/i.test(c));
  const hasVo = r.cats.some((c) => /virtual/i.test(c));

  if (hasCowork && deskPrice) {
    p.push({ type: "coworking", name: "Coworking Desk", price: deskPrice, period: "month", unit: "per seat" });
    p.push({ type: "dedicated_desk", name: "Dedicated Desk", price: deskPrice, period: "month", unit: "per seat" });
  } else if (hasCowork) {
    p.push({ type: "coworking", name: "Coworking Desk", price: null });
  }
  if (cabinCabin || cabinSeat) {
    // Cabins are quoted per cabin per month in this market; the sheet's
    // per-seat column is just cabinPrice ÷ largest cabin, so it under-reads.
    const cfg = r.cabinCfg ? r.cabinCfg.split(/\s*[,;]\s*/)[0].trim() : "";
    const price = withFloor(cabinCabin ?? cabinSeat, "month");
    // derive the per-seat line from the FINAL price so the floor can't make it contradict
    const seats = parseInt((cfg.match(/(\d+)\s*-?\s*seater/i) || [])[1] ?? "0", 10);
    p.push({
      type: "private_cabin",
      name: cfg ? `Private Cabin (${cfg})` : "Private Cabin",
      price,
      period: "month",
      unit: cabinCabin ? "per cabin" : "per seat",
      note: cabinCabin && seats > 1 ? `≈ ₹${Math.round(price / seats).toLocaleString("en-IN")} per seat (${seats}-seater)` : "",
    });
  }
  if (hasManaged && managedPrice) p.push({ type: "managed_office", name: "Managed Office", price: managedPrice, period: "month", unit: "per seat" });
  else if (hasManaged) p.push({ type: "managed_office", name: "Managed Office", price: null });
  if (hasLease && rentSqft) p.push({ type: "office_leasing", name: `Lease (${r.invType || "Office"})`, price: rentSqft, period: "sqft_month", unit: "per sq ft" });
  else if (hasLease) p.push({ type: "office_leasing", name: "Office Lease", price: null });
  if (hasVo) p.push({ type: "virtual_office", name: "Virtual Office", price: voPrice ?? null, period: "month", unit: voPrice ? "billed annually" : "" });
  // Meeting rooms: real inventory (amenity-backed) but priced on request
  if (r.isCowork && r.amenTokens.some((t) => /meeting-rooms|conference-room/.test(t)))
    p.push({ type: "meeting_room", name: "Meeting Room", price: null });
  return p;
}

function describe(r) {
  const bits = [];
  bits.push(`${r.name} is a ${r.isCowork ? "coworking centre" : "commercial office building"} in ${r.locality || r.city.name}, ${r.city.name}${r.brand && r.brand !== r.name ? `, operated by ${r.brand}` : ""}.`);
  const facts = [];
  if (r.capacity) facts.push(`seating for approximately ${r.capacity} members`);
  if (r.area) facts.push(`${r.area.toLocaleString("en-IN")} sq ft of space`);
  if (r.floors) facts.push(`${r.floors} floors`);
  if (r.grade) facts.push(`Grade ${r.grade} building`);
  if (r.year) facts.push(`built in ${r.year}`);
  if (facts.length) bits.push(`The centre offers ${facts.join(", ")}.`);
  const conn = [];
  if (r.nearby.length) conn.push(`The nearest metro is ${r.nearby[0].name}${r.nearby[0].distanceKm ? ` (${r.nearby[0].distanceKm} km)` : ""}`);
  if (r.parking) conn.push("on-site parking is available");
  if (r.night) conn.push("access is available 24×7");
  if (conn.length) bits.push(`${conn.join(", ")}.`);
  const terms = [];
  if (r.lease) terms.push(`minimum lease of ${r.lease} months`);
  if (r.deposit) terms.push(`${r.deposit}-month security deposit`);
  if (r.maint) terms.push(`maintenance at ₹${r.maint}/sq ft`);
  if (terms.length) bits.push(`Commercial terms: ${terms.join(", ")}.`);
  bits.push("Enquire through Amadhi for negotiated pricing, verified availability and a free accompanied visit — zero brokerage.");
  return bits.join(" ");
}

/* ─── main ─────────────────────────────────────────────────────────── */
async function main() {
  let XLSX;
  try { XLSX = require_("xlsx"); } catch { console.error("\n✖ Run: npm install xlsx\n"); process.exit(1); }

  console.log(`\n📄 Reading myHQ inventory from ${ROOT}`);
  const { all, perFile } = buildRecords(XLSX);
  for (const f of perFile) console.log(`   ${f.file} → ${f.city}: ${f.kept}/${f.rows} rows`);

  const byCity = {}, byLoc = {}, byProduct = {};
  let photoTotal = 0, withGeo = 0, withPrice = 0;
  for (const r of all) {
    byCity[r.city.slug] = (byCity[r.city.slug] ?? 0) + 1;
    const k = `${r.city.slug} / ${r.locality || "—"}`;
    byLoc[k] = (byLoc[k] ?? 0) + 1;
    const pl = plansFor(r);
    for (const p of pl) byProduct[p.type] = (byProduct[p.type] ?? 0) + 1;
    photoTotal += Math.min(r.photos.length, 8);
    if (r.lat && r.lng) withGeo++;
    if (pl.some((p) => p.price)) withPrice++;
  }

  console.log(`\n📊 ${all.length} listings to import`);
  console.log(`   by city: ${JSON.stringify(byCity)}`);
  console.log(`   plans by product: ${JSON.stringify(byProduct)}`);
  console.log(`   with geo: ${withGeo} · with a price: ${withPrice} · photos: ~${photoTotal}`);
  console.log(`   ratings: ${WITH_RATINGS ? "IMPORTED (--ratings)" : "skipped (myHQ third-party scores)"}`);
  console.log(`   verified badge: ${MARK_VERIFIED ? "SET on all (--verified)" : "not set (spaces not visited by Amadhi yet)"}`);
  console.log(`   localities: ${Object.keys(byLoc).length} — top 30:`);
  Object.entries(byLoc).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(`     ${String(v).padStart(4)}  ${k}`));
  console.log(`\n   sample:`);
  for (const r of all.slice(0, 10)) {
    const pl = plansFor(r).map((p) => `${p.type}${p.price ? " ₹" + p.price : ""}`).join(", ");
    console.log(`     • ${r.name} [${r.city.slug}/${r.locality}] ${r.photos.length}📷 ${pl}`);
  }

  if (!COMMIT) {
    console.log(`\n✅ DRY RUN — nothing written. Add --commit to replace all listings with these ${all.length}.\n`);
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  console.log(`\n🧹 Removing existing listings…`);
  await db.visitBooking.deleteMany({});
  await db.meetingRoomRequest.deleteMany({});
  await db.review.deleteMany({});
  await db.availabilitySlot.deleteMany({});
  await db.lead.updateMany({ data: { listingId: null } }); // keep leads, unlink listings
  await db.listing.deleteMany({}); // cascades images / amenities / plans / prices
  await db.operator.deleteMany({});
  console.log(`   done`);

  // cities
  const cityId = {};
  for (const c of FILES) {
    const ex = await db.city.findUnique({ where: { slug: c.slug } });
    cityId[c.slug] = ex ? ex.id : (await db.city.create({ data: { slug: c.slug, name: c.name, state: c.state, lat: c.lat, lng: c.lng } })).id;
  }
  const amenities = await db.amenity.findMany();
  const amBySlug = Object.fromEntries(amenities.map((a) => [a.slug, a.id]));

  const locCache = new Map(), opCache = new Map();
  const newLocalities = [];
  let created = 0, skipped = 0, images = 0, plansMade = 0;
  const usedSlugs = new Set();
  const errors = [];

  console.log(`\n💾 Importing ${all.length} listings…`);
  for (const r of all) {
    try {
      const c = r.city;
      const locName = r.locality || `${c.name} Central`;
      const locSlug = slugify(locName) || "central";
      const lkey = `${c.slug}:${locSlug}`;
      let locId = locCache.get(lkey);
      if (!locId) {
        const found = await db.locality.findFirst({ where: { cityId: cityId[c.slug], slug: locSlug } });
        if (found) {
          locId = found.id;
          // backfill metro data on seeded localities that have none
          if (found.metroJson === "[]" && r.nearby.length)
            await db.locality.update({ where: { id: found.id }, data: { metroJson: JSON.stringify(r.nearby.map((n) => ({ name: n.name, line: "Metro", distanceKm: n.distanceKm }))) } });
        } else {
          const row = await db.locality.create({
            data: {
              slug: locSlug, name: locName, cityId: cityId[c.slug],
              lat: r.lat ?? c.lat, lng: r.lng ?? c.lng,
              overview: `${locName} is an established business micro-market in ${c.name}, part of the Delhi NCR commercial corridor. Amadhi lists verified coworking spaces, managed offices and commercial buildings here with transparent pricing and zero brokerage.`,
              metroJson: JSON.stringify(r.nearby.map((n) => ({ name: n.name, line: "Metro", distanceKm: n.distanceKm }))),
            },
          });
          locId = row.id;
          newLocalities.push({ id: row.id, name: locName, city: c.name });
        }
        locCache.set(lkey, locId);
      }

      let opId;
      const opName = r.brand || null;
      if (opName) {
        const os = slugify(opName);
        if (os) {
          opId = opCache.get(os);
          if (!opId) {
            const f = await db.operator.findUnique({ where: { slug: os } });
            opId = f ? f.id : (await db.operator.create({ data: { slug: os, name: opName, website: r.link || "" } })).id;
            opCache.set(os, opId);
          }
        }
      }

      let base = (r.sheetSlug || slugify(`${r.name}-${locName}`) || "space").slice(0, 95);
      let slug = base, k = 2;
      while (usedSlugs.has(slug)) slug = `${base}-${k++}`;
      usedSlugs.add(slug);

      const listing = await db.listing.create({
        data: {
          slug, name: r.name,
          summary: `${r.isCowork ? "Coworking centre" : "Commercial office building"} in ${locName}, ${c.name}${r.capacity ? ` · ${r.capacity} seats` : ""}${r.grade ? ` · Grade ${r.grade}` : ""}.`,
          description: describe(r),
          cityId: cityId[c.slug], localityId: locId, operatorId: opId,
          address: r.address || `${locName}, ${c.name}`,
          lat: r.lat ?? c.lat, lng: r.lng ?? c.lng,
          capacity: r.capacity,
          status: "published", verified: MARK_VERIFIED,
          rating: r.rating || 0, reviewCount: r.reviews || 0,
          openDays: r.night ? "24×7" : "Mon–Sat",
          openingTime: r.night ? "00:00" : "09:00",
          closingTime: r.night ? "24:00" : "20:00",
          nearbyJson: JSON.stringify(r.nearby),
          virtualTourUrl: "",
        },
      });

      const photos = r.photos.slice(0, 8);
      if (photos.length) {
        await db.listingImage.createMany({
          data: photos.map((u, i) => ({ listingId: listing.id, url: u, alt: `${r.name}, ${locName} — photo ${i + 1}`, sortOrder: i })),
        });
        images += photos.length;
      }

      const amSlugs = new Set();
      for (const t of r.amenTokens) { const s = AMENITY_MAP[t]; if (s) amSlugs.add(s); }
      if (r.parking) amSlugs.add("parking");
      if (r.night) amSlugs.add("24x7-access");
      if (r.prices.cabinSeat || r.prices.cabinCabin) amSlugs.add("private-cabins");
      const amData = [...amSlugs].map((s) => amBySlug[s]).filter(Boolean).map((id) => ({ listingId: listing.id, amenityId: id }));
      if (amData.length) await db.listingAmenity.createMany({ data: amData });

      for (const p of plansFor(r)) {
        const amount = withFloor(p.price, p.period);
        await db.plan.create({
          data: {
            listingId: listing.id, productType: p.type, name: p.name,
            seatsMin: 1, seatsMax: Math.max(1, r.capacity || 50),
            highlights: [p.note || null, r.parking ? "Parking available" : null, r.night ? "24×7 access" : null, "Zero brokerage via Amadhi"].filter(Boolean).join("\n"),
            ...(amount ? { prices: { create: [{ amount, period: p.period, unitNote: p.unit }] } } : {}),
          },
        });
        plansMade++;
      }
      created++;
      if (created % 200 === 0) console.log(`   …${created}/${all.length}`);
    } catch (e) {
      skipped++;
      errors.push(`${r.city.slug} row ${r.row} (${r.name}): ${e.message}`);
    }
  }

  // FAQs for newly created localities (seeded ones keep their curated FAQs)
  let faqs = 0;
  for (const loc of newLocalities) {
    const qs = [
      { q: `Why choose a workspace in ${loc.name}?`, a: `${loc.name} is a well-connected business micro-market in ${loc.city} with a mix of coworking centres, managed offices and commercial buildings. Amadhi verifies every space listed here and shares transparent, negotiated pricing.` },
      { q: `What does a workspace in ${loc.name} cost?`, a: `Pricing depends on the product and building grade — the live average for ${loc.name} is shown above and is refreshed from current listings. Enquire for a custom quote; Amadhi charges zero brokerage.` },
      { q: `Can I visit spaces in ${loc.name} before deciding?`, a: `Yes. Use Book a Visit on any listing to pick a slot in the next 14 days. An Amadhi expert accompanies every visit and typically responds within 5 minutes during business hours.` },
    ];
    for (const [i, f] of qs.entries()) {
      await db.faq.create({ data: { entityType: "locality", entityId: loc.id, question: f.q, answer: f.a, sortOrder: i } });
      faqs++;
    }
  }

  // remove localities that ended up with no listings (keeps counts honest)
  const empties = await db.locality.findMany({ where: { listings: { none: {} } }, select: { id: true, name: true } });
  if (empties.length) {
    await db.faq.deleteMany({ where: { entityType: "locality", entityId: { in: empties.map((e) => e.id) } } });
    await db.locality.deleteMany({ where: { id: { in: empties.map((e) => e.id) } } });
  }

  // featured / trending spread across cities
  await db.listing.updateMany({ data: { featured: false, trending: false } });
  for (const c of FILES) {
    const rows = await db.listing.findMany({
      where: { cityId: cityId[c.slug], status: "published", plans: { some: { productType: "coworking", prices: { some: {} } } } },
      orderBy: [{ capacity: "desc" }], select: { id: true }, take: 8,
    });
    if (rows.slice(0, 4).length) await db.listing.updateMany({ where: { id: { in: rows.slice(0, 4).map((x) => x.id) } }, data: { featured: true } });
    if (rows.slice(4, 8).length) await db.listing.updateMany({ where: { id: { in: rows.slice(4, 8).map((x) => x.id) } }, data: { trending: true } });
  }

  // report real minimum prices per product (to sanity-check site.ts "from" labels)
  const mins = {};
  for (const t of ["coworking", "dedicated_desk", "private_cabin", "managed_office", "office_leasing", "virtual_office"]) {
    const row = await db.price.findFirst({ where: { plan: { productType: t } }, orderBy: { amount: "asc" }, select: { amount: true, period: true } });
    if (row) mins[t] = `${row.amount}/${row.period}`;
  }

  const counts = {};
  for (const c of FILES) counts[c.slug] = await db.listing.count({ where: { cityId: cityId[c.slug], status: "published" } });
  const locCount = await db.locality.count();

  await db.$disconnect();
  console.log(`\n✅ Imported ${created} listings (${skipped} skipped)`);
  console.log(`   images: ${images} · plans: ${plansMade} · new localities: ${newLocalities.length} (+${faqs} FAQs) · empty localities removed: ${empties.length}`);
  console.log(`   published per city: ${JSON.stringify(counts)} · localities now: ${locCount}`);
  console.log(`   real minimum prices: ${JSON.stringify(mins)}`);
  if (errors.length) { console.log(`   first errors:`); errors.slice(0, 8).forEach((e) => console.log("     " + e)); }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
