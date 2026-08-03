"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toggleListingFlag, setListingStatus } from "../actions";
import { cn } from "@/lib/utils";

export function ListingRow({
  listing,
}: {
  listing: {
    id: string; slug: string; name: string; city: string; locality: string;
    status: string; verified: boolean; featured: boolean; trending: boolean;
    rating: number; reviewCount: number; leadCount: number;
  };
}) {
  const [pending, startTransition] = useTransition();

  const flagBtn = (flag: "verified" | "featured" | "trending", label: string, active: boolean) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => startTransition(() => toggleListingFlag(listing.id, flag))}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        active ? "bg-accent-500/20 text-accent-400" : "bg-navy-800 text-navy-400 hover:text-navy-200"
      )}
    >
      {label}
    </button>
  );

  return (
    <tr className={cn("bg-navy-950/40", pending && "opacity-60")}>
      <td className="px-4 py-3">
        <Link href={`/admin/listings/${listing.id}`} className="font-medium text-cream-100 hover:text-accent-400">
          {listing.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-navy-300">{listing.locality}, {listing.city}</td>
      <td className="px-4 py-3">
        <select
          aria-label={`Status of ${listing.name}`}
          value={listing.status}
          onChange={(e) => startTransition(() => setListingStatus(listing.id, e.target.value))}
          className="h-8 rounded-lg border border-navy-700 bg-navy-950 px-2 text-xs text-navy-100"
        >
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          {flagBtn("verified", "Verified", listing.verified)}
          {flagBtn("featured", "Featured", listing.featured)}
          {flagBtn("trending", "Trending", listing.trending)}
        </div>
      </td>
      <td className="px-4 py-3 text-navy-200">{listing.leadCount}</td>
      <td className="px-4 py-3 text-navy-200">
        {listing.rating ? `${listing.rating} (${listing.reviewCount})` : "—"}
      </td>
      <td className="px-4 py-3">
        <a
          href={`/spaces/${listing.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-navy-300 hover:text-cream-100"
        >
          View <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </td>
    </tr>
  );
}
