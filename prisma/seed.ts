/**
 * Amadhi seed — Gurugram, Noida & Delhi ONLY. No day passes anywhere.
 * Deterministic generator: same data every run (safe to re-run, wipes first).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();

/* deterministic PRNG */
let _s = 42;
const rnd = () => {
  _s = (_s * 1664525 + 1013904223) % 4294967296;
  return _s / 4294967296;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");

/* ─── Static geography ─────────────────────────────────────────────── */

const cities = [
  { slug: "gurugram", name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266,
    blurb: "The corporate capital of NCR — Cyber City, Golf Course Road and Udyog Vihar host India's densest cluster of Fortune 500 offices and premium coworking hubs." },
  { slug: "noida", name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391,
    blurb: "NCR's fastest-growing tech corridor — Sector 62, Sector 125 and the Noida Expressway are home to IT parks, startups and large captive centres." },
  { slug: "delhi", name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209,
    blurb: "The capital's business heart — from Connaught Place's heritage business district to Nehru Place, Saket and Aerocity's new-age commercial hubs." },
];

type Metro = { name: string; line: string; distanceKm: number };
const localities: {
  city: string; slug: string; name: string; lat: number; lng: number;
  overview: string; metro: Metro[]; count: number;
}[] = [
  // Gurugram
  { city: "gurugram", slug: "cyber-city", name: "Cyber City", lat: 28.4951, lng: 77.0895, count: 4,
    overview: "DLF Cyber City is Gurugram's marquee business district — 12 million sq ft of Grade-A towers housing Google, Meta, EY and hundreds of startups, with the Rapid Metro looping through it.",
    metro: [{ name: "Cyber City", line: "Rapid Metro", distanceKm: 0.3 }, { name: "Moulsari Avenue", line: "Rapid Metro", distanceKm: 0.8 }, { name: "Sikanderpur", line: "Yellow Line", distanceKm: 1.6 }] },
  { city: "gurugram", slug: "golf-course-road", name: "Golf Course Road", lat: 28.4506, lng: 77.0993, count: 3,
    overview: "Gurugram's most premium corporate corridor — One Horizon Center, Two Horizon Center and DLF Camellias define its skyline, favoured by funds, law firms and global capability centres.",
    metro: [{ name: "Sector 42-43", line: "Rapid Metro", distanceKm: 0.5 }, { name: "Sector 53-54", line: "Rapid Metro", distanceKm: 0.9 }] },
  { city: "gurugram", slug: "golf-course-extension", name: "Golf Course Extension", lat: 28.4137, lng: 77.0918, count: 2,
    overview: "The fast-rising extension of Golf Course Road — new Grade-A supply at lower rents, popular with growing tech teams that want premium buildings without CBD pricing.",
    metro: [{ name: "Sector 55-56", line: "Rapid Metro", distanceKm: 2.1 }] },
  { city: "gurugram", slug: "mg-road", name: "MG Road", lat: 28.4795, lng: 77.0806, count: 2,
    overview: "Gurugram's original commercial artery — metro-connected malls and office blocks make MG Road the most accessible address for teams commuting from Delhi.",
    metro: [{ name: "MG Road", line: "Yellow Line", distanceKm: 0.4 }, { name: "IFFCO Chowk", line: "Yellow Line", distanceKm: 1.2 }] },
  { city: "gurugram", slug: "udyog-vihar", name: "Udyog Vihar", lat: 28.5015, lng: 77.0854, count: 3,
    overview: "A dense industrial-turned-office hub beside NH-48 and Cyber City — independent buildings and campuses offering the best price-to-location ratio in Gurugram.",
    metro: [{ name: "Cyber City", line: "Rapid Metro", distanceKm: 1.7 }, { name: "Guru Dronacharya", line: "Yellow Line", distanceKm: 2.4 }] },
  { city: "gurugram", slug: "sohna-road", name: "Sohna Road", lat: 28.4089, lng: 77.041, count: 2,
    overview: "A self-contained corridor in south Gurugram — office towers above retail, strong residential catchment, and significantly gentler rents than the CBD.",
    metro: [{ name: "Millennium City Centre", line: "Yellow Line", distanceKm: 5.5 }] },
  { city: "gurugram", slug: "sector-44", name: "Sector 44", lat: 28.4507, lng: 77.0722, count: 1,
    overview: "An institutional sector beside Millennium City Centre metro — quiet, well-planned blocks that suit training centres, consultancies and back offices.",
    metro: [{ name: "Millennium City Centre", line: "Yellow Line", distanceKm: 1.0 }] },
  { city: "gurugram", slug: "sector-18", name: "Sector 18", lat: 28.4918, lng: 77.0655, count: 1,
    overview: "Part of the Udyog Vihar belt with quick NH-48 access — converted industrial plots host bootstrapped startups and D2C brands at value rents.",
    metro: [{ name: "Sikanderpur", line: "Yellow Line", distanceKm: 2.6 }] },
  // Noida
  { city: "noida", slug: "sector-62", name: "Sector 62", lat: 28.6273, lng: 77.3646, count: 3,
    overview: "Noida's institutional IT hub — NSEZ-adjacent towers filled with IT services, edtech and BPO teams, with the Blue Line extension at its doorstep.",
    metro: [{ name: "Sector 62", line: "Blue Line", distanceKm: 0.6 }, { name: "Electronic City", line: "Blue Line", distanceKm: 1.1 }] },
  { city: "noida", slug: "sector-63", name: "Sector 63", lat: 28.6304, lng: 77.3782, count: 2,
    overview: "A sprawling grid of independent office buildings — the value capital of Noida for teams of 10–200 that want whole floors at reasonable rents.",
    metro: [{ name: "Electronic City", line: "Blue Line", distanceKm: 1.4 }] },
  { city: "noida", slug: "sector-16", name: "Sector 16", lat: 28.5786, lng: 77.3179, count: 1,
    overview: "Old Noida's established office pocket beside the film city — metro-connected and minutes from the DND Flyway into Delhi.",
    metro: [{ name: "Sector 16", line: "Blue Line", distanceKm: 0.4 }] },
  { city: "noida", slug: "sector-18", name: "Sector 18", lat: 28.5708, lng: 77.3261, count: 2,
    overview: "Noida's high-street commercial centre — Atta Market energy, mall-adjacent offices and excellent metro access make it a favourite for client-facing teams.",
    metro: [{ name: "Sector 18", line: "Blue Line", distanceKm: 0.3 }, { name: "Botanical Garden", line: "Blue/Magenta", distanceKm: 1.5 }] },
  { city: "noida", slug: "sector-125", name: "Sector 125", lat: 28.5449, lng: 77.3324, count: 2,
    overview: "The Amity-adjacent expressway sector — modern campuses with large floor plates, popular with media, gaming and analytics companies.",
    metro: [{ name: "Okhla Bird Sanctuary", line: "Magenta Line", distanceKm: 2.2 }] },
  { city: "noida", slug: "noida-expressway", name: "Noida Expressway", lat: 28.5023, lng: 77.4085, count: 3,
    overview: "The Noida-Greater Noida Expressway is NCR's newest Grade-A office belt — glass campuses in Sectors 126–144 with aggressive pricing and huge parking ratios.",
    metro: [{ name: "Sector 137", line: "Aqua Line", distanceKm: 0.8 }, { name: "Sector 142", line: "Aqua Line", distanceKm: 1.2 }] },
  // Delhi
  { city: "delhi", slug: "connaught-place", name: "Connaught Place", lat: 28.6315, lng: 77.2167, count: 4,
    overview: "Delhi's iconic Georgian business district — the most prestigious address in the capital, ringed by the Rajiv Chowk interchange and every government and banking head office.",
    metro: [{ name: "Rajiv Chowk", line: "Blue/Yellow", distanceKm: 0.2 }, { name: "Barakhamba Road", line: "Blue Line", distanceKm: 0.6 }, { name: "Janpath", line: "Violet Line", distanceKm: 0.9 }] },
  { city: "delhi", slug: "nehru-place", name: "Nehru Place", lat: 28.5494, lng: 77.2519, count: 3,
    overview: "Asia's largest IT market reborn as a commercial hub — Epitome-grade towers beside the bazaar, with the Magenta and Violet lines crossing underneath.",
    metro: [{ name: "Nehru Place", line: "Violet/Magenta", distanceKm: 0.3 }, { name: "Kailash Colony", line: "Violet Line", distanceKm: 1.3 }] },
  { city: "delhi", slug: "saket", name: "Saket", lat: 28.5286, lng: 77.2195, count: 3,
    overview: "South Delhi's polished commercial pocket — Select Citywalk energy, boutique office buildings and a deep talent catchment across South Delhi.",
    metro: [{ name: "Malviya Nagar", line: "Yellow Line", distanceKm: 0.9 }, { name: "Saket", line: "Yellow Line", distanceKm: 1.1 }] },
  { city: "delhi", slug: "okhla", name: "Okhla", lat: 28.5307, lng: 77.2707, count: 1,
    overview: "Delhi's design-and-manufacturing district — studio-style offices in converted industrial estates, home to agencies, ateliers and D2C brands.",
    metro: [{ name: "Okhla NSIC", line: "Magenta Line", distanceKm: 0.7 }] },
  { city: "delhi", slug: "aerocity", name: "Aerocity", lat: 28.5562, lng: 77.1178, count: 2,
    overview: "The hospitality-led business district beside IGI Airport — five-star hotels, Worldmark towers and the fastest airport access in NCR for travelling teams.",
    metro: [{ name: "Aerocity", line: "Airport Express", distanceKm: 0.4 }] },
  { city: "delhi", slug: "jasola", name: "Jasola", lat: 28.5379, lng: 77.2887, count: 1,
    overview: "A planned district centre on the Delhi–Noida axis — DLF Towers and institutional blocks favoured by healthcare, NGOs and mid-size corporates.",
    metro: [{ name: "Jasola Apollo", line: "Violet Line", distanceKm: 0.5 }] },
  { city: "delhi", slug: "netaji-subhash-place", name: "Netaji Subhash Place", lat: 28.6961, lng: 77.1524, count: 1,
    overview: "North-west Delhi's commercial heart — twin metro lines, dense retail and the best-value professional offices north of the Ridge.",
    metro: [{ name: "Netaji Subhash Place", line: "Red/Pink", distanceKm: 0.3 }] },
  { city: "delhi", slug: "mohan-cooperative", name: "Mohan Cooperative", lat: 28.5205, lng: 77.2954, count: 1,
    overview: "An industrial estate turned corporate corridor on Mathura Road — large campuses and press headquarters with quick access to Faridabad and Noida.",
    metro: [{ name: "Mohan Estate", line: "Violet Line", distanceKm: 0.6 }] },
];

const operators = [
  { slug: "workline", name: "Workline", about: "Premium managed campuses across NCR's business districts." },
  { slug: "hive-and-co", name: "Hive & Co", about: "Design-led coworking for creative and product teams." },
  { slug: "thirdspace", name: "ThirdSpace", about: "Enterprise-grade flexible workspaces with hotel-style service." },
  { slug: "craftdesk", name: "Craftdesk", about: "Warm, community-first coworking studios." },
  { slug: "elevate-workspaces", name: "Elevate Workspaces", about: "Tech-enabled offices in Grade-A towers." },
  { slug: "nucleus-work", name: "Nucleus Work", about: "Full-floor managed offices for scaling teams." },
  { slug: "foundry-offices", name: "Foundry Offices", about: "Industrial-chic studios and cabins." },
  { slug: "corner-office", name: "Corner Office", about: "Boutique business centres with concierge service." },
];

const photoPool = [
  "photo-1497366216548-37526070297c", "photo-1497366811353-6870744d04b2",
  "photo-1524758631624-e2822e304c36", "photo-1556761175-5973dc0f32e7",
  "photo-1556761175-b413da4baf72", "photo-1522071820081-009f0129c71c",
  "photo-1604328698692-f76ea9498e76", "photo-1600508774634-4e11d34730e2",
  "photo-1600880292203-757bb62b4baf", "photo-1527192491265-7e15c55b1ed2",
  "photo-1519389950473-47ba0277781c", "photo-1531973576160-7125cd663d86",
  "photo-1462826303086-329426d1aef5", "photo-1517502884422-41eaead166d4",
  "photo-1497215842964-222b430dc094", "photo-1521737604893-d14cc237f11d",
  "photo-1504384308090-c894fdcc538d", "photo-1520880867055-1e30d1cb001c",
  "photo-1577412647305-991150c7d163", "photo-1568992687947-868a62a9f521",
  "photo-1571624436279-b272aff752b5", "photo-1554469384-e58fac16e23a",
  "photo-1549637642-90187f64f420",
];
const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const amenityDefs = [
  { slug: "high-speed-internet", name: "High-Speed Internet", icon: "Wifi" },
  { slug: "meeting-rooms", name: "Meeting Rooms", icon: "Presentation" },
  { slug: "private-cabins", name: "Private Cabins", icon: "DoorClosed" },
  { slug: "parking", name: "Parking", icon: "CircleParking" },
  { slug: "cafe", name: "Café & Pantry", icon: "Coffee" },
  { slug: "24x7-access", name: "24×7 Access", icon: "Clock" },
  { slug: "power-backup", name: "Power Backup", icon: "Zap" },
  { slug: "gym", name: "Gym", icon: "Dumbbell" },
  { slug: "food-court", name: "Food Court", icon: "UtensilsCrossed" },
  { slug: "wheelchair-accessible", name: "Wheelchair Accessible", icon: "Accessibility" },
  { slug: "phone-booths", name: "Phone Booths", icon: "Phone" },
  { slug: "printing", name: "Printing & Stationery", icon: "Printer" },
  { slug: "security", name: "24×7 Security", icon: "ShieldCheck" },
  { slug: "reception", name: "Reception & Front Desk", icon: "BellRing" },
  { slug: "event-space", name: "Event Space", icon: "PartyPopper" },
];

/* city premium multipliers for pricing realism */
const cityFactor: Record<string, number> = { gurugram: 1.15, noida: 0.9, delhi: 1.1 };
const localityFactor: Record<string, number> = {
  "cyber-city": 1.3, "golf-course-road": 1.4, "connaught-place": 1.45,
  "aerocity": 1.3, "saket": 1.15, "sector-18": 1.05, "noida-expressway": 0.85,
  "sector-63": 0.8, "udyog-vihar": 0.95, "sohna-road": 0.8,
};

const reviewPool = [
  { persona: "Startup Founder", title: "Moved our team of 12 here in a week", body: "The Amadhi team shortlisted three options, set up visits the next day and negotiated a better rate than we found ourselves. The space itself is bright, quiet and the internet has never dropped." },
  { persona: "Freelance Designer", title: "Finally a desk I look forward to", body: "Great coffee, natural light and meeting rooms I can book by the hour when clients visit. The community events are a genuine bonus." },
  { persona: "Sales Head, SaaS", title: "Client-ready meeting rooms", body: "We host partner demos every week. The rooms are professional, the AV works, and the front desk greets our guests properly. That matters more than people think." },
  { persona: "HR Manager, GCC", title: "Painless expansion to NCR", body: "We needed 40 seats with our own branding and access control. The managed office was delivered in three weeks, fully fitted. Facilities are handled end-to-end." },
  { persona: "CA & Consultant", title: "Virtual office made GST registration easy", body: "Documentation was prepared in two days and the address works perfectly for client correspondence. Zero friction." },
  { persona: "Engineering Lead", title: "Quiet, fast internet, 24×7", body: "Our team ships late nights before releases. 24×7 access with proper security and power backup was non-negotiable — this delivers." },
  { persona: "Agency Owner", title: "Landed bigger clients from a better address", body: "Meeting clients in a proper business district changed how our studio is perceived. Worth every rupee." },
  { persona: "Remote Team Manager", title: "Perfect hub for a distributed team", body: "We keep six dedicated desks and scale up with day-use meeting rooms when everyone flies in. Flexible and predictable billing." },
];

const faqTemplates = {
  product: (p: string, unit: string) => [
    { q: `How much does a ${p.toLowerCase()} cost in Delhi NCR?`, a: `Pricing varies by micro-market. Entry options start at the from-price shown on each listing (billed per ${unit}), with premium districts like Cyber City, Golf Course Road and Connaught Place commanding 25–45% more. Enquire on any listing for a same-day custom quote — Amadhi charges zero brokerage.` },
    { q: `What is included in the price?`, a: `Almost everything: furniture, high-speed internet, housekeeping, electricity, security and community amenities. Meeting-room credits, parking and after-hours access vary by operator — each listing's plans table spells out inclusions.` },
    { q: `What is the minimum commitment?`, a: `Most operators offer monthly rolling terms for flexible products, while managed offices and leased spaces typically start at 12 months with a 3–6 month lock-in. We negotiate terms on your behalf at no cost.` },
    { q: `Can Amadhi help me compare multiple options?`, a: `Yes — shortlist up to three spaces with the Compare tool, then book visits for the same day. An Amadhi workspace expert accompanies you, shares transparent pricing and negotiates directly with operators.` },
  ],
  city: (p: string, c: string) => [
    { q: `Which are the best areas for ${p.toLowerCase()}s in ${c}?`, a: `The most in-demand micro-markets are shown in the popular localities section above, ranked by live inventory. Metro-connected districts fill fastest — enquire early if your move-in is within 30 days.` },
    { q: `How quickly can I move into a ${p.toLowerCase()} in ${c}?`, a: `Ready-to-move options can be occupied within 48 hours of agreement. Customised managed offices typically take 2–4 weeks depending on fit-out scope.` },
    { q: `Does Amadhi charge brokerage in ${c}?`, a: `No. Amadhi is free for workspace seekers — operators pay us a success fee, and you pay the same (often lower) rate than walking in directly.` },
    { q: `Can I book a visit before deciding?`, a: `Absolutely — use Book a Visit on any listing to pick a slot. Our ${c} team accompanies every visit and typically responds in under 5 minutes during business hours.` },
  ],
  locality: (l: string, c: string) => [
    { q: `Why choose a workspace in ${l}?`, a: `${l} combines connectivity, talent access and business ecosystem — see the area overview above. Amadhi verifies every listed space in ${l} in person.` },
    { q: `How do I reach ${l} by metro?`, a: `The nearest stations and walking distances are listed in the connectivity section on this page. Most spaces here are within a short auto ride of a metro station in ${c}.` },
    { q: `What does a workspace in ${l} cost?`, a: `The average pricing band for ${l} is shown above and is refreshed from live listings. Enquire for a custom quote — negotiated rates are often below the rack rate.` },
  ],
  listing: (n: string, l: string) => [
    { q: `How do I book a visit to ${n}?`, a: `Click Book a Visit, pick a date and slot, and our team confirms on WhatsApp within minutes. Visits are free and no-obligation.` },
    { q: `Is the from-price at ${n} negotiable?`, a: `Listed prices are rack rates. For teams of 5+ or longer commitments, Amadhi typically negotiates 5–15% off. Start an enquiry to get our best rate.` },
    { q: `Where exactly is ${n} located?`, a: `In ${l} — the map on this page shows the exact location along with nearby metro stations and landmarks.` },
  ],
  home: [
    { q: "What is Amadhi?", a: "Amadhi is Delhi NCR's premium workspace marketplace. We help teams discover, compare and book coworking spaces, managed offices, private cabins, dedicated desks, meeting rooms, leased offices and virtual offices across Gurugram, Noida and Delhi — with zero brokerage." },
    { q: "Does Amadhi charge users anything?", a: "No. Amadhi is completely free for workspace seekers. Operators pay us a success fee when you move in, and because of our volume, your rate is often lower than a walk-in rate." },
    { q: "Which cities does Amadhi cover?", a: "We are deliberately focused on Delhi NCR: Gurugram, Noida and Delhi. Depth over breadth — our team personally verifies every space we list." },
    { q: "How fast will I hear back after an enquiry?", a: "Under 5 minutes during business hours (9am–8pm, Mon–Sat) on WhatsApp or phone — it's an SLA we track internally on every single lead." },
    { q: "Can Amadhi handle enterprise requirements?", a: "Yes. Our enterprise desk handles 50–2,000 seat requirements: managed offices, built-to-suit campuses and long-term leases, including multi-city NCR portfolios." },
  ],
};

/* product plan generators: [productType, name, baseAmount, period, unitNote, seats] */
const planDefs: [string, string, number, string, string, [number, number]][] = [
  ["coworking", "Open Desk (Flexi)", 5999, "month", "per seat", [1, 20]],
  ["dedicated_desk", "Dedicated Desk", 7499, "month", "per seat", [1, 30]],
  ["private_cabin", "Private Cabin", 9499, "month", "per seat", [2, 12]],
  ["meeting_room", "Meeting Room (4–6 pax)", 449, "hour", "per room", [4, 6]],
  ["meeting_room", "Board Room (10–14 pax)", 999, "hour", "per room", [10, 14]],
  ["managed_office", "Managed Office Suite", 8999, "month", "per seat", [10, 100]],
  ["office_leasing", "Bare-shell Lease", 62, "sqft_month", "per sq ft", [50, 500]],
  ["virtual_office", "VO — GST Registration", 1199, "month", "billed annually", [1, 1]],
  ["virtual_office", "VO — Business Address", 899, "month", "billed annually", [1, 1]],
];

async function main() {
  console.log("Seeding Amadhi…");

  /* wipe (order matters) */
  await db.$transaction([
    db.activityLog.deleteMany(), db.notification.deleteMany(),
    db.blogPostTag.deleteMany(), db.blogPost.deleteMany(), db.tag.deleteMany(),
    db.blogCategory.deleteMany(), db.author.deleteMany(),
    db.review.deleteMany(), db.meetingRoomRequest.deleteMany(),
    db.visitBooking.deleteMany(), db.lead.deleteMany(), db.company.deleteMany(),
    db.availabilitySlot.deleteMany(), db.price.deleteMany(), db.plan.deleteMany(),
    db.listingAmenity.deleteMany(), db.amenity.deleteMany(),
    db.listingImage.deleteMany(), db.faq.deleteMany(), db.seoMeta.deleteMany(),
    db.listing.deleteMany(), db.operator.deleteMany(),
    db.locality.deleteMany(), db.city.deleteMany(),
    db.adminUser.deleteMany(), db.role.deleteMany(),
    db.media.deleteMany(), db.setting.deleteMany(),
  ]);

  /* geography */
  const cityMap: Record<string, string> = {};
  for (const c of cities) {
    const row = await db.city.create({ data: c });
    cityMap[c.slug] = row.id;
  }
  const locMap: Record<string, { id: string; name: string; city: string }> = {};
  for (const l of localities) {
    const row = await db.locality.create({
      data: {
        slug: l.slug, name: l.name, cityId: cityMap[l.city],
        lat: l.lat, lng: l.lng, overview: l.overview,
        metroJson: JSON.stringify(l.metro),
      },
    });
    locMap[`${l.city}/${l.slug}`] = { id: row.id, name: l.name, city: l.city };
  }

  /* operators & amenities */
  const opIds: string[] = [];
  for (const o of operators) {
    const row = await db.operator.create({ data: { ...o, website: `https://www.${o.slug.replace(/-/g, "")}.in` } });
    opIds.push(row.id);
  }
  const amenityIds: string[] = [];
  for (const a of amenityDefs) {
    const row = await db.amenity.create({ data: a });
    amenityIds.push(row.id);
  }

  /* listings */
  let li = 0;
  const usedSlugs = new Set<string>();
  for (const l of localities) {
    for (let k = 0; k < l.count; k++) {
      const op = operators[(li + k) % operators.length];
      const opId = opIds[(li + k) % operators.length];
      let name = `${op.name} ${l.name}`;
      let slug = slugify(name);
      if (usedSlugs.has(slug)) { name = `${op.name} ${l.name} Two`; slug = slugify(name); }
      usedSlugs.add(slug);

      const factor = (cityFactor[l.city] ?? 1) * (localityFactor[l.slug] ?? 1);
      const capacity = between(60, 450);
      const is247 = rnd() > 0.45;

      // choose products: all get coworking/desk/cabin/meeting; rotate extras
      const defs = planDefs.filter((p) => {
        if (p[0] === "managed_office") return li % 2 === 0;
        if (p[0] === "office_leasing") return li % 4 === 0;
        if (p[0] === "virtual_office") return li % 3 === 0;
        if (p[1].startsWith("Board Room")) return li % 2 === 1;
        return true;
      });

      const nearby = [
        ...l.metro.map((m) => ({ name: `${m.name} Metro (${m.line})`, distanceKm: m.distanceKm, type: "metro" })),
        { name: pick(["Starbucks", "Blue Tokai", "Third Wave Coffee"]), distanceKm: +(rnd() * 0.8 + 0.1).toFixed(1), type: "landmark" },
        { name: pick(["HDFC Bank ATM", "ICICI Bank", "Axis Bank"]), distanceKm: +(rnd() * 0.6 + 0.1).toFixed(1), type: "landmark" },
      ];

      const listing = await db.listing.create({
        data: {
          slug, name,
          summary: `${op.about} Located in the heart of ${l.name}, ${cities.find((c) => c.slug === l.city)!.name}.`,
          description:
`${name} is a ${is247 ? "24×7 " : ""}fully-serviced workspace in ${l.name}, ${cities.find((c) => c.slug === l.city)!.name}, operated by ${op.name}. Spread across ${between(1, 4)} floors with capacity for ${capacity} members, it offers ergonomic workstations, soundproof cabins, bookable meeting rooms and a well-stocked café.

The centre is ${l.metro[0] ? `${l.metro[0].distanceKm} km from ${l.metro[0].name} station` : "well connected by road"}, with ample parking and 100% power backup. Teams choose ${name} for its ${pick(["natural light and quiet zones", "community events and networking", "hotel-grade front desk and housekeeping", "flexible expansion terms"])}, and for ${op.name}'s reputation for responsive facility management.

Every Amadhi listing is verified in person — photos, pricing and amenities are checked against the actual site so there are no surprises on your visit.`,
          cityId: cityMap[l.city],
          localityId: locMap[`${l.city}/${l.slug}`].id,
          operatorId: opId,
          address: `${between(1, 9)}th Floor, ${pick(["Tower A", "Tower B", "Plaza One", "Central Block"])}, ${l.name}, ${cities.find((c) => c.slug === l.city)!.name}`,
          lat: l.lat + (rnd() - 0.5) * 0.008,
          lng: l.lng + (rnd() - 0.5) * 0.008,
          capacity,
          openingTime: is247 ? "00:00" : "08:00",
          closingTime: is247 ? "24:00" : "21:00",
          openDays: is247 ? "24×7" : "Mon–Sat",
          status: "published",
          verified: true,
          featured: li % 5 === 0,
          trending: li % 7 === 2,
          nearbyJson: JSON.stringify(nearby),
          images: {
            create: Array.from({ length: 5 }, (_, i) => ({
              url: img(photoPool[(li * 3 + i) % photoPool.length]),
              alt: `${name} — ${["workspace overview", "open seating area", "private cabin", "meeting room", "café and lounge"][i]}`,
              sortOrder: i,
            })),
          },
          amenities: {
            create: [0, 1, 2, 4, 6, 10, 12, 13]
              .concat(is247 ? [5] : [], li % 2 ? [3] : [], li % 3 ? [11] : [], li % 4 === 0 ? [7, 8] : [], li % 5 === 0 ? [9, 14] : [])
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((idx) => ({ amenityId: amenityIds[idx] })),
          },
        },
      });

      for (const [ptype, pname, base, period, unitNote, seats] of defs) {
        const amount = Math.round((base * factor * (0.92 + rnd() * 0.16)) / (period === "hour" ? 10 : 100)) * (period === "hour" ? 10 : 100);
        await db.plan.create({
          data: {
            listingId: listing.id, productType: ptype, name: pname,
            seatsMin: seats[0], seatsMax: seats[1],
            highlights: ["High-speed internet", "Housekeeping & utilities included", period === "hour" ? "Whiteboard, screen & VC setup" : "Meeting room credits", "Zero brokerage via Amadhi"].join("\n"),
            prices: { create: [{ amount, period, unitNote }] },
          },
        });
      }

      /* reviews */
      const rCount = between(2, 5);
      let rSum = 0;
      for (let r = 0; r < rCount; r++) {
        const rv = reviewPool[(li + r * 3) % reviewPool.length];
        const rating = between(4, 5);
        rSum += rating;
        await db.review.create({
          data: {
            listingId: listing.id, name: pick(["Aarav S.", "Priya M.", "Rohan K.", "Sneha T.", "Vikram B.", "Ananya G.", "Kabir J.", "Ishita R."]),
            persona: rv.persona, rating, title: rv.title, body: rv.body,
            status: "approved",
            createdAt: new Date(Date.now() - between(5, 300) * 86400000),
          },
        });
      }
      await db.listing.update({
        where: { id: listing.id },
        data: { rating: +(rSum / rCount).toFixed(1), reviewCount: rCount },
      });

      /* listing FAQs */
      for (const [i, f] of faqTemplates.listing(name, `${l.name}, ${cities.find((c) => c.slug === l.city)!.name}`).entries()) {
        await db.faq.create({ data: { entityType: "listing", entityId: listing.id, question: f.q, answer: f.a, sortOrder: i } });
      }
      li++;
    }
  }
  console.log(`  ${li} listings created`);

  /* product / city / locality / home FAQs */
  const productDefs = [
    ["coworking", "Coworking Space", "seat/month"], ["managed_office", "Managed Office", "seat/month"],
    ["private_cabin", "Private Cabin", "cabin/month"], ["dedicated_desk", "Dedicated Desk", "desk/month"],
    ["meeting_room", "Meeting Room", "hour"], ["office_leasing", "Office Leasing", "sq ft/month"],
    ["virtual_office", "Virtual Office", "month"],
  ] as const;
  for (const [ptype, pname, unit] of productDefs) {
    for (const [i, f] of faqTemplates.product(pname, unit).entries())
      await db.faq.create({ data: { entityType: "product", entityId: ptype, question: f.q, answer: f.a, sortOrder: i } });
    for (const c of cities)
      for (const [i, f] of faqTemplates.city(pname, c.name).entries())
        await db.faq.create({ data: { entityType: "product_city", entityId: `${ptype}:${c.slug}`, question: f.q, answer: f.a, sortOrder: i } });
  }
  for (const l of localities)
    for (const [i, f] of faqTemplates.locality(l.name, cities.find((c) => c.slug === l.city)!.name).entries())
      await db.faq.create({ data: { entityType: "locality", entityId: locMap[`${l.city}/${l.slug}`].id, question: f.q, answer: f.a, sortOrder: i } });
  for (const [i, f] of faqTemplates.home.entries())
    await db.faq.create({ data: { entityType: "page", entityId: "home", question: f.q, answer: f.a, sortOrder: i } });

  /* blog */
  const authors = await Promise.all([
    db.author.create({ data: { slug: "meera-krishnan", name: "Meera Krishnan", role: "Head of Content", bio: "Meera has covered Indian commercial real estate for 9 years and leads workspace research at Amadhi.", avatar: img("photo-1573496359142-b8d87734a5a2", 400), linkedin: "https://linkedin.com/in/meera-krishnan" } }),
    db.author.create({ data: { slug: "arjun-mehta", name: "Arjun Mehta", role: "Workspace Consultant", bio: "Arjun has placed 400+ teams into NCR offices and writes practical guides on leasing and managed offices.", avatar: img("photo-1560250097-0b93528c311a", 400), linkedin: "https://linkedin.com/in/arjun-mehta" } }),
    db.author.create({ data: { slug: "sana-qureshi", name: "Sana Qureshi", role: "SEO & Research Analyst", bio: "Sana tracks micro-market pricing and demand trends across Gurugram, Noida and Delhi.", avatar: img("photo-1580489944761-15a19d654956", 400), linkedin: "https://linkedin.com/in/sana-qureshi" } }),
  ]);
  const catDefs = ["Coworking", "Office Leasing", "Managed Offices", "Virtual Office", "Business", "Real Estate", "Startup"];
  const cats: Record<string, string> = {};
  for (const c of catDefs) {
    const row = await db.blogCategory.create({ data: { slug: slugify(c), name: c } });
    cats[slugify(c)] = row.id;
  }
  const tagDefs = ["gurugram", "noida", "delhi", "coworking-space", "managed-office", "virtual-office", "meeting-rooms", "office-leasing", "pricing", "guides"];
  const tags: Record<string, string> = {};
  for (const t of tagDefs) {
    const row = await db.tag.create({ data: { slug: t, name: t.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") } });
    tags[t] = row.id;
  }

  const posts = [
    {
      slug: "coworking-space-cost-gurugram-2026", title: "What Does a Coworking Space Really Cost in Gurugram in 2026?",
      cat: "coworking", author: 0, tags: ["gurugram", "coworking-space", "pricing"],
      cover: img("photo-1497366216548-37526070297c"),
      excerpt: "From ₹6,000 flexi desks in Udyog Vihar to ₹18,000 seats on Golf Course Road — a locality-by-locality breakdown of what you'll actually pay, and where the hidden costs are.",
      body: `## The short answer

A coworking seat in Gurugram costs **₹5,999–₹18,000 per month** in 2026 depending on micro-market, product and commitment. Here is the realistic band per locality:

| Locality | Flexi desk | Dedicated desk | Private cabin (per seat) |
|---|---|---|---|
| Cyber City | ₹9,500–13,000 | ₹11,000–15,000 | ₹13,000–18,000 |
| Golf Course Road | ₹10,000–14,000 | ₹12,000–16,000 | ₹14,000–18,000 |
| MG Road | ₹7,500–10,000 | ₹9,000–12,000 | ₹10,500–14,000 |
| Udyog Vihar | ₹6,000–8,500 | ₹7,500–10,000 | ₹9,000–12,500 |
| Sohna Road | ₹5,999–7,500 | ₹7,000–9,000 | ₹8,500–11,000 |

## What drives the price

**Location beats everything.** A seat 300 m from a Rapid Metro station carries a 20–30% premium over an identical seat 2 km away. **Building grade matters second** — Grade-A towers with destination-controlled lifts and F&B command more than standalone buildings. **Commitment length matters third**: a 12-month term typically unlocks 10–15% off rack rates.

## The hidden costs to check

- **Meeting room credits** — some operators include 4–10 hours/month; others bill every hour.
- **Parking** — ₹1,500–3,500/month per car in most Gurugram towers, rarely included.
- **After-hours access** — 24×7 access can be a paid add-on on entry plans.
- **Security deposit** — typically 1–2 months for flexi products, 3–6 for cabins.

## How Amadhi helps

We negotiate directly with operators across ${cities[0].name}, pass through volume discounts, and charge you nothing. Compare live options on our [coworking space in Gurugram](/coworking-space/gurugram) page.`,
    },
    {
      slug: "managed-office-vs-office-lease-ncr", title: "Managed Office vs Traditional Lease: What NCR Teams Should Pick in 2026",
      cat: "managed-offices", author: 1, tags: ["managed-office", "office-leasing", "guides"],
      cover: img("photo-1600880292203-757bb62b4baf"),
      excerpt: "CapEx vs OpEx, 3-week vs 6-month timelines, and the break-even team size where a traditional lease starts making sense again.",
      body: `## Two very different commitments

A **managed office** is delivered ready-to-work: an operator finds the space, fits it out to your brand, and runs facilities for a single per-seat fee. A **traditional lease** hands you bare shell and total control — along with fit-out CapEx, facility vendors and a 5–9 year commitment.

## The comparison that matters

| Factor | Managed Office | Traditional Lease |
|---|---|---|
| Move-in time | 2–4 weeks | 4–8 months |
| Upfront cost | 2–3 month deposit | Fit-out CapEx ₹1,800–3,500/sq ft |
| Term | 12–36 months | 5–9 years |
| Scalability | Add seats on demand | Fixed footprint |
| Facilities | Operator-run | Your headache |

## The break-even math

Below roughly **150–200 seats**, managed offices almost always win on total cost of occupancy once you price in CapEx amortisation, facility staff and utilisation risk. Above that, a lease on the Noida Expressway or in Udyog Vihar — where rents run ₹50–75/sq ft — can undercut managed pricing by 15–25%, *if* you have the balance sheet and a 5-year horizon.

## Our recommendation

Growing from 20 to 200 seats over three years? Take a managed office now with expansion rights, and revisit leasing at your next funding milestone. Explore [managed offices across NCR](/managed-office) or talk to our enterprise desk.`,
    },
    {
      slug: "virtual-office-gst-registration-delhi", title: "Virtual Office for GST Registration in Delhi: The Complete 2026 Guide",
      cat: "virtual-office", author: 1, tags: ["delhi", "virtual-office", "guides"],
      cover: img("photo-1497366811353-6870744d04b2"),
      excerpt: "Every document you need, what the GST officer actually checks, and how to get an APOB/PPOB-ready address in Connaught Place for under ₹1,200 a month.",
      body: `## Why businesses use virtual offices for GST

If you sell into Delhi but operate from elsewhere, GST law requires a **place of business in the state**. A virtual office gives you a compliant commercial address — with the paperwork to survive scrutiny — at 2–4% of the cost of physical space.

## The documents you'll receive

1. **Rent agreement / MoU** on stamp paper in your entity's name
2. **No-Objection Certificate (NOC)** from the space owner
3. **Latest utility bill** of the premises
4. **Signage & geo-tagged photos** (increasingly requested by officers)

## What the GST officer actually checks

Physical verification has tightened since 2024. Officers look for your **name board at the premises**, a staffed reception that acknowledges your company, and consistency between the agreement and the utility bill. Choose providers whose buildings handle verification professionally — this is where cheap providers fail.

## Timeline and cost

A properly documented virtual office in Delhi costs **₹900–1,500/month** (billed annually). Documentation takes 24–48 hours with Amadhi's partner operators in Connaught Place, Nehru Place and Jasola. GST approval typically follows in 7–15 working days.

Browse [virtual offices in Delhi](/virtual-office/delhi) — every listing is verification-tested.`,
    },
    {
      slug: "noida-expressway-office-market-report", title: "Why the Noida Expressway Is NCR's Fastest-Growing Office Market",
      cat: "real-estate", author: 2, tags: ["noida", "office-leasing", "pricing"],
      cover: img("photo-1486406146926-c627a92ad1ab"),
      excerpt: "Six million sq ft of new Grade-A supply, Aqua Line connectivity and rents 40% below Gurugram — inside the corridor rewriting NCR's office map.",
      body: `## The numbers

The Sector 126–144 corridor along the Noida–Greater Noida Expressway added close to **6 million sq ft of Grade-A supply** between 2023 and 2026, at quoted rents of **₹45–65/sq ft** — roughly 40% below comparable Gurugram product.

## What's driving demand

- **The Aqua Line** finally solved last-mile access; Sectors 137 and 142 have stations at the doorstep.
- **Jewar airport** anchors long-term corporate confidence in the corridor.
- **Large floor plates** — 25,000–60,000 sq ft contiguous — suit GCCs consolidating from scattered offices.
- **Parking ratios** of 1:750 vs 1:1,200 in older districts.

## Who is moving in

IT services, gaming studios, analytics captives and media houses dominate recent absorption. Coworking operators have followed: flexible seats in the corridor are up 3× since 2023, with flexi desks from **₹5,999/month** — the best value in NCR.

## The catch

Social infrastructure is still catching up — F&B and hotels lag the office stock, and Delhi-side commutes are long. For teams drawing talent from Noida, Greater Noida and East Delhi, though, the value is unmatched.

See live inventory: [coworking on Noida Expressway](/coworking-space/noida/noida-expressway) and [office leasing in Noida](/office-leasing/noida).`,
    },
    {
      slug: "meeting-room-etiquette-client-pitches", title: "Booking Meeting Rooms for Client Pitches: A Practical Playbook",
      cat: "business", author: 0, tags: ["meeting-rooms", "guides"],
      cover: img("photo-1517502884422-41eaead166d4"),
      excerpt: "Room size math, AV checklists, and why the ₹600/hour room in the right district beats the ₹300 one that needs an apology.",
      body: `## Choose the district, then the room

Clients judge before the pitch begins. A room at a metro-connected, recognisable address — Cyber City, Connaught Place, Sector 18 — removes friction and signals stability. The premium over a fringe location is usually **₹200–400/hour**; treat it as marketing spend.

## Size math

Book for **N + 2** where N is confirmed attendees. A 6-seater feels cramped with 6; an 8-seater with 6 feels considered. For hybrid pitches, prioritise rooms with a dedicated VC bar and a second screen for the deck.

## The 24-hour checklist

- Confirm **AV**: screen input (USB-C vs HDMI), VC platform, camera angle
- Ask for a **whiteboard + markers** explicitly — the most-forgotten item
- Pre-order **beverages** for the start, not mid-meeting
- Share the **exact tower and floor** with visitors; NCR complexes are mazes
- Arrive **20 minutes early**; test screen-share from the actual laptop presenting

## Booking smart

Hourly rates across NCR run **₹350–1,200** depending on district and capacity. Request-based booking via Amadhi confirms availability on WhatsApp within minutes: [browse meeting rooms](/meeting-rooms).`,
    },
    {
      slug: "startup-office-checklist-first-office", title: "The First-Office Checklist: 12 Things Startups Forget Before Signing",
      cat: "startup", author: 1, tags: ["guides", "coworking-space", "startup" as never].filter((t) => tagDefs.includes(t as string)) as string[],
      cover: img("photo-1522071820081-009f0129c71c"),
      excerpt: "Lock-in clauses, escalation percentages, exit notice periods and nine other contract details that cost founders real money.",
      body: `## Before you fall for the café

Every founder tours the space; few read the agreement. These twelve items decide whether your office is an asset or a liability.

1. **Lock-in period** — push for 3 months on flexi, 6 on cabins. Walk away from 12-month lock-ins on small teams.
2. **Notice period** — 1 month is standard; 2+ months on a 10-seat commitment is a red flag.
3. **Escalation** — annual increases should be capped at 5–8%, in writing.
4. **Deposit terms** — refund timeline (should be ≤30 days post-exit) and deduction conditions.
5. **Meeting-room credits** — hours included, rollover policy, overage rate.
6. **After-hours & weekend access** — included or billed?
7. **Seat reshuffling rights** — can the operator move you? With what notice?
8. **Expansion right of first refusal** — get adjacency guarantees if you're growing.
9. **Parking** allocation and cost per slot.
10. **IT policy** — static IP availability, guest Wi-Fi, firewall constraints for fintech compliance.
11. **Branding** — can you put your logo at your suite entrance?
12. **Exit condition** — "reasonable wear and tear" should be explicitly excluded from deductions.

## Get leverage for free

Amadhi negotiates these clauses daily and knows each operator's real flexibility. [Start with a shortlist](/coworking-space) — advice costs nothing.`,
    },
  ];

  for (const p of posts) {
    const created = await db.blogPost.create({
      data: {
        slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body,
        coverImage: p.cover, categoryId: cats[p.cat], authorId: authors[p.author].id,
        seoTitle: p.title, seoDesc: p.excerpt, status: "published",
        publishedAt: new Date(Date.now() - between(3, 120) * 86400000),
        readMins: Math.max(3, Math.round(p.body.split(/\s+/).length / 220)),
      },
    });
    for (const t of p.tags) {
      if (tags[t]) await db.blogPostTag.create({ data: { postId: created.id, tagId: tags[t] } });
    }
  }
  console.log(`  ${posts.length} blog posts created`);

  /* roles & admin users */
  const roleDefs = [
    ["super_admin", "Super Admin", ["*"]],
    ["admin", "Admin", ["listings:*", "blog:*", "leads:*", "reviews:*", "seo:*", "media:*", "settings:read"]],
    ["content_writer", "Content Writer", ["blog:*", "media:*"]],
    ["seo_executive", "SEO Executive", ["seo:*", "blog:read", "listings:read"]],
    ["sales_manager", "Sales Manager", ["leads:*", "customers:*", "reviews:read"]],
    ["sales_executive", "Sales Executive", ["leads:read", "leads:update", "customers:read"]],
    ["viewer", "Viewer", ["*:read"]],
  ] as const;
  const roleIds: Record<string, string> = {};
  for (const [slug, name, perms] of roleDefs) {
    const r = await db.role.create({ data: { slug, name, permsJson: JSON.stringify(perms) } });
    roleIds[slug] = r.id;
  }
  // No hardcoded default: an admin password committed to source is a public
  // credential. Use ADMIN_SEED_PASSWORD, or we mint a random one and print it once.
  const seedPassword =
    process.env.ADMIN_SEED_PASSWORD || randomBytes(9).toString("base64url");
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.log(`  ⚠ ADMIN_SEED_PASSWORD not set — generated admin password: ${seedPassword}`);
    console.log("    Save it now; it is not stored anywhere in plain text.");
  }
  const hash = await bcrypt.hash(seedPassword, 12);
  await db.adminUser.create({ data: { email: "admin@amadhi.com", name: "Amadhi Admin", passwordHash: hash, roleId: roleIds.super_admin } });
  await db.adminUser.create({ data: { email: "sales@amadhi.com", name: "Sales Desk", passwordHash: hash, roleId: roleIds.sales_manager } });

  /* settings */
  const settings: [string, string][] = [
    ["brand.name", "Amadhi"], ["brand.tagline", "Your space to grow"],
    ["contact.phone", "+91 98100 00000"], ["contact.whatsapp", "919810000000"],
    ["contact.email", "hello@amadhi.com"],
    ["analytics.ga4", ""], ["analytics.gtm", ""], ["analytics.clarity", ""], ["analytics.metaPixel.enabled", "false"],
  ];
  for (const [key, value] of settings) await db.setting.create({ data: { key, value } });

  /* a few demo leads so the admin pipeline isn't empty */
  const demoListings = await db.listing.findMany({ take: 6 });
  const leadNames = [["Rahul Verma", "9876543210", "enquiry", "new"], ["Nisha Agarwal", "9812345670", "visit", "contacted"], ["Dev Kapoor", "9898989898", "enquiry", "visit_scheduled"], ["Farah Khan", "9765432109", "meeting_room", "negotiation"], ["Sameer Joshi", "9654321098", "enquiry", "won"], ["Tanvi Shah", "9543210987", "brochure", "new"]] as const;
  for (const [i, [name, phone, type, status]] of leadNames.entries()) {
    await db.lead.create({
      data: {
        type, name, phone, email: `${name.split(" ")[0].toLowerCase()}@example.com`,
        message: "Looking for space for my team.", productType: pick(["coworking", "managed_office", "private_cabin"]),
        seats: pick(["2-5", "6-10", "11-25", "26-50"]), status,
        listingId: demoListings[i]?.id, cityId: demoListings[i]?.cityId,
        slaDueAt: new Date(Date.now() + 3600e3),
        utmJson: JSON.stringify({ utm_source: pick(["google", "direct", "linkedin"]), utm_medium: pick(["cpc", "organic"]) }),
        createdAt: new Date(Date.now() - between(0, 14) * 86400000),
      },
    });
  }

  console.log("Seed complete ✔");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
