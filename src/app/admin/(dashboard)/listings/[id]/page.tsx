import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ListingEditForm } from "./edit-form";

export default async function AdminListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      city: true,
      locality: true,
      operator: true,
      plans: { include: { prices: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!listing) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/listings" className="text-sm text-navy-300 hover:text-cream-100">← Back to listings</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-cream-100">Edit: {listing.name}</h1>
      <p className="mt-1 text-sm text-navy-300">
        {listing.locality.name}, {listing.city.name} · {listing.operator?.name ?? "No operator"} ·{" "}
        {listing.plans.length} plans · {listing.images.length} photos
      </p>
      <div className="mt-6">
        <ListingEditForm
          listing={{
            id: listing.id,
            name: listing.name,
            summary: listing.summary,
            description: listing.description,
            address: listing.address,
            capacity: listing.capacity,
          }}
        />
      </div>
    </div>
  );
}
