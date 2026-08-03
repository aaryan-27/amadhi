import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquirySchema, isTooFast } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** First-response SLA: 1 hour from lead creation. */
const SLA_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!rateLimit(`leads:${clientIp(req)}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many requests — please try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Anti-spam: honeypot filled or submitted inhumanly fast → pretend success.
  if ((d.website && d.website.length > 0) || isTooFast(d.startedAt)) {
    return NextResponse.json({ ok: true });
  }

  const [city, listing] = await Promise.all([
    d.citySlug ? db.city.findUnique({ where: { slug: d.citySlug } }) : null,
    d.listingSlug ? db.listing.findUnique({ where: { slug: d.listingSlug } }) : null,
  ]);
  const locality =
    d.localitySlug && city
      ? await db.locality.findFirst({ where: { slug: d.localitySlug, cityId: city.id } })
      : d.localitySlug && listing
        ? await db.locality.findUnique({ where: { id: listing.localityId } })
        : null;

  let companyId: string | undefined;
  if (d.companyName) {
    const company = await db.company.create({ data: { name: d.companyName } });
    companyId = company.id;
  }

  const lead = await db.lead.create({
    data: {
      type: d.type,
      name: d.name,
      phone: d.phone ?? "",
      email: d.email ?? "",
      message: d.message ?? "",
      productType: d.productType ?? "",
      seats: d.seats ?? "",
      budget: d.budget ?? "",
      moveIn: d.moveIn ?? "",
      cityId: city?.id ?? listing?.cityId,
      localityId: locality?.id,
      listingId: listing?.id,
      companyId,
      utmJson: JSON.stringify(d.utm ?? {}),
      slaDueAt: new Date(Date.now() + SLA_MS),
    },
  });

  await db.notification.create({
    data: {
      title: `New ${d.type.replace("_", " ")} lead: ${d.name}`,
      body: listing ? `For ${listing.name}` : city ? `In ${city.name}` : "General",
      kind: "lead",
    },
  });

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
