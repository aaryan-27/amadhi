"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ListingCardData } from "@/lib/queries";
import { ListingCard } from "@/components/listing/listing-card";
import { FilterPanel } from "@/components/listing/filter-panel";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { NotifyMe } from "@/components/forms/lead-forms";
import { formatINR } from "@/lib/utils";

const LeafletMap = dynamic(() => import("@/components/listing/leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full rounded-2xl" />,
});

export function ListingExplorer({
  cards,
  total,
  page,
  perPage,
  basePath,
  localities,
  operators,
  showProductFilter,
  emptyHint,
}: {
  cards: ListingCardData[];
  total: number;
  page: number;
  perPage: number;
  basePath: string;
  localities?: { slug: string; name: string }[];
  operators?: { slug: string; name: string }[];
  showProductFilter?: boolean;
  emptyHint?: { citySlug?: string; localitySlug?: string; nearestName?: string; nearestHref?: string };
}) {
  const params = useSearchParams();
  const view = params.get("view") ?? "list";
  const totalPages = Math.ceil(total / perPage);

  const pageHref = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    return `${basePath}${next.size ? `?${next}` : ""}`;
  };

  return (
    <div>
      <FilterPanel
        localities={localities}
        operators={operators}
        showProductFilter={showProductFilter}
        total={total}
      />

      {cards.length === 0 ? (
        <EmptyState
          title="No spaces match these filters yet"
          body={
            emptyHint?.nearestName
              ? `Inventory here is filling fast. The nearest area with live spaces is ${emptyHint.nearestName} — or leave your email and we'll tell you the moment something opens up.`
              : "Try widening your budget or removing a filter — or leave your email and we'll notify you when new spaces go live."
          }
        >
          {emptyHint?.nearestHref && (
            <Link href={emptyHint.nearestHref} className="rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-cream-100 hover:bg-navy-800">
              Explore {emptyHint.nearestName}
            </Link>
          )}
          <NotifyMe citySlug={emptyHint?.citySlug} localitySlug={emptyHint?.localitySlug} />
        </EmptyState>
      ) : view === "map" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <LeafletMap
            className="h-[520px] w-full rounded-2xl border border-line"
            markers={cards.map((c) => ({
              lat: c.lat,
              lng: c.lng,
              label: c.name,
              href: `/spaces/${c.slug}`,
              price: c.fromPrice ? formatINR(c.fromPrice.amount) : undefined,
            }))}
          />
          <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1 scrollbar-thin" aria-label="Listings shown on map">
            {cards.map((c) => (
              <ListingCard key={c.id} listing={c} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <ListingCard key={c.id} listing={c} priority={i < 3} />
          ))}
        </div>
      )}

      {/* Crawlable pagination */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
          {page > 1 && (
            <Link href={pageHref(page - 1)} rel="prev" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-navy-900 hover:border-navy-400">
              Previous
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-1.5">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted">…</span>}
                <Link
                  href={pageHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={
                    p === page
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-navy-950 text-sm font-semibold text-cream-100"
                      : "flex h-10 w-10 items-center justify-center rounded-full border border-line text-sm text-navy-900 hover:border-navy-400"
                  }
                >
                  {p}
                </Link>
              </span>
            ))}
          {page < totalPages && (
            <Link href={pageHref(page + 1)} rel="next" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-navy-900 hover:border-navy-400">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
