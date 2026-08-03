import type { Metadata } from "next";
import { findListings, getOperators, getCities } from "@/lib/queries";
import { ListingExplorer } from "@/components/listing/listing-explorer";
import { Section, SectionHeading } from "@/components/ui/primitives";
import { SearchBar } from "@/components/layout/search-bar";
import { StickyMobileCta } from "@/components/listing/sticky-mobile-cta";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Search Workspaces in Delhi NCR",
  description:
    "Search and filter verified coworking spaces, managed offices and meeting rooms across Gurugram, Noida and Delhi.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [result, operators, cities] = await Promise.all([
    findListings({
      q: sp.q,
      productType: sp.product,
      citySlug: sp.city,
      operatorSlug: sp.operator,
      amenities: sp.amenities?.split(",").filter(Boolean),
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      sort: (sp.sort as "rating") ?? undefined,
      page: sp.page ? Number(sp.page) : 1,
    }),
    getOperators(),
    getCities(),
  ]);

  return (
    <>
      <div className="bg-navy-950">
        <Section className="py-10">
          <h1 className="mb-4 font-display text-2xl font-bold text-cream-100">
            {sp.q ? `Results for “${sp.q}”` : "Search workspaces"}
          </h1>
          <div className="max-w-xl">
            <SearchBar size="lg" />
          </div>
        </Section>
      </div>
      <Section className="py-8">
        <ListingExplorer
          cards={result.cards}
          total={result.total}
          page={result.page}
          perPage={result.perPage}
          basePath="/search"
          operators={operators.filter((o) => o._count.listings > 0).map((o) => ({ slug: o.slug, name: o.name }))}
          showProductFilter
        />
        {result.total === 0 && (
          <div className="mt-8">
            <SectionHeading title="Browse by city instead" />
            <div className="flex flex-wrap gap-3">
              {cities.map((c) => (
                <a key={c.id} href={`/coworking-space/${c.slug}`} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-navy-900 hover:border-navy-950">
                  {c.name} ({c._count.listings})
                </a>
              ))}
            </div>
          </div>
        )}
      </Section>
      <StickyMobileCta />
    </>
  );
}
