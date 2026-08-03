import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visitSchema, isTooFast } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`visits:${clientIp(req)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  if ((d.website && d.website.length > 0) || isTooFast(d.startedAt)) {
    return NextResponse.json({ ok: true });
  }

  const listing = await db.listing.findUnique({ where: { slug: d.listingSlug } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const visit = await db.visitBooking.create({
    data: {
      listingId: listing.id,
      name: d.name,
      phone: d.phone,
      email: d.email ?? "",
      date: new Date(d.date),
      slot: d.slot,
    },
  });

  // A visit is also a lead in the pipeline
  await db.lead.create({
    data: {
      type: "visit",
      name: d.name,
      phone: d.phone,
      email: d.email ?? "",
      message: `Visit requested for ${listing.name} on ${d.date}, ${d.slot}`,
      listingId: listing.id,
      cityId: listing.cityId,
      localityId: listing.localityId,
      slaDueAt: new Date(Date.now() + 3600_000),
    },
  });
  await db.notification.create({
    data: { title: `Visit request: ${d.name}`, body: `${listing.name} — ${d.date} ${d.slot}`, kind: "visit" },
  });

  return NextResponse.json({ ok: true, id: visit.id }, { status: 201 });
}
