import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PRODUCT_PHOTOS } from "@/data/photos";
import { ArrowRight, CheckCircle2, FileText, Clock } from "lucide-react";
import { PRODUCTS, CITIES, productBySlug, SITE } from "@/lib/site";
import { PRODUCT_CONTENT } from "@/data/product-content";
import { findListings, getFaqs, medianPrice } from "@/lib/queries";
import { ListingCard } from "@/components/listing/listing-card";
import { FaqAccordion } from "@/components/ui/accordion";
import { Section, SectionHeading, ButtonLink, Breadcrumbs } from "@/components/ui/primitives";
import { StickyMobileCta } from "@/components/listing/sticky-mobile-cta";
import { EnquiryForm } from "@/components/forms/lead-forms";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/seo/jsonld";
import { formatINR } from "@/lib/utils";

export const revalidate = 60;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ product: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ product: string }>;
}): Promise<Metadata> {
  const { product } = await params;
  const def = productBySlug(product);
  if (!def) return {};
  const content = PRODUCT_CONTENT[def.type];
  return {
    title: def.priceOnRequest
      ? `${content.h1} | Verified Spaces, Zero Brokerage`
      : `${content.h1} | From ${def.fromPriceLabel}/${def.unit}`,
    description: content.intro.slice(0, 158),
    alternates: { canonical: `/${def.slug}` },
    openGraph: { title: content.h1, description: content.intro.slice(0, 158), url: `/${def.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  const def = productBySlug(product);
  if (!def) notFound();
  const content = PRODUCT_CONTENT[def.type];

  const [{ cards, total }, faqs, ...medians] = await Promise.all([
    findListings({ productType: def.type, perPage: 6 }),
    getFaqs("product", def.type),
    ...CITIES.map((c) => medianPrice(def.type, c.slug)),
  ]);

  const crumbs = [{ name: "Home", href: "/" }, { name: def.plural }];
  const vo = content.virtualOfficeExtras;

  return (
    <>
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(faqs)]} />

      {/* Hero */}
      <div className="relative overflow-hidden bg-navy-950 text-cream-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 30%, #10a58c 0, transparent 40%), radial-gradient(circle at 85% 70%, #e8541f 0, transparent 45%)",
          }}
        />
        <Section className="relative py-14 sm:py-20">
          <Breadcrumbs items={crumbs} className="mb-5 text-navy-300 [&_a:hover]:text-cream-100 [&_[aria-current]]:text-cream-100" />
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_380px]">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">{content.h1}</h1>
              <p className="mt-4 text-lg leading-relaxed text-navy-200">{content.intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="#listings" variant="primary">
                  Browse {total} spaces <ArrowRight className="h-4 w-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="#enquire" variant="outline" className="border-navy-600 text-cream-100 hover:border-navy-400 hover:bg-navy-800">
                  Get a free shortlist
                </ButtonLink>
              </div>
            </div>
            <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-navy-700/60 lg:block">
              <Image
                src={PRODUCT_PHOTOS[def.type]}
                alt={`${def.name} interior example`}
                fill
                priority
                sizes="(max-width: 1024px) 0px, 380px"
                className="object-cover"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* City links + pricing table */}
      <Section className="py-14 sm:py-16">
        <SectionHeading eyebrow="Choose your city" title={`${def.plural} by city`} />
        <div className="grid gap-4 md:grid-cols-3">
          {CITIES.map((c, i) => (
            <Link
              key={c.slug}
              href={`/${def.slug}/${c.slug}`}
              className="group rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
            >
              <h3 className="font-display text-lg font-semibold text-navy-950 group-hover:text-accent-600">
                {def.plural} in {c.name}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted">{c.blurb}</p>
              <p className="mt-4 text-sm text-muted">
                {medians[i] ? (
                  <>Median{" "}<span className="font-display text-lg font-bold text-navy-950">{formatINR(medians[i]!)}</span>{" "}<span className="text-xs">/{def.unit}</span></>
                ) : (
                  "Enquire for pricing"
                )}
              </p>
            </Link>
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <div className="bg-wash">
        <Section className="py-14 sm:py-16">
          <SectionHeading eyebrow="Why this works" title={`Benefits of a ${def.name.toLowerCase()}`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                <h3 className="mt-3 font-display text-base font-semibold text-navy-950">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Virtual Office extras */}
      {vo && (
        <>
          <Section className="py-14 sm:py-16">
            <SectionHeading eyebrow="Use cases" title="What teams use virtual offices for" />
            <div className="grid gap-4 md:grid-cols-3">
              {vo.useCases.map((u) => (
                <div key={u.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                  <h3 className="font-display text-base font-semibold text-navy-950">{u.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{u.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-950">
                  <FileText className="h-5 w-5 text-accent-500" aria-hidden /> Documents you receive
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-navy-800">
                  {vo.documents.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-center rounded-2xl bg-navy-950 p-6 text-cream-100">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                  <Clock className="h-5 w-5 text-accent-400" aria-hidden /> The turnaround promise
                </h3>
                <p className="mt-3 text-navy-200">{vo.turnaround}</p>
              </div>
            </div>
          </Section>
          <div className="bg-wash">
            <Section className="py-14 sm:py-16">
              <SectionHeading eyebrow="Plans" title="Virtual office plans" />
              <div className="grid gap-4 md:grid-cols-3">
                {vo.tiers.map((t, i) => (
                  <div key={t.name} className={i === 1 ? "rounded-2xl bg-navy-950 p-6 text-cream-100 shadow-pop" : "rounded-2xl border border-line bg-white p-6 shadow-card"}>
                    <h3 className="font-display text-base font-semibold">{t.name}</h3>
                    <p className="mt-2 font-display text-2xl font-bold">{t.price}</p>
                    <ul className={`mt-4 space-y-2 text-sm ${i === 1 ? "text-navy-200" : "text-muted"}`}>
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${i === 1 ? "text-accent-400" : "text-success"}`} aria-hidden /> {f}
                        </li>
                      ))}
                    </ul>
                    <ButtonLink href="#enquire" variant={i === 1 ? "cream" : "dark"} size="sm" className="mt-5 w-full">
                      Get started
                    </ButtonLink>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}

      {/* Listings preview */}
      <Section id="listings" className="py-14 sm:py-16">
        <SectionHeading eyebrow="Live inventory" title={`Popular ${def.plural.toLowerCase()} in NCR`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          {CITIES.map((c) => (
            <ButtonLink key={c.slug} href={`/${def.slug}/${c.slug}`} variant="outline" size="sm">
              All in {c.name}
            </ButtonLink>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <div className="bg-wash">
        <Section className="py-14 sm:py-16">
          <SectionHeading eyebrow="How it works" title="From enquiry to move-in" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.howItWorks.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-950 font-display text-sm font-bold text-cream-100">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold text-navy-950">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* FAQs + enquiry */}
      <Section id="enquire" className="grid gap-10 py-14 sm:py-16 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="FAQs" title={`${def.name} questions`} />
          <FaqAccordion items={faqs} />
        </div>
        <div>
          <SectionHeading eyebrow="Get started" title="Get a free shortlist" sub="Two steps, under a minute. Zero brokerage." />
          <div className="max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
            <EnquiryForm productType={def.type} />
          </div>
        </div>
      </Section>

      {/* Cross-sell */}
      <Section className="pb-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Also explore</p>
        <div className="flex flex-wrap gap-2">
          {content.crossSell.map((t) => {
            const p = PRODUCTS.find((x) => x.type === t)!;
            return (
              <Link key={t} href={`/${p.slug}`} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-navy-900 transition-colors hover:border-navy-950 hover:bg-navy-950 hover:text-cream-100">
                {p.plural} →
              </Link>
            );
          })}
        </div>
      </Section>

      <StickyMobileCta listingName={`${def.plural} via ${SITE.name}`} />
    </>
  );
}
