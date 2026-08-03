"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, List, Map as MapIcon } from "lucide-react";
import { PRODUCTS, AMENITIES } from "@/lib/site";
import { cn } from "@/lib/utils";

const PRICE_BANDS = [
  { label: "Under ₹7,500", min: 0, max: 7500 },
  { label: "₹7,500 – ₹10,000", min: 7500, max: 10000 },
  { label: "₹10,000 – ₹14,000", min: 10000, max: 14000 },
  { label: "₹14,000+", min: 14000, max: 1000000 },
];

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
];

/**
 * URL-synced filter controls. All state lives in searchParams so results are
 * shareable, crawlable and back-button friendly.
 */
export function FilterPanel({
  localities,
  operators,
  showProductFilter = true,
  total,
}: {
  localities?: { slug: string; name: string }[];
  operators?: { slug: string; name: string }[];
  showProductFilter?: boolean;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const amenities = params.get("amenities")?.split(",").filter(Boolean) ?? [];
  const view = params.get("view") ?? "list";

  const chips: { label: string; clear: () => void }[] = [];
  if (params.get("product")) {
    const p = PRODUCTS.find((x) => x.type === params.get("product"));
    if (p) chips.push({ label: p.name, clear: () => setParam({ product: null }) });
  }
  if (params.get("locality") && localities) {
    const l = localities.find((x) => x.slug === params.get("locality"));
    if (l) chips.push({ label: l.name, clear: () => setParam({ locality: null }) });
  }
  if (params.get("operator") && operators) {
    const o = operators.find((x) => x.slug === params.get("operator"));
    if (o) chips.push({ label: o.name, clear: () => setParam({ operator: null }) });
  }
  if (params.get("priceMin") || params.get("priceMax")) {
    const band = PRICE_BANDS.find(
      (b) => String(b.min) === (params.get("priceMin") ?? "0") && String(b.max) === (params.get("priceMax") ?? "")
    );
    chips.push({
      label: band?.label ?? "Price",
      clear: () => setParam({ priceMin: null, priceMax: null }),
    });
  }
  for (const a of amenities) {
    const def = AMENITIES.find((x) => x.slug === a);
    if (def)
      chips.push({
        label: def.name,
        clear: () => setParam({ amenities: amenities.filter((x) => x !== a).join(",") || null }),
      });
  }

  const filterControls = (
    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
      {showProductFilter && (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Workspace type
          <select
            value={params.get("product") ?? ""}
            onChange={(e) => setParam({ product: e.target.value || null })}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-navy-900"
          >
            <option value="">All types</option>
            {PRODUCTS.map((p) => (
              <option key={p.type} value={p.type}>{p.name}</option>
            ))}
          </select>
        </label>
      )}

      {localities && localities.length > 0 && (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Locality
          <select
            value={params.get("locality") ?? ""}
            onChange={(e) => setParam({ locality: e.target.value || null })}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-navy-900"
          >
            <option value="">All localities</option>
            {localities.map((l) => (
              <option key={l.slug} value={l.slug}>{l.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Monthly budget
        <select
          value={`${params.get("priceMin") ?? ""}-${params.get("priceMax") ?? ""}`}
          onChange={(e) => {
            const band = PRICE_BANDS.find((b) => `${b.min}-${b.max}` === e.target.value);
            setParam({
              priceMin: band ? String(band.min) : null,
              priceMax: band ? String(band.max) : null,
            });
          }}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-navy-900"
        >
          <option value="-">Any budget</option>
          {PRICE_BANDS.map((b) => (
            <option key={b.label} value={`${b.min}-${b.max}`}>{b.label}</option>
          ))}
        </select>
      </label>

      {operators && operators.length > 0 && (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Operator
          <select
            value={params.get("operator") ?? ""}
            onChange={(e) => setParam({ operator: e.target.value || null })}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-navy-900"
          >
            <option value="">All operators</option>
            {operators.map((o) => (
              <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-medium text-muted">Amenities</legend>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {AMENITIES.slice(0, 10).map((a) => {
            const active = amenities.includes(a.slug);
            return (
              <button
                key={a.slug}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setParam({
                    amenities: active
                      ? amenities.filter((x) => x !== a.slug).join(",") || null
                      : [...amenities, a.slug].join(","),
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-navy-950 bg-navy-950 text-cream-100"
                    : "border-line bg-white text-navy-800 hover:border-navy-400"
                )}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-navy-950">{total}</span> workspace{total === 1 ? "" : "s"} found
        </p>
        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="flex overflow-hidden rounded-full border border-line" role="group" aria-label="Toggle list or map view">
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setParam({ view: null })}
              className={cn("flex h-10 items-center gap-1.5 px-3.5 text-sm", view === "list" ? "bg-navy-950 text-cream-100" : "bg-white text-navy-800")}
            >
              <List className="h-4 w-4" aria-hidden /> List
            </button>
            <button
              type="button"
              aria-pressed={view === "map"}
              onClick={() => setParam({ view: "map" })}
              className={cn("flex h-10 items-center gap-1.5 px-3.5 text-sm", view === "map" ? "bg-navy-950 text-cream-100" : "bg-white text-navy-800")}
            >
              <MapIcon className="h-4 w-4" aria-hidden /> Map
            </button>
          </div>

          <label className="sr-only" htmlFor="sort-select">Sort results</label>
          <select
            id="sort-select"
            value={params.get("sort") ?? "relevance"}
            onChange={(e) => setParam({ sort: e.target.value === "relevance" ? null : e.target.value })}
            className="h-10 rounded-full border border-line bg-white px-3.5 text-sm text-navy-900"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-expanded={drawerOpen}
            className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-medium text-navy-900 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
          </button>
        </div>
      </div>

      {/* desktop filters inline; mobile in drawer */}
      <div className={cn("mt-4 rounded-2xl border border-line bg-wash p-4", !drawerOpen && "hidden lg:block")}>
        {filterControls}
      </div>

      {/* applied chips */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span key={chip.label} className="flex items-center gap-1.5 rounded-full bg-navy-950 py-1 pl-3 pr-1.5 text-xs font-medium text-cream-100">
              {chip.label}
              <button type="button" aria-label={`Clear ${chip.label} filter`} onClick={chip.clear} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-navy-700">
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="text-xs font-medium text-accent-600 underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
