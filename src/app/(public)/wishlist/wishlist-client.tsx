"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Heart, History } from "lucide-react";
import { store, subscribeStore, type StoredListing } from "@/lib/store";
import { EmptyState } from "@/components/ui/primitives";
import { formatINR } from "@/lib/utils";

function Card({ item, onRemove }: { item: StoredListing; onRemove?: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <Link href={`/spaces/${item.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-navy-100">
          {item.image && <Image src={item.image} alt={item.name} fill sizes="300px" className="object-cover" />}
        </div>
        <div className="p-4">
          <p className="font-display text-sm font-semibold text-navy-950">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {item.locality}
            {item.locality && item.city ? ", " : ""}
            {item.city}
          </p>
          {item.fromPrice && (
            <p className="mt-2 text-sm text-muted">
              From <span className="font-display font-bold text-navy-950">{formatINR(item.fromPrice)}</span>/mo
            </p>
          )}
        </div>
      </Link>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={onRemove}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-muted shadow-sm hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function WishlistClient() {
  const [wishlist, setWishlist] = useState<StoredListing[]>([]);
  const [recent, setRecent] = useState<StoredListing[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setWishlist(store.get("wishlist"));
      setRecent(store.get("recent"));
      setReady(true);
    };
    sync();
    return subscribeStore(sync);
  }, []);

  if (!ready) return null;

  return (
    <div className="space-y-12">
      <section aria-labelledby="wishlist-heading">
        <h2 id="wishlist-heading" className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-navy-950">
          <Heart className="h-5 w-5 text-accent-500" aria-hidden /> Wishlist ({wishlist.length})
        </h2>
        {wishlist.length === 0 ? (
          <EmptyState title="No saved spaces yet" body="Tap the heart on any listing to save it here.">
            <Link href="/coworking-space" className="rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-cream-100 hover:bg-navy-800">
              Browse spaces
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {wishlist.map((item) => (
              <Card key={item.slug} item={item} onRemove={() => store.remove("wishlist", item.slug)} />
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-navy-950">
            <History className="h-5 w-5 text-muted" aria-hidden /> Recently viewed
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((item) => (
              <Card key={item.slug} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
