"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, Users, Building2, Landmark, Loader2, MapPin, Briefcase, Check,
  LocateFixed, TrendingUp,
} from "lucide-react";
import { CITIES } from "@/lib/site";
import type { LocalityChip, LocalityGeo } from "@/lib/queries";
import type { SearchSuggestion } from "@/lib/search";
import { cn } from "@/lib/utils";

/** The three headline products, mirroring the main navigation. */
const TABS = [
  {
    key: "coworking",
    slug: "coworking-space",
    label: "Coworking Space",
    near: "coworking spaces",
    icon: Users,
    blurb: "Rent dedicated desks and private cabins in fully-equipped coworking spaces",
  },
  {
    key: "managed_office",
    slug: "managed-office",
    label: "Managed Office",
    near: "managed offices",
    icon: Building2,
    blurb: "Rent a dedicated office space managed end-to-end by a provider",
  },
  {
    key: "office_leasing",
    slug: "office-leasing",
    label: "Office / Commercial",
    near: "office/commercial spaces",
    icon: Landmark,
    blurb: "Rent or lease commercial office space for your company",
  },
] as const;

const groupIcon = { Localities: MapPin, Spaces: Building2, Operators: Briefcase } as const;

export interface HeroSearchData {
  [product: string]: { chips: Record<string, LocalityChip[]>; geo: LocalityGeo[] };
}

