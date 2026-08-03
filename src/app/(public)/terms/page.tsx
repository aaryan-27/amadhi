import type { Metadata } from "next";
import { Section } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms governing the use of Amadhi.com.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Section className="py-12">
      <h1 className="font-display text-3xl font-bold text-navy-950">Terms of Use</h1>
      <div className="prose-amadhi mt-6">
        <p>Last updated: July 2026</p>
        <h2>Our service</h2>
        <p>
          Amadhi.com is a workspace discovery marketplace for Gurugram, Noida and Delhi. We connect
          workspace seekers with operators; the workspace agreement is always between you and the
          operator. Amadhi charges seekers no brokerage or fees.
        </p>
        <h2>Listings & pricing</h2>
        <p>
          Listing information is verified at the time of publication and refreshed regularly, but
          availability and pricing are ultimately confirmed by the operator at the time of enquiry.
          Prices shown are indicative rack rates exclusive of GST unless stated otherwise.
        </p>
        <h2>Bookings</h2>
        <p>
          Visit bookings and meeting-room requests made on Amadhi are requests, not confirmed
          reservations, until confirmed by our team or the operator.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Do not submit false enquiries, scrape the site, or misuse contact channels. We may block
          access for abuse.
        </p>
        <h2>Liability</h2>
        <p>
          Amadhi acts as an introduction platform and is not liable for the acts or omissions of
          workspace operators. Nothing on this site constitutes legal, tax or investment advice.
        </p>
      </div>
    </Section>
  );
}
