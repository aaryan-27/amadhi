import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetingRoomSchema, isTooFast } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { findBlogPost, sendLeadToCrm } from "@/lib/crm";

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

  const [listing, blogPost] = await Promise.all([
    db.listing.findUnique({ where: { slug: d.listingSlug } }),
    findBlogPost(d.blogSlug),
  ]);
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

  const lead = await db.lead.create({
    data: {
      type: "meeting_room",
      name: d.name,
      phone: d.phone,
      email: d.email ?? "",
      message: `Meeting room at ${listing.name}: ${d.date} ${d.startTime}, ${d.hours}h, ${d.attendees} pax`,
      listingId: listing.id,
      cityId: listing.cityId,
      localityId: listing.localityId,
      utmJson: JSON.stringify(blogPost ? { blog_post: blogPost.slug } : {}),
      slaDueAt: new Date(Date.now() + 3600_000),
    },
  });
  await db.notification.create({
    data: { title: `Meeting room request: ${d.name}`, body: `${listing.name} — ${d.date} ${d.startTime}`, kind: "meeting_room" },
  });

  const [city, locality] = await Promise.all([
    db.city.findUnique({ where: { id: listing.cityId } }),
    db.locality.findUnique({ where: { id: listing.localityId } }),
  ]);
  sendLeadToCrm({
    websiteLeadId: lead.id,
    type: "meeting_room",
    name: d.name,
    phone: d.phone,
    email: d.email,
    message: lead.message,
    productType: "meeting_room",
    city: city?.name,
    locality: locality?.name,
    listing: { name: listing.name, slug: listing.slug },
    visitDate: d.date,
    visitSlot: `${d.startTime}, ${d.hours}h, ${d.attendees} pax`,
    landingPage: req.headers.get("referer"),
    blogPost,
  });

  return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
}
