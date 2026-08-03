import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CITY_PHOTOS } from "@/data/photos";
import { TrainFront } from "lucide-react";
import { PRODUCTS, productBySlug, cityBySlug } from "@/lib/site";
import {
  findListings, getLocality, getCity, getFaqs, medianPrice, LOCALITY_INDEX_THRESHOLD,
} from "@/lib/queries";
import { ListingExplorer } from "@/components/listing/listing-explorer";
import { FaqAccordion } from "@/components/ui/accordion";
import { Section, SectionHeading, Breadcrumbs } from "@/components/ui/primitives";
import { StickyMobileCta } from "@/components/listing/sticky-mobile-cta";
import { EnquiryForm } from "@/components/forms/lead-forms";
import { JsonLd, breadcrumbLd, faqLd, localBusinessLd } from "@/components/seo/jsonld";
import { formatINR } from "@/lib/utils";

export const revalidate = 60;

type Params = Promise<{ product: string; city: string; locality: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { product, city, locality } = await params;
  const def = productBySlug(product);
  const loc = await getLocality(city, locality);
  if (!def || !loc) return {};
  // Quality gate: noindex thin locality pages (<3 live listings) and
  // canonicalise to the city page so equity rolls up.
  const thin = loc._count.listings < LOCALITY_INDEX_THRESHOLD;
  return {
    title: `${def.plural} in ${loc.name}, ${loc.city.name} — Prices & Photos`,
    description: `${loc._count.listings} verified ${def.plural.toLowerCase()} in ${loc.name}, ${loc.city.name}. Transparent pricing, metro distances and same-day visits with zero brokerage.`,
    alternates: { canonical: thin ? `/${def.slug}/${city}` : `/${def.slug}/${city}/${locality}` },
    robots: thin ? { index: false, follow: true } : undefined,
  };
}

export default async function LocalityPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { product, city, locality } = await params;
  const sp = await searchParams;
  const def = productBySlug(product);
  const cityDef = cityBySlug(city);
  if (!def || !cityDef) notFound();

  const [loc, cityRow, result, median] = await Promise.all([
    getLocality(city, locality),
    getCity(city),
    findListings({
      productType: def.type,
      citySlug: city,
      localitySlug: locality,
      amenities: sp.amenities?.split(",").filter(Boolean),
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      sort: (sp.sort as "rating") ?? undefined,
      page: sp.page ? Number(sp.page) : 1,
    }),
    medianPrice(def.type, city, locality),
  ]);
  if (!loc || !cityRow) notFound();

  const faqs = await getFaqs("locality", loc.id);
  const metro: { name: string; line: string; distanceKm: number }[] = JSON.parse(loc.metroJson || "[]");
  const related = cityRow.localities
    .filter((l) => l.slug !== locality && l._count.listings > 0)
    .sort((a, b) => b._count.listings - a._count.listings)
    .slice(0, 6);
  const nearestWithInventory = related[0];

  const crumbs = [
    { name: "Home", href: "/" },
    { name: def.plural, href: `/${def.slug}` },
    { name: cityDef.name, href: `/${def.slug}/${city}` },
    { name: loc.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          faqLd(faqs),
          localBusinessLd({
            name: `${def.plural} in ${loc.name} — Amadhi`,
            url: `/${def.slug}/${city}/${locality}`,
            lat: loc.lat,
            lng: loc.lng,
            street: loc.name,
            locality: cityDef.name,
            region: cityDef.state,
          }),
        ]}
      />

      <div className="relative overflow-hidden bg-navy-950 text-cream-100">
        <Image
          src={CITY_PHOTOS[cityDef.slug]}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/50" aria-hidden />
        <Section className="relative py-12 sm:py-16">
          <Breadcrumbs items={crumbs} className="mb-5 text-navy-300 [&_a:hover]:text-cream-100 [&_[aria-current]]:text-cream-100" />
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {def.plural} in {loc.name}, {cityDef.name}
          </h1>
          <p className="mt-3 max-w-2xl text-navy-200">{loc.overview}</p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-300">{def.plural}</dt>
              <dd className="font-display text-2xl font-bold">{result.total}</dd>
            </div>
            {loc._count.listings > result.total && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-navy-300">All workspace types</dt>
                <dd className="font-display text-2xl font-bold">{loc._count.listings}</dd>
              </div>
            )}
            {median && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-navy-300">Average pricing</dt>
                <dd className="font-display text-2xl font-bold">
                  {formatINR(median)}<span className="text-sm font-normal text-navy-300">/{def.unit}</span>
                </dd>
              </div>
            )}
          </dl>
        </Section>
      </div>

      {/* Metro connectivity */}
      {metro.length > 0 && (
        <Section className="py-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Nearest metro stations
          </h2>
          <ul className="flex flex-wrap gap-2">
            {metro.map((m) => (
              <li
                key={m.name}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm text-navy-900"
              >
                <TrainFront className="h-4 w-4 text-accent-500" aria-hidden />
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted">{m.line} · {m.distanceKm} km</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section className="py-6">
        <ListingExplorer
          cards={result.cards}
          total={result.total}
          page={result.page}
          perPage={result.perPage}
          basePath={`/${def.slug}/${city}/${locality}`}
          showProductFilter={false}
          emptyHint={{
            citySlug: city,
            localitySlug: locality,
            nearestName: nearestWithInventory?.name,
            nearestHref: nearestWithInventory ? `/${def.slug}/${city}/${nearestWithInventory.slug}` : undefined,
          }}
        />
      </Section>

      <div className="bg-wash">
        <Section className="grid gap-10 py-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="FAQs" title={`Working from ${loc.name}`} />
            <FaqAccordion items={faqs} />
          </div>
          <div id="enquire">
            <SectionHeading
              eyebrow="Local experts"
              title={`Need help in ${loc.name}?`}
              sub="We know every building in this micro-market. Free shortlist in minutes."
            />
            <div className="max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
              <EnquiryForm productType={def.type} citySlug={city} localitySlug={locality} />
            </div>
          </div>
        </Section>
      </div>

      {/* Related localities + internal links */}
      <Section className="py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <nav aria-label="Related localities">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Nearby localities in {cityDef.name}
            </p>
            <ul className="flex flex-wrap gap-2">
              {related.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/${def.slug}/${city}/${l.slug}`}
                    className="inline-flex rounded-full border border-line bg-white px-3.5 py-2 text-sm text-navy-900 transition-colors hover:border-navy-950 hover:bg-navy-950 hover:text-cream-100"
                  >
                    {l.name} ({l._count.listings})
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Other workspace types here">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Other options in {loc.name}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${def.slug}/${city}`} className="font-medium text-accent-600 hover:underline">
                  ← All {def.plural} in {cityDef.name}
                </Link>
              </li>
              {PRODUCTS.filter((p) => p.type !== def.type).slice(0, 3).map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}/${city}/${locality}`} className="font-medium text-navy-900 hover:text-accent-600 hover:underline">
                    {p.plural} in {loc.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Section>

      <StickyMobileCta />
    </>
  );
}
