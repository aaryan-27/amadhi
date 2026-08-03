import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck, Zap, MapPin, IndianRupee, ArrowRight, Building2,
  Users, DoorClosed, Armchair, Presentation, Landmark, Star,
} from "lucide-react";
import { PRODUCTS, CITIES, SITE, TESTIMONIALS, BUSINESS_PARTNERS } from "@/lib/site";
import {
  getCities, getCity, getFeaturedListings, getFaqs, getChannelPartners, getOperatorCount,
  getPopularLocalities,
} from "@/lib/queries";
import { ListingCard } from "@/components/listing/listing-card";
import { FaqAccordion } from "@/components/ui/accordion";
import { Section, SectionHeading, ButtonLink } from "@/components/ui/primitives";
import { StickyMobileCta } from "@/components/listing/sticky-mobile-cta";
import { JsonLd, faqLd } from "@/components/seo/jsonld";
import { EnquiryForm } from "@/components/forms/lead-forms";
import { TestimonialSlider } from "@/components/home/testimonial-slider";
import { HeroSearch } from "@/components/home/hero-search";
import { CITY_PHOTOS } from "@/data/photos";
import { cn } from "@/lib/utils";

export const revalidate = 60;

const productIcons: Record<string, React.ElementType> = {
  Users, Building2, DoorClosed, Armchair, Presentation, Landmark, MapPin,
};

/* Per-product hue chips — myHQ-style colorful categories */
const productHues: Record<string, { chip: string; icon: string }> = {
  coworking: { chip: "bg-teal-100", icon: "text-teal-700" },
  managed_office: { chip: "bg-sky-soft", icon: "text-sky-strong" },
  private_cabin: { chip: "bg-violet-soft", icon: "text-violet-strong" },
  dedicated_desk: { chip: "bg-gold-100", icon: "text-gold-500" },
  meeting_room: { chip: "bg-rose-soft", icon: "text-rose-strong" },
  office_leasing: { chip: "bg-navy-100", icon: "text-navy-700" },
  virtual_office: { chip: "bg-accent-100", icon: "text-accent-600" },
};

