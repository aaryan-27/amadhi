import Link from "next/link";
import Image from "next/image";
import { PRODUCTS, CITIES, SITE } from "@/lib/site";
import { Phone, Mail, MapPin } from "lucide-react";

const FOOTER_LOCALITIES: { label: string; href: string }[] = [
  { label: "Coworking in Cyber City", href: "/coworking-space/gurugram/cyber-city" },
  { label: "Coworking on Golf Course Road", href: "/coworking-space/gurugram/golf-course-road" },
  { label: "Coworking in Udyog Vihar", href: "/coworking-space/gurugram/udyog-vihar" },
  { label: "Coworking in Sector 62 Noida", href: "/coworking-space/noida/sector-62" },
  { label: "Coworking on Noida Expressway", href: "/coworking-space/noida/noida-expressway" },
  { label: "Coworking in Connaught Place", href: "/coworking-space/delhi/connaught-place" },
  { label: "Coworking in Nehru Place", href: "/coworking-space/delhi/nehru-place" },
  { label: "Coworking in Saket", href: "/coworking-space/delhi/saket" },
  { label: "Virtual Office in Delhi", href: "/virtual-office/delhi" },
  { label: "Managed Office in Gurugram", href: "/managed-office/gurugram" },
  { label: "Meeting Rooms in Noida", href: "/meeting-rooms/noida" },
  { label: "Office Leasing in Gurugram", href: "/office-leasing/gurugram" },
];

export function Footer() {
  return (
    <footer className="mt-20 bg-navy-950 text-navy-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Image src="/brand/icon.png" alt="Amadhi" width={40} height={40} className="h-10 w-10 rounded-xl" />
              <div>
                <p className="font-display text-xl font-bold tracking-wide text-cream-100">AMADHI</p>
                <p className="text-xs text-navy-300">Your space to grow</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              Delhi NCR&apos;s premium workspace marketplace. Verified coworking spaces, managed
              offices and enterprise leasing across Gurugram, Noida and Delhi — with zero brokerage.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href={SITE.phoneHref} className="inline-flex items-center gap-2 hover:text-cream-100" data-gtm="call-click-footer">
                  <Phone className="h-4 w-4" aria-hidden /> {SITE.phone}
                </a>
              </li>
              <li>
                <a href={SITE.phone2Href} className="inline-flex items-center gap-2 hover:text-cream-100" data-gtm="call-click-footer">
                  <Phone className="h-4 w-4" aria-hidden /> {SITE.phone2}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 hover:text-cream-100">
                  <Mail className="h-4 w-4" aria-hidden /> {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {SITE.address.line1}, {SITE.address.line2}, {SITE.address.city}, {SITE.address.state} {SITE.address.pincode}
                </span>
              </li>
              <li className="text-navy-400">{SITE.hours}</li>
            </ul>
          </div>

          {/* Workspaces */}
          <nav aria-label="Workspace types">
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-cream-200">Workspaces</p>
            <ul className="space-y-2 text-sm">
              {PRODUCTS.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="hover:text-cream-100">{p.plural}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Cities */}
          <nav aria-label="Cities">
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-cream-200">Cities</p>
            <ul className="space-y-2 text-sm">
              {CITIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/coworking-space/${c.slug}`} className="hover:text-cream-100">
                    Coworking in {c.name}
                  </Link>
                </li>
              ))}
              {CITIES.map((c) => (
                <li key={`mo-${c.slug}`}>
                  <Link href={`/managed-office/${c.slug}`} className="hover:text-cream-100">
                    Managed Office in {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label="Company">
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-cream-200">Company</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-cream-100">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-cream-100">Contact</Link></li>
              <li><Link href="/blog" className="hover:text-cream-100">Blog</Link></li>
              <li><Link href="/compare" className="hover:text-cream-100">Compare Spaces</Link></li>
              <li><Link href="/wishlist" className="hover:text-cream-100">Wishlist</Link></li>
            </ul>
          </nav>
        </div>

        {/* Popular searches directory */}
        <nav aria-label="Popular searches" className="mt-12 border-t border-navy-800 pt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-300">Popular searches</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {FOOTER_LOCALITIES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-navy-300 hover:text-cream-100">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-navy-800 pt-6 text-xs text-navy-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Amadhi Workspaces Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-cream-100">Privacy</Link>
            <Link href="/terms" className="hover:text-cream-100">Terms</Link>
            <Link href="/admin" className="hover:text-cream-100">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
