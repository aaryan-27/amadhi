#!/usr/bin/env node
/**
 * Amadhi — bulk import from "master-data.xlsx" (Master Data Coworking Spaces).
 * ONE SHEET PER CITY; we import ONLY Gurgaon, Noida and Delhi. City comes from
 * the sheet name. Uses SheetJS (xlsx) for reliable parsing; columns are matched
 * by header NAME so each sheet's different layout is handled.
 *
 *   node scripts/import-master-data.mjs               # DRY RUN (writes nothing)
 *   node scripts/import-master-data.mjs --commit      # write to the database
 *   node scripts/import-master-data.mjs --wipe-imported --commit  # re-import
 *   node scripts/import-master-data.mjs --file=/abs/path.xlsx
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const WIPE = args.includes("--wipe-imported");
const REPLACE = args.includes("--replace"); // wipe ALL demo listings first
const fileArg = args.find((a) => a.startsWith("--file="));
const XLSX_PATH = fileArg ? fileArg.slice(7) : path.resolve(PROJECT, "..", "master-data.xlsx");

process.env.DATABASE_URL = process.env.DATABASE_URL || readEnv("DATABASE_URL") || "file:./dev.db";

const SHEET_CITY = {
  gurgaon: { slug: "gurugram", name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266 },
  gurugram: { slug: "gurugram", name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266 },
  noida: { slug: "noida", name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391 },
  delhi: { slug: "delhi", name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209 },
};
const cityForSheet = (name) => {
  const n = name.trim().toLowerCase();
  if (n.startsWith("delisted")) return null;
  return SHEET_CITY[n] ?? null;
};

function readEnv(key) {
  try {
    const txt = readFileSync(path.resolve(PROJECT, ".env"), "utf8");
    const m = txt.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
    return m ? m[1] : null;
  } catch { return null; }
}

/* ─── helpers ──────────────────────────────────────────────────────── */
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");
const clean = (v) => String(v ?? "").trim();
const parsePrice = (raw) => {
  const s = clean(raw);
  if (!s) return null;
  const d = s.replace(/[₹,\s]/g, "").match(/\d+(?:\.\d+)?/);
  if (!d) return null;
  const n = Math.round(parseFloat(d[0]));
  return n >= 500 && n <= 150000 ? n : null; // sane monthly per-seat range
};
const STOCK = [
  "photo-1497366216548-37526070297c","photo-1497366811353-6870744d04b2","photo-1524758631624-e2822e304c36",
  "photo-1556761175-5973dc0f32e7","photo-1522071820081-009f0129c71c","photo-1604328698692-f76ea9498e76",
  "photo-1600508774634-4e11d34730e2","photo-1600880292203-757bb62b4baf","photo-1527192491265-7e15c55b1ed2",
  "photo-1497215842964-222b430dc094","photo-1521737604893-d14cc237f11d","photo-1517502884422-41eaead166d4",
];
const stockUrl = (i) => `https://images.unsplash.com/${STOCK[i % STOCK.length]}?q=80&w=1600&auto=format&fit=crop`;

/* normalize a few messy locality spellings so they merge with seeded ones */
const LOCALITY_FIX = {
  "golf course extrention": "Golf Course Extension",
  "golf course extension": "Golf Course Extension",
  "netaji subash place": "Netaji Subhash Place",
  "netaji subhash place": "Netaji Subhash Place",
};

/* header-name → column index resolver */
function resolver(header) {
  const norm = header.map((h) => clean(h).toLowerCase());
  const find = (re) => norm.findIndex((h) => h && re.test(h));
  return {
    name: find(/centre name|^name$/),
    locality: find(/micro market/),
    address: find(/^location$/),
    brand: find(/brand name|^column 1$/),
    capacity: find(/seating capacity/),
    desk: find(/dedicated desk/),
    cabin: find(/private cabin/),
    managed: find(/managed office/),
    range: find(/price range/),
    parking: find(/parking/),
    night: find(/night shift/),
    metro: find(/metro/),
  };
}

