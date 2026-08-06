"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronDown, Menu, Phone, X, Heart,
  Users, Building2, DoorClosed, Armchair, Presentation, Landmark, MapPin,
} from "lucide-react";
import { PRODUCTS, CITIES, SITE } from "@/lib/site";
import { SearchBar } from "@/components/layout/search-bar";
import { cn } from "@/lib/utils";

const productIcons: Record<string, React.ElementType> = {
  Users, Building2, DoorClosed, Armchair, Presentation, Landmark, MapPin,
};

const TOP_LOCALITIES: Record<string, { name: string; slug: string }[]> = {
  gurugram: [
    { name: "Cyber City", slug: "cyber-city" },
    { name: "Golf Course Road", slug: "golf-course-road" },
    { name: "MG Road", slug: "mg-road" },
    { name: "Udyog Vihar", slug: "udyog-vihar" },
    { name: "Sohna Road", slug: "sohna-road" },
  ],
  noida: [
    { name: "Sector 62", slug: "sector-62" },
    { name: "Sector 18", slug: "sector-18" },
    { name: "Noida Expressway", slug: "noida-expressway" },
    { name: "Sector 125", slug: "sector-125" },
  ],
  delhi: [
    { name: "Connaught Place", slug: "connaught-place" },
    { name: "Nehru Place", slug: "nehru-place" },
    { name: "Saket", slug: "saket" },
    { name: "Aerocity", slug: "aerocity" },
  ],
};

export function Header() {
  const [menuOpen, setMenuOpen] = useState<"products" | "cities" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(null);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md">
      <nav ref={navRef} aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Amadhi home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 p-1">
            <Image src="/brand/icon.png" alt="" width={32} height={32} className="h-full w-full object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-wide text-navy-950 sm:text-lg">AMADHI</span>
            <span className="text-[10px] font-medium tracking-wide text-muted">Your space to grow</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="ml-6 hidden items-center gap-1 lg:flex">
          {/* Workspaces mega menu */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen === "products"}
              aria-haspopup="true"
              onClick={() => setMenuOpen(menuOpen === "products" ? null : "products")}
              className="flex h-10 items-center gap-1 rounded-full px-3.5 text-sm font-medium text-navy-900 hover:bg-navy-50"
            >
              Workspaces
              <ChevronDown className={cn("h-4 w-4 transition-transform", menuOpen === "products" && "rotate-180")} aria-hidden />
            </button>
            {menuOpen === "products" && (
              <div className="absolute left-0 top-12 w-[560px] rounded-2xl border border-line bg-white p-3 shadow-pop">
                <div className="grid grid-cols-2 gap-1">
                  {PRODUCTS.map((p) => {
                    const Icon = productIcons[p.icon] ?? Building2;
                    return (
                      <Link
                        key={p.slug}
                        href={`/${p.slug}`}
                        className="flex items-start gap-3 rounded-xl p-3 hover:bg-wash"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-navy-800">
                          <Icon className="h-4.5 w-4.5" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-navy-950">{p.name}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted">{p.shortDesc}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cities dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen === "cities"}
              aria-haspopup="true"
              onClick={() => setMenuOpen(menuOpen === "cities" ? null : "cities")}
              className="flex h-10 items-center gap-1 rounded-full px-3.5 text-sm font-medium text-navy-900 hover:bg-navy-50"
            >
              Cities
              <ChevronDown className={cn("h-4 w-4 transition-transform", menuOpen === "cities" && "rotate-180")} aria-hidden />
            </button>
            {menuOpen === "cities" && (
              <div className="absolute left-0 top-12 flex w-[640px] gap-2 rounded-2xl border border-line bg-white p-4 shadow-pop">
                {CITIES.map((c) => (
                  <div key={c.slug} className="flex-1">
                    <Link
                      href={`/coworking-space/${c.slug}`}
                      className="block rounded-lg px-2 py-1.5 font-display text-sm font-semibold text-navy-950 hover:bg-wash"
                    >
                      {c.name}
                    </Link>
                    <ul className="mt-1 space-y-0.5">
                      {TOP_LOCALITIES[c.slug].map((l) => (
                        <li key={l.slug}>
                          <Link
                            href={`/coworking-space/${c.slug}/${l.slug}`}
                            className="block rounded-lg px-2 py-1 text-[13px] text-muted hover:bg-wash hover:text-navy-900"
                          >
                            {l.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/meeting-rooms" className="h-10 rounded-full px-3.5 text-sm font-medium leading-10 text-navy-900 hover:bg-navy-50">
            Meeting Rooms
          </Link>
          <Link href="/blog" className="h-10 rounded-full px-3.5 text-sm font-medium leading-10 text-navy-900 hover:bg-navy-50">
            Blog
          </Link>
        </div>

        {/* Persistent search bar (replaces the old expanding search icon) */}
        <div className="ml-4 hidden min-w-0 flex-1 lg:block xl:ml-6">
          <SearchBar className="max-w-md" placeholder="Search locality, space or operator…" />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-navy-900 hover:bg-navy-50 sm:flex"
          >
            <Heart className="h-5 w-5" aria-hidden />
          </Link>

          {/* Phone reduced to an icon; number still exposed to screen readers */}
          <a
            href={SITE.phoneHref}
            aria-label={`Call Amadhi on ${SITE.phone}`}
            title={SITE.phone}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-navy-200 text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 md:flex"
            data-gtm="call-click-header"
          >
            <Phone className="h-4.5 w-4.5" aria-hidden />
          </a>

          <Link
            href="/#enquire"
            className="hidden h-10 items-center rounded-full bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600 lg:flex"
          >
            Talk to an expert
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-navy-900 hover:bg-navy-50 lg:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-line bg-white px-4 pb-6 pt-4 lg:hidden">
          <SearchBar className="mb-4" />
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Workspaces</p>
          <div className="grid grid-cols-2 gap-1">
            {PRODUCTS.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-900 hover:bg-wash">
                {p.name}
              </Link>
            ))}
          </div>
          <p className="mt-4 px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Cities</p>
          <div className="grid grid-cols-3 gap-1">
            {CITIES.map((c) => (
              <Link key={c.slug} href={`/coworking-space/${c.slug}`} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-900 hover:bg-wash">
                {c.name}
              </Link>
            ))}
          </div>
          {/* WhatsApp lives in the floating button, so the drawer keeps just
              Call + the primary CTA. */}
          <a
            href={SITE.phoneHref}
            data-gtm="call-click-menu"
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full border border-navy-200 text-sm font-medium text-navy-900"
          >
            <Phone className="h-4 w-4" aria-hidden /> Call {SITE.phone}
          </a>
          <Link href="/#enquire" className="mt-2 flex h-11 items-center justify-center rounded-full bg-accent-500 text-sm font-medium text-white">
            Talk to an expert
          </Link>
        </div>
      )}
    </header>
  );
}
