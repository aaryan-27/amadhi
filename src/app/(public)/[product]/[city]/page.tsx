import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CITY_PHOTOS } from "@/data/photos";
import { PRODUCTS, CITIES, productBySlug, cityBySlug } from "@/lib/site";
import { findListings, getCity, getFaqs, getOperators, medianPrice } from "@/lib/queries";
import { ListingExplorer } from "@/components/listing/listing-explorer";
import { FaqAccordion } from "@/components/ui/accordion";
import { Section, SectionHeading, Breadcrumbs } from "@/components/ui/primitives";
import { StickyMobileCta } from "@/components/listing/sticky-mobile-cta";
import { EnquiryForm } from "@/components/forms/lead-forms";
import { JsonLd, breadcrumbLd, faqLd, localBusinessLd } from "@/components/seo/jsonld";
import { formatINR } from "@/lib/utils";

export const revalidate = 60;

export function generateStaticParams() {
  return PRODUCTS.flatMap((p) => CITIES.map((c) => ({ product: p.slug, city: c.slug })));
}

type Params = Promise<{ product: string; city: string }>;
type Search = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { product, city } = await params;
  const def = productBySlug(product);
  const cityDef = cityBySlug(city);
  if (!def || !cityDef) return {};
  return {
    title: `${def.plural} in ${cityDef.name} — Verified Spaces, Zero Brokerage`,
    description: `Compare verified ${def.plural.toLowerCase()} in ${cityDef.name} with transparent pricing. ${cityDef.blurb.slice(0, 90)}`,
    alternates: { canonical: `/${def.slug}/${cityDef.slug}` },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { product, city } = await params;
  const sp = await searchParams;
  const def = productBySlug(product);
  const cityDef = cityBySlug(city);
  if (!def || !cityDef) notFound();

  const [cityRow, result, faqs, operators, median] = await Promise.all([
    getCity(city),
    findListings({
      productType: def.type,
      citySlug: city,
      localitySlug: sp.locality,
      operatorSlug: sp.operator,
      amenities: sp.amenities?.split(",").filter(Boolean),
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      sort: (sp.sort as "rating") ?? undefined,
      page: sp.page ? Number(sp.page) : 1,
    }),
    getFaqs("product_city", `${def.type}:${city}`),
    getOperators(),
    medianPrice(def.type, city),
  ]);
  if (!cityRow) notFound();

  const localities = cityRow.localities
    .filter((l) => l._count.listings > 0)
    .sort((a, b) => b._count.listings - a._count.listings);
  const siblingCities = CITIES.filter((c) => c.slug !== city);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: def.plural, href: `/${def.slug}` },
    { name: cityDef.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          faqLd(faqs),
          localBusinessLd({
            name: `${def.plural} in ${cityDef.name} — Amadhi`,
            url: `/${def.slug}/${cityDef.slug}`,
            lat: cityDef.lat,
            lng: cityDef.lng,
            street: cityDef.name,
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
          className="object-cover opacity-25"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/40" aria-hidden />
        <Section className="relative py-12 sm:py-16">
          <Breadcrumbs items={crumbs} className="mb-5 text-navy-300 [&_a:hover]:text-cream-100 [&_[aria-current]]:text-cream-100" />
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {def.plural} in {cityDef.name}
          </h1>
          <p className="mt-3 max-w-2xl text-navy-200">{cityDef.blurb}</p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-300">Live spaces</dt>
              <dd className="font-display text-2xl font-bold text-cream-100">{result.total}</dd>
            </div>
            {median && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-navy-300">Median price</dt>
                <dd className="font-display text-2xl font-bold text-cream-100">
                  {formatINR(median)}<span className="text-sm font-normal text-navy-300">/{def.unit}</span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wider text-navy-300">Localities covered</dt>
              <dd className="font-display text-2xl font-bold text-cream-100">{localities.length}</dd>
            </div>
          </dl>
        </Section>
      </div>

      {/* Popular localities */}
      {localities.length > 0 && (
        <Section className="py-8">
          <h2 className="sr-only">Popular localities in {cityDef.name}</h2>
          <ul className="flex flex-wrap gap-2">
            {localities.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/${def.slug}/${city}/${l.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm text-navy-900 transition-colors hover:border-navy-950 hover:bg-navy-950 hover:text-cream-100"
                >
                  {l.name} <span className="text-xs opacity-70">({l._count.listings})</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Listings */}
      <Section className="py-6">
        <ListingExplorer
          cards={result.cards}
          total={result.total}
          page={result.page}
          perPage={result.perPage}
          basePath={`/${def.slug}/${city}`}
          localities={localities.map((l) => ({ slug: l.slug, name: l.name }))}
          operators={operators.filter((o) => o._count.listings > 0).map((o) => ({ slug: o.slug, name: o.name }))}
          showProductFilter={false}
          emptyHint={{ citySlug: city }}
        />
      </Section>

      {/* FAQs + enquiry */}
      <div className="bg-wash">
        <Section className="grid gap-10 py-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="FAQs" title={`${def.plural} in ${cityDef.name} — FAQs`} />
            <FaqAccordion items={faqs} />
          </div>
          <div id="enquire">
            <SectionHeading
              eyebrow="Free expert help"
              title={`Find your ${cityDef.name} workspace faster`}
              sub="Tell us your requirement — our local team responds in under 5 minutes."
            />
            <div className="max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
              <EnquiryForm productType={def.type} citySlug={city} />
            </div>
          </div>
        </Section>
      </div>

      {/* Internal links: hub ↑, siblings ↔ */}
      <Section className="py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <nav aria-label="Product hub">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Explore more</p>
            <Link href={`/${def.slug}`} className="text-sm font-medium text-accent-600 hover:underline">
              All {def.plural} in Delhi NCR →
            </Link>
          </nav>
          <nav aria-label="Sibling cities">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Other cities</p>
            <ul className="space-y-2 text-sm">
              {siblingCities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${def.slug}/${c.slug}`} className="font-medium text-navy-900 hover:text-accent-600 hover:underline">
                    {def.plural} in {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Other workspace types">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Other workspaces in {cityDef.name}
            </p>
            <ul className="space-y-2 text-sm">
              {PRODUCTS.filter((p) => p.type !== def.type)
                .slice(0, 4)
                .map((p) => (
                  <li key={p.slug}>
                    <Link href={`/${p.slug}/${city}`} className="font-medium text-navy-900 hover:text-accent-600 hover:underline">
                      {p.plural} in {cityDef.name}
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