function buildRecords(sheets) {
  const all = [];
  const perSheet = [];
  for (const sheet of sheets) {
    const city = cityForSheet(sheet.name);
    if (!city) continue;
    const header = sheet.rows[0] ?? [];
    const R = resolver(header);
    const cell = (r, i) => (i >= 0 ? clean(r[i]) : "");
    const data = sheet.rows.slice(1).filter((r) => r.some((c) => clean(c) !== ""));
    let kept = 0;
    for (const [n, r] of data.entries()) {
      const name = cell(r, R.name) || cell(r, R.address);
      if (!name || !/[a-z]/i.test(name)) continue; // skip empty / numeric-junk rows
      const brand = cell(r, R.brand);
      let locality = cell(r, R.locality);
      if (/blank|per\s*seat|^\$|₹/i.test(locality) || !/[a-z0-9]/i.test(locality)) locality = "";
      if (/faridabad|ghaziabad/i.test(locality)) continue; // keep NCR core only
      locality = LOCALITY_FIX[locality.trim().toLowerCase()] || locality.trim();
      const address = cell(r, R.address);
      const capRaw = cell(r, R.capacity).replace(/[^\d]/g, "");

      // pricing plans from per-product columns
      const desk = parsePrice(cell(r, R.desk));
      const cabin = parsePrice(cell(r, R.cabin));
      const managed = parsePrice(cell(r, R.managed));
      const range = parsePrice(cell(r, R.range));
      const seat = desk ?? range ?? cabin ?? managed; // headline coworking seat price
      const plans = [];
      if (seat) plans.push({ type: "coworking", price: seat }); // discoverable under /coworking-space
      if (desk) plans.push({ type: "dedicated_desk", price: desk });
      if (cabin) plans.push({ type: "private_cabin", price: cabin });
      if (managed) plans.push({ type: "managed_office", price: managed });

      const operator = brand || name.split(/\s*[-–|,]\s*/)[0].trim();
      const parking = cell(r, R.parking);
      const night = cell(r, R.night);

      all.push({
        name, city, sheet: sheet.name, row: n + 2,
        locality, address, operator,
        capacity: capRaw ? Math.min(20000, parseInt(capRaw, 10)) : 0,
        plans,
        parking: parking && !/^(no|n\/a|-)$/i.test(parking),
        night: /yes|24|round/i.test(night),
      });
      kept++;
    }
    perSheet.push({ name: sheet.name, city: city.slug, resolver: R, header, dataRows: data.length, kept });
  }
  return { all, perSheet };
}

