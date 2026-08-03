"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Check, Minus } from "lucide-react";
import { store, subscribeStore } from "@/lib/store";
import { EmptyState, Skeleton, RatingStars } from "@/components/ui/primitives";
import { formatINR } from "@/lib/utils";

interface CompareListing {
  slug: string;
  name: string;
  image: string | null;
  locality: string;
  city: string;
  fromPrice: number | null;
  rating: number;
  reviewCount: number;
  capacity: number;
  openDays: string;
  operator: string | null;
  verified: boolean;
  amenities: string[];
  productTypes: string[];
}

export function CompareClient() {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [data, setData] = useState<CompareListing[] | null>(null);

  useEffect(() => {
    const sync = () => setSlugs(store.get("compare").map((i) => i.slug));
    sync();
    return subscribeStore(sync);
  }, []);

  useEffect(() => {
    if (!slugs) return;
    if (slugs.length === 0) {
      setData([]);
      return;
    }
    fetch(`/api/v1/listings/compare?slugs=${slugs.join(",")}`)
      .then((r) => r.json())
      .then((d) => setData(d.listings ?? []))
      .catch(() => setData([]));
  }, [slugs]);

  if (data === null) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-96 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="Nothing to compare yet"
        body="Tap the scales icon on any listing card to add it here — up to 3 spaces."
      >
        <Link href="/coworking-space" className="rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-cream-100 hover:bg-navy-800">
          Browse coworking spaces
        </Link>
      </EmptyState>
    );
  }

  const allAmenities = [...new Set(data.flatMap((d) => d.amenities))].sort();

  const rows: { label: string; render: (l: CompareListing) => React.ReactNode }[] = [
    {
      label: "From price",
      render: (l) =>
        l.fromPrice ? (
          <span className="font-display font-bold text-navy-950">{formatINR(l.fromPrice)}/mo</span>
        ) : (
          "On request"
        ),
    },
    { label: "Rating", render: (l) => <RatingStars rating={l.rating} count={l.reviewCount} /> },
    { label: "Location", render: (l) => `${l.locality}, ${l.city}` },
    { label: "Operator", render: (l) => l.operator ?? "—" },
    { label: "Capacity", render: (l) => `${l.capacity} seats` },
    { label: "Hours", render: (l) => l.openDays },
    {
      label: "Verified",
      render: (l) =>
        l.verified ? <Check className="h-5 w-5 text-success" aria-label="Yes" /> : <Minus className="h-5 w-5 text-muted" aria-label="No" />,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[720px] border-collapse bg-white text-sm">
        <thead>
          <tr>
            <th className="w-44 border-b border-line bg-wash p-4 text-left align-bottom text-xs font-semibold uppercase tracking-wider text-muted">
              Compare
            </th>
            {data.map((l) => (
              <th key={l.slug} className="border-b border-l border-line p-4 text-left align-top">
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Remove ${l.name}`}
                    onClick={() => store.remove("compare", l.slug)}
                    className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-muted shadow-sm hover:text-danger"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  {l.image && (
                    <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl">
                      <Image src={l.image} alt={l.name} fill sizes="240px" className="object-cover" />
                    </div>
                  )}
                  <Link href={`/spaces/${l.slug}`} className="font-display text-base font-semibold text-navy-950 hover:text-accent-600">
                    {l.name}
                  </Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="border-b border-line bg-wash p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                {row.label}
              </th>
              {data.map((l) => (
                <td key={l.slug} className="border-b border-l border-line p-4 text-navy-900">
                  {row.render(l)}
                </td>
              ))}
            </tr>
          ))}
          {allAmenities.map((a) => (
            <tr key={a}>
              <th className="border-b border-line bg-wash p-4 text-left text-xs font-medium text-muted">{a}</th>
              {data.map((l) => (
                <td key={l.slug} className="border-b border-l border-line p-4">
                  {l.amenities.includes(a) ? (
                    <Check className="h-5 w-5 text-success" aria-label="Included" />
                  ) : (
                    <Minus className="h-5 w-5 text-navy-200" aria-label="Not included" />
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="bg-wash p-4" />
            {data.map((l) => (
              <td key={l.slug} className="border-l border-line p-4">
                <Link
                  href={`/spaces/${l.slug}#enquire`}
                  className="inline-flex rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
                >
                  Enquire
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