const HERO_COLLAGE = [
  { src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=900&auto=format&fit=crop", alt: "Bright open coworking floor" },
  { src: "https://images.unsplash.com/photo-1600508774634-4e11d34730e2?q=80&w=900&auto=format&fit=crop", alt: "Premium private office lounge" },
];

export default async function HomePage() {
  const [cities, featured, faqs, channelPartners, operatorCount] = await Promise.all([
    getCities(),
    getFeaturedListings(),
    getFaqs("page", "home"),
    getChannelPartners(12),
    getOperatorCount(),
  ]);
  const heroSearchData = await getPopularLocalities(["coworking", "managed_office", "office_leasing"]);
  const totalSpaces = cities.reduce((n, c) => n + c._count.listings, 0);
  const cityDetails = await Promise.all(CITIES.map((c) => getCity(c.slug)));

  return (
    <>
      <JsonLd data={faqLd(faqs)} />

      {/* ─── Hero ─────────────────────────────────────────────────────
          No overflow-hidden here: the search card's city/suggestion
          popovers need to escape the hero bounds. The gradient layer is
          inset-0 so it cannot bleed. */}
      <div className="relative bg-navy-950 text-cream-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 25%, #10a58c 0, transparent 38%), radial-gradient(circle at 85% 75%, #e8541f 0, transparent 42%), radial-gradient(circle at 60% 10%, #f4b63f 0, transparent 30%)",
          }}
        />
        <Section className="relative pb-16 pt-10 sm:pb-20 sm:pt-12">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold text-teal-400">
                <BadgeCheck className="h-4 w-4" aria-hidden />
                {SITE.heroStat}
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-cream-100 sm:text-5xl lg:text-6xl">
                Your space to <span className="text-accent-400">grow</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-navy-200">
                {SITE.subline} — verified coworking spaces, managed offices and meeting rooms across{" "}
                <strong className="font-semibold text-cream-200">Gurugram, Noida and Delhi</strong>.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-navy-300">Popular:</span>
                {[
                  { label: "Coworking in Gurugram", href: "/coworking-space/gurugram" },
                  { label: "Managed Office in Noida", href: "/managed-office/noida" },
                  { label: "Virtual Office in Delhi", href: "/virtual-office/delhi" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-full border border-navy-700 px-3.5 py-1.5 text-navy-200 transition-colors hover:border-teal-400 hover:text-teal-400">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Photo pair */}
            <div className="relative hidden grid-cols-2 gap-4 lg:grid" aria-hidden>
              {HERO_COLLAGE.map((img, i) => (
                <div
                  key={img.src}
                  className={cn(
                    "relative aspect-[3/4] overflow-hidden rounded-2xl border border-navy-700/60 shadow-pop",
                    i === 1 && "mt-10"
                  )}
                >
                  <Image src={img.src} alt={img.alt} fill sizes="200px" className="object-cover" />
                </div>
              ))}
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-pop">
                <Star className="h-5 w-5 fill-gold-400 text-gold-400" />
                <div className="leading-tight">
                  <p className="font-display text-sm font-bold text-navy-950">4.8/5 client rating</p>
                  <p className="text-xs text-muted">from teams across NCR</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed search — product · city · query */}
          <div className="mt-10 lg:mt-12">
            <HeroSearch data={heroSearchData} />
          </div>
        </Section>
      </div>

      {/* ─── Workspace categories ─────────────────────────────────── */}
      <Section className="py-16 sm:py-20">
        <SectionHeading
          eyebrow="Workspace solutions"
          title="Every way your team works"
          sub="Seven workspace products across NCR — from a single desk to a 2,000-seat campus."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => {
            const Icon = productIcons[p.icon] ?? Building2;
            const hue = productHues[p.type];
            return (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-pop"
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110", hue.chip)}>
                  <Icon className={cn("h-5 w-5", hue.icon)} aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-navy-950">{p.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{p.shortDesc}</p>
                <p className="mt-3 text-sm text-muted">
                  {p.priceOnRequest ? (
                    <span className="font-display font-semibold text-navy-800">Price on request</span>
                  ) : (
                    <>
                      From <span className="font-display font-bold text-accent-600">{p.fromPriceLabel}</span>
                      <span className="text-xs">/{p.unit}</span>
                    </>
                  )}
                </p>
              </Link>
            );
          })}
          <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-teal-700 p-5 text-cream-100">
            <h3 className="font-display text-base font-semibold">Not sure what fits?</h3>
            <p className="mt-1 text-sm text-navy-200">Tell us your team size and budget — we&apos;ll shortlist in minutes.</p>
            <ButtonLink href="#enquire" variant="cream" size="sm" className="mt-4 w-fit">
              Talk to an expert <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* ─── Cities & popular localities (photo cards) ────────────── */}
      <div className="bg-wash">
        <Section className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Micro-markets"
            title="Popular localities across NCR"
            sub="Deep, verified inventory in the districts that matter."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {cityDetails.map(
              (city) =>
                city && (
                  <div key={city.slug} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                    <Link href={`/coworking-space/${city.slug}`} className="group relative block aspect-[16/9]">
                      <Image
                        src={CITY_PHOTOS[city.slug]}
                        alt={`Workspaces in ${city.name}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
                        <div>
                          <h3 className="font-display text-xl font-bold text-cream-100">{city.name}</h3>
                          <p className="text-xs text-navy-200">
                            {city.localities.reduce((n, l) => n + l._count.listings, 0)} verified spaces
                          </p>
                        </div>
                        <span className="rounded-full bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-accent-600">
                          Explore →
                        </span>
                      </div>
                    </Link>
                    <ul className="flex flex-wrap gap-2 p-4">
                      {city.localities
                        .filter((l) => l._count.listings > 0)
                        .sort((a, b) => b._count.listings - a._count.listings)
                        .slice(0, 6)
                        .map((l) => (
                          <li key={l.id}>
                            <Link
                              href={`/coworking-space/${city.slug}/${l.slug}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] text-navy-900 transition-colors hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700"
                            >
                              {l.name}
                              <span className="text-xs text-muted">({l._count.listings})</span>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )
            )}
          </div>
        </Section>
      </div>

      {/* ─── Why Amadhi + stats ───────────────────────────────────── */}
      <Section className="py-16 sm:py-20">
        <SectionHeading eyebrow="Why Amadhi" title="The NCR workspace experts" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: IndianRupee, tone: "bg-teal-100 text-teal-700", title: "Zero brokerage fee", body: "Save on unnecessary costs — operators pay us, you often pay less than walk-in rates. Best price guaranteed." },
            { icon: BadgeCheck, tone: "bg-gold-100 text-gold-500", title: "Verified spaces", body: "Every listing is visited by our team. Photos, pricing and amenities checked against reality — transparent information at every step." },
            { icon: MapPin, tone: "bg-sky-soft text-sky-strong", title: "NCR specialists", body: "Gurugram, Noida and Delhi only. Depth over breadth — tailored recommendations for your business." },
            { icon: Zap, tone: "bg-accent-100 text-accent-600", title: "Single point of contact", body: "One expert end-to-end, <5-min response on WhatsApp. Streamlined and hassle-free." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-pop">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", f.tone)}>
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-navy-950">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>

        {/* stats band */}
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-center sm:grid-cols-4">
          {[
            { n: "100K+", label: "Spaces on one platform", color: "text-teal-400" },
            { n: totalSpaces.toLocaleString("en-IN"), label: "Live spaces across NCR", color: "text-gold-400" },
            { n: `${operatorCount}`, label: "Operator partners", color: "text-accent-400" },
            { n: "₹0", label: "Brokerage, ever", color: "text-cream-100" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-8">
              <p className={cn("font-display text-3xl font-bold", s.color)}>{s.n}</p>
              <p className="mt-1 text-sm text-navy-300">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Channel partners (live, from real inventory) ─────────── */}
      <div className="bg-wash">
        <Section className="py-16">
          <SectionHeading
            eyebrow="Our network"
            title="Our channel partners"
            sub={`${operatorCount} workspace operators list and fill their spaces through Amadhi — every brand below has live inventory on the platform right now.`}
          />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {channelPartners.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/search?operator=${p.slug}`}
                  className="group flex h-28 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-pop"
                >
                  {p.logo ? (
                    <Image
                      src={p.logo}
                      alt={p.name}
                      width={160}
                      height={80}
                      className="max-h-12 w-auto rounded-lg object-contain"
                    />
                  ) : (
                    <span className="text-center font-display text-sm font-semibold leading-tight tracking-wide text-navy-700 group-hover:text-teal-700">
                      {p.name}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-muted">
                    {p.listings} {p.listings === 1 ? "space" : "spaces"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* ─── Featured spaces ──────────────────────────────────────── */}
      <Section className="py-16 sm:py-20">
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured spaces this week"
          sub="High-demand spaces with verified pricing and quick move-in."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 8).map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </Section>

      {/* ─── Testimonials (real clients) ──────────────────────────── */}
      <div className="bg-wash">
        <Section className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Client stories"
            title="Teams that found their space with Amadhi"
            sub="Real reviews from businesses we've placed across Delhi NCR."
          />
          <TestimonialSlider items={TESTIMONIALS} />

          {/* Clients we work with */}
          <div className="mt-12">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted">
              Businesses leveraging Amadhi
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-3">
              {BUSINESS_PARTNERS.filter((p) => p.logo).map((p) => (
                <li
                  key={p.name}
                  className="flex h-14 w-32 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-2 shadow-card"
                >
                  <Image src={p.logo!} alt={p.name} width={110} height={44} className="max-h-full w-auto rounded object-contain" />
                </li>
              ))}
              <li className="flex h-14 items-center rounded-xl border border-dashed border-navy-200 px-4 text-xs font-medium text-muted">
                …plus SAP, Nuvama Wealth &amp; more
              </li>
            </ul>
          </div>
        </Section>
      </div>

      {/* ─── Enterprise band ──────────────────────────────────────── */}
      <Section className="py-16 sm:py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-teal-700">
          <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">Enterprise solutions</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-cream-100 sm:text-3xl">
                50 to 2,000 seats. One accountable partner.
              </h2>
              <p className="mt-3 max-w-lg text-navy-200">
                Managed offices, built-to-suit campuses and long-term leases across NCR. Our
                enterprise desk handles landlord negotiation, fit-out and facilities SLAs —
                with transparent economics.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/office-leasing" variant="cream">Explore office leasing</ButtonLink>
                <ButtonLink href={SITE.phoneHref} variant="outline" className="border-navy-500 text-cream-100 hover:bg-navy-800 hover:border-navy-400">
                  Talk to the enterprise desk
                </ButtonLink>
              </div>
            </div>
            <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl lg:block">
              <Image
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop"
                alt="Modern enterprise office space with large workstation floors"
                fill
                sizes="(max-width: 1024px) 0px, 560px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Enquiry + FAQs ───────────────────────────────────────── */}
      <div className="bg-wash" id="enquire">
        <Section className="grid gap-10 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Get started"
              title="Tell us what you need"
              sub="Two quick steps — no account, no OTP, no spam. A workspace expert responds in minutes."
            />
            <div className="max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
              <EnquiryForm />
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="FAQs" title="Questions, answered" />
            <FaqAccordion items={faqs} />
          </div>
        </Section>
      </div>

      <StickyMobileCta />
    </>
  );
}