/* ─── main ─────────────────────────────────────────────────────────── */
async function main() {
  let XLSX;
  try {
    XLSX = (await import("xlsx")).default;
  } catch {
    console.error("\n✖ SheetJS not installed. Run:  npm install xlsx\n");
    process.exit(1);
  }

  console.log(`\n📄 Reading ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH);
  const sheets = wb.SheetNames.map((nm) => ({
    name: nm,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: "", raw: false, blankrows: false }),
  }));
  const ncr = sheets.filter((s) => cityForSheet(s.name));
  console.log(`   NCR sheets: ${ncr.map((s) => `${s.name}→${cityForSheet(s.name).slug}(${s.rows.length})`).join(", ")}`);

  const { all, perSheet } = buildRecords(ncr);

  console.log(`\n🧭 Column resolution per sheet:`);
  for (const s of perSheet) {
    const R = s.resolver;
    const lbl = (i) => (i >= 0 ? `${i}:"${clean(s.header[i])}"` : "—");
    console.log(`   ${s.name} [${s.city}] ${s.kept}/${s.dataRows} rows`);
    console.log(`     name=${lbl(R.name)} locality=${lbl(R.locality)} address=${lbl(R.address)} brand=${lbl(R.brand)} cap=${lbl(R.capacity)}`);
    console.log(`     desk=${lbl(R.desk)} cabin=${lbl(R.cabin)} managed=${lbl(R.managed)} range=${lbl(R.range)} parking=${lbl(R.parking)} night=${lbl(R.night)}`);
  }

  const byCity = {}, byLoc = {};
  for (const r of all) {
    byCity[r.city.slug] = (byCity[r.city.slug] ?? 0) + 1;
    const k = `${r.city.slug} / ${r.locality || "—"}`;
    byLoc[k] = (byLoc[k] ?? 0) + 1;
  }
  const withPrice = all.filter((r) => r.plans.length).length;
  const withOp = all.filter((r) => r.operator).length;
  const withCap = all.filter((r) => r.capacity).length;
  console.log(`\n📊 Total NCR listings: ${all.length}`);
  console.log(`   by city: ${JSON.stringify(byCity)}`);
  console.log(`   with pricing: ${withPrice} · with operator: ${withOp} · with capacity: ${withCap}`);
  console.log(`\n   localities (top 30):`);
  Object.entries(byLoc).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .forEach(([k, v]) => console.log(`     ${String(v).padStart(4)}  ${k}`));
  console.log(`\n   sample listings:`);
  all.slice(0, 15).forEach((r) => {
    const p = r.plans.length ? r.plans.map((x) => `${x.type.replace("_", " ")} ₹${x.price}`).join(", ") : "price on request";
    console.log(`     • ${r.name}  [${r.city.slug}/${r.locality || "—"}]  ${p}  ${r.capacity ? r.capacity + " seats" : ""}  op:${r.operator || "—"}`);
  });

  if (!COMMIT) {
    console.log(`\n✅ DRY RUN — nothing written. Re-run with --commit to import ${all.length} listings.\n`);
    return;
  }

  /* ─── commit ─────────────────────────────────────────────────────── */
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  console.log(`\n💾 Committing ${all.length} listings…`);

  if (REPLACE) {
    // Remove ALL existing (demo) listings so the site shows only real imports.
    await db.visitBooking.deleteMany({});
    await db.meetingRoomRequest.deleteMany({});
    await db.review.deleteMany({});
    await db.availabilitySlot.deleteMany({});
    await db.listing.deleteMany({}); // cascades images/amenities/plans/prices
    await db.operator.deleteMany({}); // demo operators; real ones recreated below
    console.log("   wiped all existing listings & operators (demo data removed)");
  }

  if (WIPE) {
    const prev = await db.listing.findMany({ where: { plans: { some: { highlights: { contains: "Imported from Amadhi master data" } } } }, select: { id: true } });
    const ids = prev.map((p) => p.id);
    if (ids.length) {
      await db.plan.deleteMany({ where: { listingId: { in: ids } } });
      await db.listingImage.deleteMany({ where: { listingId: { in: ids } } });
      await db.listingAmenity.deleteMany({ where: { listingId: { in: ids } } });
      await db.review.deleteMany({ where: { listingId: { in: ids } } });
      await db.listing.deleteMany({ where: { id: { in: ids } } });
      console.log(`   wiped ${ids.length} previously-imported listings`);
    }
  }

  const cityId = {};
  for (const key of ["gurugram", "noida", "delhi"]) {
    const c = Object.values(SHEET_CITY).find((x) => x.slug === key);
    const ex = await db.city.findUnique({ where: { slug: key } });
    cityId[key] = ex ? ex.id : (await db.city.create({ data: { slug: key, name: c.name, state: c.state, lat: c.lat, lng: c.lng } })).id;
  }
  const amenities = await db.amenity.findMany();
  const amBySlug = Object.fromEntries(amenities.map((a) => [a.slug, a.id]));

  const usedSlugs = new Set((await db.listing.findMany({ select: { slug: true } })).map((l) => l.slug));
  const locCache = new Map(), opCache = new Map();
  let created = 0, skipped = 0, imgN = 0;
  const errors = [];

  for (const r of all) {
    try {
      const c = r.city;
      const locName = r.locality || `${c.name} Central`;
      const locSlug = slugify(locName) || "central";
      const lkey = `${c.slug}:${locSlug}`;
      let locId = locCache.get(lkey);
      if (!locId) {
        const f = await db.locality.findFirst({ where: { cityId: cityId[c.slug], slug: locSlug } });
        locId = f ? f.id : (await db.locality.create({ data: { slug: locSlug, name: locName, cityId: cityId[c.slug], lat: c.lat, lng: c.lng, overview: `${locName} is a business micro-market in ${c.name}.`, metroJson: "[]" } })).id;
        locCache.set(lkey, locId);
      }
      let opId;
      if (r.operator) {
        const os = slugify(r.operator);
        if (os) {
          opId = opCache.get(os);
          if (!opId) {
            const f = await db.operator.findUnique({ where: { slug: os } });
            opId = f ? f.id : (await db.operator.create({ data: { slug: os, name: r.operator } })).id;
            opCache.set(os, opId);
          }
        }
      }
      const base = (slugify(`${r.name}-${r.locality || c.name}`) || slugify(r.name) || "space").slice(0, 90);
      let slug = base, k = 2;
      while (usedSlugs.has(slug)) slug = `${base}-${k++}`;
      usedSlugs.add(slug);

      const listing = await db.listing.create({
        data: {
          slug, name: r.name,
          summary: `${r.name} — a workspace in ${locName}, ${c.name}.`,
          description: `${r.name} is a verified workspace in ${locName}, ${c.name}${r.operator ? `, operated by ${r.operator}` : ""}. Enquire via Amadhi for the best negotiated pricing and a free visit — zero brokerage.`,
          cityId: cityId[c.slug], localityId: locId, operatorId: opId,
          address: r.address || `${locName}, ${c.name}`,
          lat: c.lat, lng: c.lng,
          capacity: r.capacity, status: "published", verified: true,
          openDays: r.night ? "24×7" : "Mon–Sat", openingTime: r.night ? "00:00" : "09:00", closingTime: r.night ? "24:00" : "20:00",
          nearbyJson: "[]",
        },
      });

      await db.listingImage.create({ data: { listingId: listing.id, url: stockUrl(imgN++), alt: `${r.name} — workspace`, sortOrder: 0 } });

      // amenities: sensible defaults + data-derived
      const amSlugs = new Set(["high-speed-internet", "meeting-rooms", "power-backup"]);
      if (r.parking) amSlugs.add("parking");
      if (r.night) amSlugs.add("24x7-access");
      if (r.plans.some((p) => p.type === "private_cabin")) amSlugs.add("private-cabins");
      const amData = [...amSlugs].map((s) => amBySlug[s]).filter(Boolean).map((id) => ({ listingId: listing.id, amenityId: id }));
      if (amData.length) await db.listingAmenity.createMany({ data: amData });

      for (const p of r.plans) {
        await db.plan.create({
          data: {
            listingId: listing.id, productType: p.type,
            name: p.type === "private_cabin" ? "Private Cabin" : p.type === "managed_office" ? "Managed Office" : p.type === "dedicated_desk" ? "Dedicated Desk" : "Open Desk",
            seatsMin: 1, seatsMax: Math.max(1, r.capacity || 50),
            highlights: "Imported from Amadhi master data\nZero brokerage via Amadhi",
            prices: { create: [{ amount: p.price, period: "month", unitNote: "per seat" }] },
          },
        });
      }
      created++;
    } catch (e) {
      skipped++;
      errors.push(`${r.sheet} row ${r.row} (${r.name}): ${e.message}`);
    }
  }
  await db.$disconnect();
  console.log(`\n✅ Imported ${created} listings (${skipped} skipped).`);
  if (errors.length) { console.log("   first errors:"); errors.slice(0, 8).forEach((e) => console.log("     " + e)); }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