/** Great-circle distance in km. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function HeroSearch({ data }: { data: HeroSearchData }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState("");

  const chips = data[tab.key]?.chips[city.slug] ?? [];

  /* autocomplete — same endpoint as the header search */
  const fetchResults = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`);
      const json = await res.json();
      setResults(json.suggestions ?? []);
      setActive(-1);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchResults(q), 180);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  /* close popovers on outside click / Escape */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) { setCityOpen(false); setSuggestOpen(false); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setCityOpen(false); setSuggestOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const submit = () => {
    const term = q.trim();
    router.push(
      term
        ? `/search?q=${encodeURIComponent(term)}&product=${tab.key}&city=${city.slug}`
        : `/${tab.slug}/${city.slug}`
    );
  };

  /** Find the closest locality that actually stocks the selected product. */
  const findNearMe = () => {
    if (!("geolocation" in navigator)) {
      setGeoNote("Your browser doesn't support location sharing.");
      return;
    }
    setGeoNote("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const geo = data[tab.key]?.geo ?? [];
        if (!geo.length) { setGeoNote("No live inventory for this product yet."); return; }
        const nearest = geo
          .map((l) => ({ ...l, km: distanceKm(coords.latitude, coords.longitude, l.lat, l.lng) }))
          .sort((a, b) => a.km - b.km)[0];
        // Outside NCR: be honest about coverage, then show the closest market.
        if (nearest.km > 60) {
          const cityDef = CITIES.find((c) => c.slug === nearest.city) ?? CITIES[0];
          setGeoNote(`You look to be outside Delhi NCR — showing ${cityDef.name}, our closest market.`);
          router.push(`/${tab.slug}/${nearest.city}`);
          return;
        }
        router.push(`/${tab.slug}/${nearest.city}/${nearest.slug}`);
      },
      (err) => {
        setLocating(false);
        setGeoNote(
          err.code === err.PERMISSION_DENIED
            ? "Location access was blocked — pick a city instead."
            : "Couldn't get your location — pick a city instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) { setSuggestOpen(false); router.push(results[active].href); }
      else submit();
    }
  };

  const grouped = results.reduce<Record<string, SearchSuggestion[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  const cityMatches = CITIES.filter((c) =>
    c.name.toLowerCase().includes(cityQuery.trim().toLowerCase())
  );

  return (
    <div ref={rootRef} className="relative z-30 rounded-2xl bg-white shadow-pop">
      {/* product tabs */}
      <div role="tablist" aria-label="Workspace type" className="flex flex-wrap justify-center gap-2 px-4 pt-4 sm:gap-3">
        {TABS.map((t) => {
          const selected = t.key === tab.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => { setTab(t); setGeoNote(""); }}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5",
                selected
                  ? "border-accent-500 bg-accent-50 text-accent-700"
                  : "border-line bg-white text-navy-700 hover:border-navy-300 hover:bg-wash"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* contextual descriptor */}
      <p className="mt-4 bg-wash px-4 py-3 text-center text-sm text-muted">{tab.blurb}</p>

      {/* city + query + submit */}
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:gap-0">
        <div className="relative sm:pr-4">
          <button
            type="button"
            onClick={() => { setCityOpen((v) => !v); setSuggestOpen(false); }}
            aria-expanded={cityOpen}
            aria-haspopup="listbox"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-left transition-colors hover:border-navy-300 sm:w-auto sm:min-w-32 sm:border-0 sm:px-0 sm:py-0"
          >
            <span className="leading-tight">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">City</span>
              <span className="block font-display text-base font-semibold text-navy-950">{city.name}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", cityOpen && "rotate-180")} aria-hidden />
          </button>

          {cityOpen && (
            <div className="absolute left-0 top-full z-40 mt-3 w-72 rounded-2xl border border-line bg-white p-3 shadow-pop">
              <label className="sr-only" htmlFor="hero-city-search">Search for city</label>
              <div className="flex h-10 items-center gap-2 rounded-xl border border-line px-3">
                <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <input
                  id="hero-city-search"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Search for City"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
                />
              </div>
              <p className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-teal-600">
                Popular cities
              </p>
              <ul role="listbox" aria-label="Cities">
                {cityMatches.map((c) => {
                  const selected = c.slug === city.slug;
                  return (
                    <li key={c.slug} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => { setCity(c); setCityOpen(false); setCityQuery(""); }}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-wash"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            selected ? "border-accent-500 bg-accent-500 text-white" : "border-navy-200"
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <span className={cn("text-sm font-medium", selected ? "text-accent-600" : "text-navy-900")}>
                          {c.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {cityMatches.length === 0 && (
                  <li className="px-2 py-3 text-sm text-muted">We only cover Gurugram, Noida and Delhi.</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <span className="hidden h-9 w-px shrink-0 bg-line sm:block" aria-hidden />

        <div className="relative flex-1 sm:px-4">
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line px-3 sm:border-0 sm:px-0">
            {loading ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted" aria-hidden />
            ) : (
              <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            )}
            <input
              type="search"
              role="combobox"
              aria-expanded={suggestOpen && results.length > 0}
              aria-controls="hero-search-listbox"
              aria-label={`Search location or workspaces in ${city.name}`}
              value={q}
              placeholder={`Search location or workspaces in ${city.name}`}
              onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); setCityOpen(false); }}
              onFocus={() => { setSuggestOpen(true); setCityOpen(false); }}
              onKeyDown={onKeyDown}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted/70"
            />
          </div>

          {suggestOpen && results.length > 0 && (
            <ul
              id="hero-search-listbox"
              role="listbox"
              className="scrollbar-thin absolute left-0 right-0 top-full z-40 mt-3 max-h-80 overflow-auto rounded-2xl border border-line bg-white py-2 shadow-pop"
            >
              {Object.entries(grouped).map(([group, items]) => (
                <li key={group}>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{group}</p>
                  <ul>
                    {items.map((r) => {
                      const idx = results.indexOf(r);
                      const Icon = groupIcon[r.group];
                      return (
                        <li key={r.href + r.label} role="option" aria-selected={idx === active}>
                          <button
                            type="button"
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => { setSuggestOpen(false); router.push(r.href); }}
                            className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left", idx === active && "bg-wash")}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-navy-900">{r.label}</span>
                              <span className="block truncate text-xs text-muted">{r.sublabel}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          className="h-12 shrink-0 rounded-xl bg-accent-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
        >
          View Workspaces
        </button>
      </div>

      {/* near me */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={findNearMe}
          disabled={locating}
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition-colors hover:text-teal-600 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden />
          ) : (
            <LocateFixed className="h-4.5 w-4.5" aria-hidden />
          )}
          {locating ? "Finding your location…" : `Show ${tab.near} near me`}
        </button>
        {geoNote && <p className="mt-1.5 text-xs text-muted" role="status">{geoNote}</p>}
      </div>

      {/* popular locations */}
      {chips.length > 0 && (
        <div className="px-4 pb-5 pt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
            <TrendingUp className="h-4.5 w-4.5 text-accent-500" aria-hidden />
            Popular locations in {city.name}
          </p>
          <ul className="flex flex-wrap gap-2">
            <li>
              <button
                type="button"
                onClick={() => router.push(`/${tab.slug}/${city.slug}`)}
                className="rounded-lg border border-accent-500 bg-accent-50 px-3.5 py-2 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-100"
              >
                All locations
              </button>
            </li>
            {chips.map((l) => (
              <li key={l.slug}>
                <button
                  type="button"
                  onClick={() => router.push(`/${tab.slug}/${city.slug}/${l.slug}`)}
                  className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm text-navy-800 transition-colors hover:border-navy-400 hover:bg-wash"
                >
                  {l.name}
                  <span className="ml-1.5 text-xs text-muted">{l.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
