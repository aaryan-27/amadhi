import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewSchema, isTooFast } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`reviews:${clientIp(req)}`, 3, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  if ((d.website && d.website.length > 0) || isTooFast(d.startedAt)) {
    return NextResponse.json({ ok: true });
  }

  const listing = await db.listing.findUnique({ where: { slug: d.listingSlug } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  // Reviews enter moderation queue as "pending" — never auto-published.
  const review = await db.review.create({
    data: {
      listingId: listing.id,
      name: d.name,
      email: d.email ?? "",
      persona: d.persona ?? "",
      rating: d.rating,
      title: d.title ?? "",
      body: d.body,
      status: "pending",
    },
  });
  await db.notification.create({
    data: { title: `Review pending moderation`, body: `${d.rating}★ for ${listing.name} by ${d.name}`, kind: "review" },
  });

  return NextResponse.json({ ok: true, id: review.id }, { status: 201 });
}
