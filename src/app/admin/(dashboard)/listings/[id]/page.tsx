import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ListingForm } from "../listing-form";
import { getListingFormOptions } from "../form-options";

type Nearby = { name: string; distanceKm: number; type: string };

export default async function AdminListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, options] = await Promise.all([
    db.listing.findUnique({
      where: { id },
      include: {
        city: true,
        locality: true,
        operator: true,
        amenities: true,
        plans: { include: { prices: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
    getListingFormOptions(),
  ]);
  if (!listing) notFound();

  let nearby: Nearby[] = [];
  try {
    const parsed = JSON.parse(listing.nearbyJson) as unknown;
    if (Array.isArray(parsed)) {
      nearby = parsed.map((n) => {
        const row = n as Partial<Nearby>;
        return { name: String(row.name ?? ""), distanceKm: Number(row.distanceKm) || 0, type: String(row.type ?? "landmark") };
      });
    }
  } catch {
    // Malformed JSON in an imported row shouldn't block editing everything else.
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/listings" className="text-sm text-navy-300 hover:text-cream-100">← Back to listings</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-cream-100">Edit: {listing.name}</h1>
      <p className="mt-1 text-sm text-navy-300">
        {listing.locality.name}, {listing.city.name} · {listing.operator?.name ?? "No operator"} ·{" "}
        {listing.plans.length} plans · {listing.images.length} photos ·{" "}
        <Link href={`/spaces/${listing.slug}`} className="underline hover:text-cream-100">view live page</Link>
      </p>
      <div className="mt-6">
        <ListingForm
          mode="edit"
          cities={options.cities}
          operators={options.operators}
          amenities={options.amenities}
          initial={{
            id: listing.id,
            name: listing.name,
            slug: listing.slug,
            summary: listing.summary,
            description: listing.description,
            cityId: listing.cityId,
            localityId: listing.localityId,
            operatorId: listing.operatorId ?? "",
            address: listing.address,
            lat: listing.lat,
            lng: listing.lng,
            capacity: listing.capacity,
            openingTime: listing.openingTime,
            closingTime: listing.closingTime,
            openDays: listing.openDays,
            status: listing.status,
            verified: listing.verified,
            featured: listing.featured,
            trending: listing.trending,
            virtualTourUrl: listing.virtualTourUrl,
            brochureUrl: listing.brochureUrl,
            nearby,
            amenityIds: listing.amenities.map((a) => a.amenityId),
            images: listing.images.map((i) => ({ url: i.url, alt: i.alt })),
            plans: listing.plans.map((p) => ({
              productType: p.productType,
              name: p.name,
              seatsMin: p.seatsMin,
              seatsMax: p.seatsMax,
              highlights: p.highlights,
              prices: p.prices.map((pr) => ({ amount: pr.amount, period: pr.period, unitNote: pr.unitNote })),
            })),
          }}
        />
      </div>
    </div>
  );
}
