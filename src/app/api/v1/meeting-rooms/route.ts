import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetingRoomSchema, isTooFast } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`rooms:${clientIp(req)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = meetingRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  if ((d.website && d.website.length > 0) || isTooFast(d.startedAt)) {
    return NextResponse.json({ ok: true });
  }

  const listing = await db.listing.findUnique({ where: { slug: d.listingSlug } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const request = await db.meetingRoomRequest.create({
    data: {
      listingId: listing.id,
      name: d.name,
      phone: d.phone,
      email: d.email ?? "",
      date: new Date(d.date),
      startTime: d.startTime,
      hours: d.hours,
      attendees: d.attendees,
    },
  });

  await db.lead.create({
    data: {
      type: "meeting_room",
      name: d.name,
      phone: d.phone,
      email: d.email ?? "",
      message: `Meeting room at ${listing.name}: ${d.date} ${d.startTime}, ${d.hours}h, ${d.attendees} pax`,
      listingId: listing.id,
      cityId: listing.cityId,
      localityId: listing.localityId,
      slaDueAt: new Date(Date.now() + 3600_000),
    },
  });
  await db.notification.create({
    data: { title: `Meeting room request: ${d.name}`, body: `${listing.name} — ${d.date} ${d.startTime}`, kind: "meeting_room" },
  });

  return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
}
