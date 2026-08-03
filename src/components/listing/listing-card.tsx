"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Heart, Scale, MapPin, BadgeCheck } from "lucide-react";
import type { ListingCardData } from "@/lib/queries";
import { store, subscribeStore, type StoredListing } from "@/lib/store";
import { Badge, RatingStars } from "@/components/ui/primitives";
import { formatINR, cn } from "@/lib/utils";

function toStored(l: ListingCardData): Omit<StoredListing, "addedAt"> {
  return {
    slug: l.slug,
    name: l.name,
    locality: l.locality.name,
    city: l.city.name,
    image: l.image?.url ?? null,
    fromPrice: l.fromPrice?.amount ?? null,
  };
}

const periodLabel: Record<string, string> = {
  month: "/month",
  hour: "/hour",
  sqft_month: "/sq ft/mo",
  year: "/year",
};

export function ListingCard({ listing, priority = false }: { listing: ListingCardData; priority?: boolean }) {
  const [inWishlist, setInWishlist] = useState(false);
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    const sync = () => {
      setInWishlist(store.has("wishlist", listing.slug));
      setInCompare(store.has("compare", listing.slug));
    };
    sync();
    return subscribeStore(sync);
  }, [listing.slug]);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-pop">
      <Link href={`/spaces/${listing.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-navy-100">
        {listing.image && (
          <Image
            src={listing.image.url}
            alt={listing.image.alt || listing.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {listing.verified && (
            <Badge tone="verified" className="bg-white/95">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified
            </Badge>
          )}
          {listing.featured && <Badge tone="featured" className="bg-white/95">Featured</Badge>}
          {listing.trending && <Badge tone="trending" className="bg-white/95">Trending</Badge>}
        </div>

        {/* Operator brand mark: the trimmed logo where we hold one (it carries
            its own background so light marks stay legible), otherwise a name
            chip so every card gets consistent attribution. */}
        {listing.operator && (
          <span className="absolute bottom-3 left-3 max-w-[70%]" title={listing.operator.name}>
            {listing.operator.logoUrl ? (
              <Image
                src={listing.operator.logoUrl.replace("/partners/", "/partners/mark-")}
                alt={listing.operator.name}
                width={140}
                height={28}
                className="h-7 w-auto rounded-md object-contain shadow-sm ring-1 ring-black/10"
              />
            ) : (
              <span className="block truncate rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-navy-900 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
                {listing.operator.name}
              </span>
            )}
          </span>
        )}
      </Link>

      {/* wishlist / compare */}
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button
          type="button"
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={inWishlist}
          onClick={() => store.toggle("wishlist", toStored(listing))}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors",
            inWishlist ? "text-accent-500" : "text-navy-600 hover:text-accent-500"
          )}
        >
          <Heart className={cn("h-4.5 w-4.5", inWishlist && "fill-accent-500")} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={inCompare ? "Remove from compare" : "Add to compare"}
          aria-pressed={inCompare}
          onClick={() => {
            const res = store.toggle("compare", toStored(listing));
            if (res === "full") alert("You can compare up to 3 spaces. Remove one first.");
          }}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors",
            inCompare ? "text-accent-500" : "text-navy-600 hover:text-accent-500"
          )}
        >
          <Scale className="h-4.5 w-4.5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[15px] font-semibold leading-snug text-navy-950">
            <Link href={`/spaces/${listing.slug}`} className="hover:text-accent-600">
              {listing.name}
            </Link>
          </h3>
          <RatingStars rating={listing.rating} />
        </div>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {listing.locality.name}, {listing.city.name}
        </p>
        <p className="mt-2 line-clamp-1 text-xs text-muted">
          {listing.amenities.slice(0, 4).join(" · ")}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          {listing.fromPrice ? (
            <p className="text-sm text-muted">
              From{" "}
              <span className="font-display text-lg font-bold text-navy-950">
                {formatINR(listing.fromPrice.amount)}
              </span>
              <span className="text-xs">{periodLabel[listing.fromPrice.period] ?? ""}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Price on request</p>
          )}
          <Link
            href={`/spaces/${listing.slug}`}
            className="rounded-full bg-navy-950 px-4 py-2 text-xs font-semibold text-cream-100 transition-colors hover:bg-accent-500"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
