import type { Metadata } from "next";
import { Target, Eye, HeartHandshake, Phone, MessageCircle, Mail } from "lucide-react";
import { Section, SectionHeading, Breadcrumbs, ButtonLink } from "@/components/ui/primitives";
import { JsonLd, breadcrumbLd } from "@/components/seo/jsonld";
import { SITE, waLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Amadhi — The NCR Workspace Experts",
  description:
    "Amadhi is Delhi NCR's premium workspace marketplace. Our mission: make finding an office in Gurugram, Noida and Delhi as effortless as booking a hotel.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const crumbs = [{ name: "Home", href: "/" }, { name: "About" }];
  return (
    <>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <div className="bg-navy-950 text-cream-100">
        <Section className="py-16 sm:py-20">
          <Breadcrumbs items={crumbs} className="mb-5 text-navy-300 [&_a:hover]:text-cream-100 [&_[aria-current]]:text-cream-100" />
          <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">
            Finding an office in NCR shouldn&apos;t take 40 phone calls.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-200">
            Amadhi exists to make workspace discovery in Gurugram, Noida and Delhi transparent,
            fast and free — honest pricing, deep local inventory, and experts who negotiate for you,
            not against you.
          </p>
        </Section>
      </div>

      <Section className="py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: "Mission", body: "Help every business in Delhi NCR find its perfect workspace — with zero brokerage, zero pressure and a response time measured in minutes." },
            { icon: Eye, title: "Vision", body: "Become the definitive workspace platform for NCR: the deepest inventory, the sharpest market data, the most trusted advice." },
            { icon: HeartHandshake, title: "Values", body: "Depth over breadth. Transparency over spin. The seeker's interest first — because operators pay us only when you're genuinely happy." },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border border-line bg-white p-7 shadow-card">
              <v.icon className="h-6 w-6 text-accent-500" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-semibold text-navy-950">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-wash">
        <Section className="py-16">
          <SectionHeading eyebrow="Our story" title="Built for NCR teams, street by street" />
          <div className="prose-amadhi max-w-3xl">
            <p>
              Amadhi started from a simple frustration: finding an office in Delhi NCR means stale
              listings, pricing nobody will put in writing, and brokers optimising for their fee
              rather than the fit.
            </p>
            <p>
              We decided the fix wasn&apos;t another national aggregator; it was a deeply local
              marketplace that does the unfashionable things — publishing real prices, keeping
              inventory current, and staying focused on the three cities we know street by street:
              Gurugram, Noida and Delhi.
            </p>
            <p>
              Today Amadhi works with NCR&apos;s leading workspace operators and helps teams from
              solo founders to large enterprises find, compare and negotiate their space — always
              free for the seeker.
            </p>
          </div>
        </Section>
      </div>

      {/* Talk to the team — real contact details, no invented bios */}
      <Section className="py-16">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-teal-700 p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">Talk to us</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-cream-100 sm:text-3xl">
                Speak to an NCR workspace expert
              </h2>
              <p className="mt-3 max-w-lg text-navy-200">
                Tell us your team size, budget and preferred micro-market — we&apos;ll shortlist
                options and arrange visits. Zero brokerage, and a reply within minutes during
                business hours ({SITE.hours}).
              </p>
              <ul className="mt-5 space-y-2 text-sm text-navy-200">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-cream-200" aria-hidden />
                  <a href={SITE.phoneHref} className="hover:text-cream-100">{SITE.phone}</a>
                  <span className="text-navy-400">·</span>
                  <a href={SITE.phone2Href} className="hover:text-cream-100">{SITE.phone2}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-cream-200" aria-hidden />
                  <a href={`mailto:${SITE.email}`} className="hover:text-cream-100">{SITE.email}</a>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact" variant="cream">Contact us</ButtonLink>
              <ButtonLink
                href={waLink("Hi Amadhi! I'd like help finding a workspace in Delhi NCR.")}
                variant="whatsapp"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
