import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 3);
  if (!slugs.length) return NextResponse.json({ listings: [] });

  const rows = await db.listing.findMany({
    where: { slug: { in: slugs }, status: "published" },
    include: {
      city: true,
      locality: true,
      operator: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      plans: { include: { prices: true } },
      amenities: { include: { amenity: true } },
    },
  });

  const listings = slugs
    .map((slug) => rows.find((r) => r.slug === slug))
    .filter(Boolean)
    .map((l) => {
      const monthly = l!.plans
        .flatMap((p) => p.prices)
        .filter((p) => p.period !== "hour")
        .sort((a, b) => a.amount - b.amount)[0];
      return {
        slug: l!.slug,
        name: l!.name,
        image: l!.images[0]?.url ?? null,
        locality: l!.locality.name,
        city: l!.city.name,
        fromPrice: monthly?.amount ?? null,
        rating: l!.rating,
        reviewCount: l!.reviewCount,
        capacity: l!.capacity,
        openDays: l!.openDays === "24×7" ? "Open 24×7" : `${l!.openDays} ${l!.openingTime}–${l!.closingTime}`,
        operator: l!.operator?.name ?? null,
        verified: l!.verified,
        amenities: l!.amenities.map((a) => a.amenity.name),
        productTypes: [...new Set(l!.plans.map((p) => p.productType))],
      };
    });

  return NextResponse.json({ listings });
}
