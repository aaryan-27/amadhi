import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { SITE, waLink } from "@/lib/site";
import { Section, SectionHeading, Breadcrumbs } from "@/components/ui/primitives";
import { EnquiryForm } from "@/components/forms/lead-forms";
import { JsonLd, breadcrumbLd, organizationLd } from "@/components/seo/jsonld";

const LeafletMap = dynamic(() => import("@/components/listing/leaflet-map"));

export const metadata: Metadata = {
  title: "Contact Amadhi — Talk to an NCR Workspace Expert",
  description:
    "Reach Amadhi on phone, WhatsApp or email. Office on MG Road, Gurugram. Response in under 5 minutes during business hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const crumbs = [{ name: "Home", href: "/" }, { name: "Contact" }];
  return (
    <>
      <JsonLd data={[breadcrumbLd(crumbs), organizationLd()]} />
      <Section className="py-12">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          eyebrow="Contact"
          title="Talk to a workspace expert"
          sub="WhatsApp is fastest — we respond in under 5 minutes during business hours (9am–8pm, Mon–Sat)."
        />

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <ul className="space-y-4">
              <li>
                <a href={SITE.phoneHref} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-pop" data-gtm="call-click-contact">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100"><Phone className="h-5 w-5 text-teal-700" aria-hidden /></span>
                  <span>
                    <span className="block font-display font-semibold text-navy-950">{SITE.phone} · {SITE.phone2}</span>
                    <span className="text-sm text-muted">{SITE.hours}</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={waLink("Hi Amadhi! I have a question about workspaces.")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-pop" data-gtm="whatsapp-click-contact">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#128c4b]/10"><MessageCircle className="h-5 w-5 text-[#128c4b]" aria-hidden /></span>
                  <span>
                    <span className="block font-display font-semibold text-navy-950">WhatsApp us</span>
                    <span className="text-sm text-muted">Fastest response — typically &lt;5 minutes</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-pop">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream-100"><Mail className="h-5 w-5 text-navy-900" aria-hidden /></span>
                  <span>
                    <span className="block font-display font-semibold text-navy-950">{SITE.email}</span>
                    <span className="text-sm text-muted">For proposals, partnerships and press</span>
                  </span>
                </a>
              </li>
              <li className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-100"><MapPin className="h-5 w-5 text-navy-900" aria-hidden /></span>
                <span>
                  <span className="block font-display font-semibold text-navy-950">Amadhi HQ</span>
                  <span className="text-sm text-muted">
                    {SITE.address.line1}, {SITE.address.line2},<br />
                    {SITE.address.city}, {SITE.address.state} {SITE.address.pincode}
                  </span>
                </span>
              </li>
            </ul>
            <div className="h-72 overflow-hidden rounded-2xl border border-line">
              <LeafletMap
                markers={[{ lat: SITE.address.lat, lng: SITE.address.lng, label: "Amadhi HQ" }]}
                zoom={15}
                className="h-72 w-full"
              />
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="mb-1 font-display text-lg font-semibold text-navy-950">Send us a message</h2>
              <p className="mb-5 flex items-center gap-1.5 text-sm text-muted">
                <Clock className="h-4 w-4" aria-hidden /> We reply within one business hour.
              </p>
              <EnquiryForm leadType="contact" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
