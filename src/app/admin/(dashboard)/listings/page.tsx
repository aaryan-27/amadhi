import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { ListingRow } from "./listing-row";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const listings = await db.listing.findMany({
    where: {
      ...(sp.q ? { name: { contains: sp.q } } : {}),
      ...(sp.status ? { status: sp.status } : {}),
    },
    include: {
      city: { select: { name: true } },
      locality: { select: { name: true } },
      _count: { select: { leads: true, reviews: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream-100">Listings</h1>
          <p className="mt-1 text-sm text-navy-300">{listings.length} listings shown</p>
        </div>
        <Link
          href="/admin/listings/new"
          className="flex h-10 items-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add listing
        </Link>
        <form className="flex gap-2" action="/admin/listings">
          <input
            type="search"
            name="q"
            defaultValue={sp.q}
            placeholder="Search listings…"
            className="h-10 w-64 rounded-xl border border-navy-700 bg-navy-950 px-3.5 text-sm text-navy-100 placeholder:text-navy-500"
          />
          <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-xl border border-navy-700 bg-navy-950 px-3 text-sm text-navy-100">
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button type="submit" className="h-10 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600">
            Filter
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs uppercase tracking-wider text-navy-400">
              <th className="px-4 py-3 font-medium">Listing</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {listings.map((l) => (
              <ListingRow
                key={l.id}
                listing={{
                  id: l.id,
                  slug: l.slug,
                  name: l.name,
                  city: l.city.name,
                  locality: l.locality.name,
                  status: l.status,
                  verified: l.verified,
                  featured: l.featured,
                  trending: l.trending,
                  rating: l.rating,
                  reviewCount: l.reviewCount,
                  leadCount: l._count.leads,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-navy-400">
        Tip: click a listing name to edit its core content. Media, plans and amenity editing land in
        the next admin iteration — see <Link href="/admin/settings" className="underline">Settings → Roadmap</Link>.
      </p>
    </div>
  );
}
