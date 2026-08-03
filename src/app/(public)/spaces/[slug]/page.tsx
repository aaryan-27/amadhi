import { notFound } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BadgeCheck, MapPin, Clock, Users, TrainFront, Landmark as LandmarkIcon,
  Wifi, Presentation, DoorClosed, CircleParking, Coffee, Zap, Dumbbell,
  UtensilsCrossed, Accessibility, Phone, Printer, ShieldCheck, BellRing,
  PartyPopper, Check, CalendarCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { getListingDetail, getRelatedListings, getFaqs } from "@/lib/queries";
import { productByType } from "@/lib/site";
import { Section, SectionHeading, Breadcrumbs, Badge, RatingStars } from "@/components/ui/primitives";
import { FaqAccordion } from "@/components/ui/accordion";
import { ListingCard } from "@/components/listing/listing-card";
import { ReviewForm, BrochureGate } from "@/components/forms/lead-forms";
import { JsonLd, breadcrumbLd, faqLd, localBusinessLd, productOfferLd } from "@/components/seo/jsonld";
import { formatINR } from "@/lib/utils";
import { Gallery, EnquiryCard, ShareButton, RecentTracker, DetailStickyCta } from "./detail-client";

const LeafletMap = dynamic(() => import("@/components/listing/leaflet-map"));

export const revalidate = 60;

const amenityIcons: Record<string, React.ElementType> = {
  Wifi, Presentation, DoorClosed, CircleParking, Coffee, Clock, Zap, Dumbbell,
  UtensilsCrossed, Accessibility, Phone, Printer, ShieldCheck, BellRing, PartyPopper,
};

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const listings = await db.listing.findMany({ where: { status: "published" }, select: { slug: true }, take: 50 });
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingDetail(slug);
  if (!listing || listing.status !== "published") return {};
  const SEAT = ["coworking", "dedicated_desk", "private_cabin", "managed_office"];
  const priced = listing.plans.flatMap((p) => p.prices.map((pr) => ({ ...pr, productType: p.productType })));
  const monthly =
    priced.filter((p) => p.period === "month" && SEAT.includes(p.productType)).sort((a, b) => a.amount - b.amount)[0] ??
    priced.filter((p) => p.period === "month").sort((a, b) => a.amount - b.amount)[0];
  const min = monthly ?? priced.sort((a, b) => a.amount - b.amount)[0];
  return {
    title: `${listing.name}, ${listing.locality.name} ${listing.city.name} — ${min ? `From ${formatINR(min.amount)}` : "Pricing & Photos"}`,
    description: `${listing.summary} Verified photos, transparent pricing, amenities and reviews. Book a free visit with zero brokerage.`,
    alternates: { canonical: `/spaces/${listing.slug}` },
    openGraph: { images: listing.images[0] ? [{ url: listing.images[0].url }] : [] },
  };
}

const periodLabel: Record<string, string> = {
  month: "/month", hour: "/hour", sqft_month: "/sq ft/mo", year: "/year",
};

