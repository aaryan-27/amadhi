"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Scale } from "lucide-react";
import { store, subscribeStore, type StoredListing } from "@/lib/store";

/** Floating tray shown while 1–3 listings are queued for comparison. */
export function CompareTray() {
  const [items, setItems] = useState<StoredListing[]>([]);

  useEffect(() => {
    const sync = () => setItems(store.get("compare"));
    sync();
    return subscribeStore(sync);
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-line bg-white p-3 shadow-pop md:bottom-6">
      <div className="flex items-center gap-3">
        <Scale className="hidden h-5 w-5 shrink-0 text-accent-500 sm:block" aria-hidden />
        <ul className="flex flex-1 gap-2 overflow-x-auto scrollbar-thin">
          {items.map((item) => (
            <li key={item.slug} className="relative flex shrink-0 items-center gap-2 rounded-xl bg-wash py-1.5 pl-1.5 pr-8">
              {item.image && (
                <Image src={item.image} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
              )}
              <span className="max-w-28 truncate text-xs font-medium text-navy-900">{item.name}</span>
              <button
                type="button"
                aria-label={`Remove ${item.name} from compare`}
                onClick={() => store.remove("compare", item.slug)}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-navy-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/compare"
          className="shrink-0 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Compare ({items.length})
        </Link>
      </div>
    </div>
  );
}