export default async function ListingDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const listing = await getListingDetail(slug);
  if (!listing || listing.status !== "published") notFound();

  const [related, faqs] = await Promise.all([
    getRelatedListings(listing.id, listing.localityId, listing.cityId),
    getFaqs("listing", listing.id),
  ]);

  const nearby: { name: string; distanceKm: number; type: string }[] = JSON.parse(listing.nearbyJson || "[]");
  const SEAT_PRODUCTS = ["coworking", "dedicated_desk", "private_cabin", "managed_office"];
  const allPrices = listing.plans.flatMap((p) => p.prices.map((pr) => ({ ...pr, productType: p.productType })));
  const fromPrice =
    allPrices.filter((p) => p.period === "month" && SEAT_PRODUCTS.includes(p.productType)).sort((a, b) => a.amount - b.amount)[0] ??
    allPrices.filter((p) => p.period === "month").sort((a, b) => a.amount - b.amount)[0] ??
    [...allPrices].sort((a, b) => a.amount - b.amount)[0];
  const hasMeetingRoom = listing.plans.some((p) => p.productType === "meeting_room");
  const primaryProduct = productByType(listing.plans[0]?.productType ?? "coworking");

  const crumbs = [
    { name: "Home", href: "/" },
    { name: primaryProduct?.plural ?? "Workspaces", href: `/${primaryProduct?.slug ?? "coworking-space"}` },
    { name: listing.city.name, href: `/${primaryProduct?.slug ?? "coworking-space"}/${listing.city.slug}` },
    { name: listing.locality.name, href: `/${primaryProduct?.slug ?? "coworking-space"}/${listing.city.slug}/${listing.locality.slug}` },
    { name: listing.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          faqLd(faqs),
          localBusinessLd({
            name: listing.name,
            url: `/spaces/${listing.slug}`,
            image: listing.images[0]?.url,
            lat: listing.lat,
            lng: listing.lng,
            street: listing.address,
            locality: listing.city.name,
            region: listing.city.state,
            rating: listing.rating || undefined,
            reviewCount: listing.reviewCount || undefined,
          }),
          productOfferLd({
            name: listing.name,
            description: listing.summary,
            url: `/spaces/${listing.slug}`,
            offers: listing.plans.map((p) => ({
              name: p.name,
              price: p.prices[0]?.amount ?? 0,
              period: p.prices[0]?.period ?? "month",
            })),
          }),
        ]}
      />
      <RecentTracker
        slug={listing.slug}
        name={listing.name}
        locality={listing.locality.name}
        city={listing.city.name}
        image={listing.images[0]?.url ?? null}
        fromPrice={fromPrice?.amount ?? null}
      />

      <Section className="py-6 sm:py-8">
        <Breadcrumbs items={crumbs} className="mb-4" />

        {/* Title row */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">{listing.name}</h1>
              {listing.verified && (
                <Badge tone="verified"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified</Badge>
              )}
              {listing.featured && <Badge tone="featured">Featured</Badge>}
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-4 w-4" aria-hidden /> {listing.address}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <RatingStars rating={listing.rating} count={listing.reviewCount} />
              <span className="flex items-center gap-1 text-muted">
                <Users className="h-4 w-4" aria-hidden /> {listing.capacity} seats
              </span>
              <span className="flex items-center gap-1 text-muted">
                <Clock className="h-4 w-4" aria-hidden />
                {listing.openDays === "24×7" ? "24×7" : `${listing.openingTime}–${listing.closingTime}`}
              </span>
            </div>
          </div>
          <ShareButton name={listing.name} />
        </div>

        {/* Gallery + sticky card */}
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0">
            <Gallery images={listing.images.map((i) => ({ url: i.url, alt: i.alt }))} name={listing.name} />

            {/* About */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-navy-950">About this space</h2>
              <div className="prose-amadhi mt-3">
                {listing.description.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {listing.operator && (
                <p className="mt-4 text-sm text-muted">
                  Operated by <span className="font-semibold text-navy-900">{listing.operator.name}</span>
                  {listing.operator.about ? ` — ${listing.operator.about}` : ""}
                </p>
              )}
            </div>

            {/* Amenities */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-navy-950">Amenities</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.amenities.map(({ amenity }) => {
                  const Icon = amenityIcons[amenity.icon] ?? Check;
                  return (
                    <li key={amenity.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-navy-900">
                      <Icon className="h-4.5 w-4.5 shrink-0 text-accent-500" aria-hidden />
                      {amenity.name}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Pricing & plans */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-navy-950">Pricing &amp; plans</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-wash text-left">
                      <th className="px-4 py-3 font-semibold text-navy-900">Plan</th>
                      <th className="px-4 py-3 font-semibold text-navy-900">Seats</th>
                      <th className="px-4 py-3 font-semibold text-navy-900">Price</th>
                      <th className="px-4 py-3 font-semibold text-navy-900">Includes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {listing.plans.map((plan) => (
                      <tr key={plan.id}>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-navy-950">{plan.name}</p>
                          <p className="text-xs text-muted">{productByType(plan.productType)?.name}</p>
                        </td>
                        <td className="px-4 py-3.5 text-muted">
                          {plan.seatsMin === plan.seatsMax ? plan.seatsMin : `${plan.seatsMin}–${plan.seatsMax}`}
                        </td>
                        <td className="px-4 py-3.5">
                          {plan.prices.map((pr) => (
                            <p key={pr.id}>
                              <span className="font-display font-bold text-navy-950">{formatINR(pr.amount)}</span>
                              <span className="text-xs text-muted">{periodLabel[pr.period]} {pr.unitNote && `· ${pr.unitNote}`}</span>
                            </p>
                          ))}
                        </td>
                        <td className="px-4 py-3.5 text-xs leading-relaxed text-muted">
                          {plan.highlights.split("\n").slice(0, 2).join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">
                Rack rates shown — Amadhi negotiates on your behalf at zero cost. GST extra.
              </p>
            </div>

            {/* Availability (request-based) */}
            <div className="mt-10 rounded-2xl border border-line bg-wash p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-950">
                <CalendarCheck className="h-5 w-5 text-accent-500" aria-hidden /> Availability
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Availability is confirmed on request — inventory in {listing.locality.name} moves fast.
                Use <strong className="text-navy-900">Book a Visit</strong> to pick a slot in the next 14 days, or
                enquire and we&apos;ll confirm live availability for your team size within minutes.
              </p>
            </div>

            {/* Map + nearby */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-navy-950">Location &amp; connectivity</h2>
              <div className="mt-4 h-80 overflow-hidden rounded-2xl border border-line">
                <LeafletMap
                  markers={[{ lat: listing.lat, lng: listing.lng, label: listing.name }]}
                  zoom={15}
                  className="h-80 w-full"
                />
              </div>
              {nearby.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {nearby.map((n) => (
                    <li key={n.name} className="flex items-center gap-2.5 text-sm text-navy-900">
                      {n.type === "metro" ? (
                        <TrainFront className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
                      ) : (
                        <LandmarkIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      )}
                      {n.name}
                      <span className="text-xs text-muted">· {n.distanceKm} km</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Brochure */}
            <div className="mt-10 rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold text-navy-950">Download the brochure</h2>
              <p className="mb-4 mt-1 text-sm text-muted">
                Floor plans, detailed pricing and amenity list — straight to your inbox.
              </p>
              <BrochureGate listingSlug={listing.slug} brochureUrl={listing.brochureUrl || "/amadhi-brochure.pdf"} />
            </div>

            {/* Reviews */}
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-navy-950">
                  Reviews {listing.reviewCount > 0 && <span className="text-muted">({listing.reviewCount})</span>}
                </h2>
                <RatingStars rating={listing.rating} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {listing.reviews.map((r) => (
                  <figure key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                    <RatingStars rating={r.rating} />
                    {r.title && <p className="mt-2 font-display text-sm font-semibold text-navy-950">{r.title}</p>}
                    <blockquote className="mt-1.5 text-sm leading-relaxed text-navy-800">{r.body}</blockquote>
                    <figcaption className="mt-3 text-xs text-muted">
                      <span className="font-medium text-navy-900">{r.name}</span>
                      {r.persona && ` · ${r.persona}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <details className="mt-6 rounded-2xl border border-line bg-white p-6">
                <summary className="cursor-pointer font-display text-sm font-semibold text-navy-950">
                  Worked from here? Write a review
                </summary>
                <div className="mt-4 max-w-md">
                  <ReviewForm listingSlug={listing.slug} />
                </div>
              </details>
            </div>

            {/* FAQs */}
            <div className="mt-10">
              <h2 className="mb-4 font-display text-xl font-semibold text-navy-950">FAQs</h2>
              <FaqAccordion items={faqs} />
            </div>
          </div>

          {/* Sticky enquiry card */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <EnquiryCard
              listing={{
                slug: listing.slug,
                name: listing.name,
                capacity: listing.capacity,
                openDays: listing.openDays,
                openingTime: listing.openingTime,
                closingTime: listing.closingTime,
                fromPrice: fromPrice?.amount ?? null,
                fromPeriod: fromPrice?.period ?? null,
                hasMeetingRoom,
              }}
            />
            <p className="mt-3 text-center text-xs text-muted">
              Free expert help · Zero brokerage · &lt;5-min response
            </p>
          </aside>
        </div>

        {/* Related spaces */}
        {related.length > 0 && (
          <div className="mt-16">
            <SectionHeading
              eyebrow="Similar spaces"
              title={`More options near ${listing.locality.name}`}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
            <p className="mt-6 text-sm">
              <Link
                href={`/${primaryProduct?.slug ?? "coworking-space"}/${listing.city.slug}/${listing.locality.slug}`}
                className="font-medium text-accent-600 hover:underline"
              >
                See all workspaces in {listing.locality.name} →
              </Link>
            </p>
          </div>
        )}
      </Section>

      <DetailStickyCta name={listing.name} />
    </>
  );
}
