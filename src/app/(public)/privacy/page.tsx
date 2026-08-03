import type { Metadata } from "next";
import { Section } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Amadhi collects, uses and protects your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Section className="py-12">
      <h1 className="font-display text-3xl font-bold text-navy-950">Privacy Policy</h1>
      <div className="prose-amadhi mt-6">
        <p>Last updated: July 2026</p>
        <h2>What we collect</h2>
        <p>
          Amadhi has no user accounts. We collect only what you actively submit: your name, phone
          number, email and workspace requirement when you send an enquiry, book a visit, request a
          meeting room, download a brochure or submit a review. Wishlist, recently-viewed and
          compare data never leave your device — they are stored in your browser&apos;s localStorage.
        </p>
        <h2>How we use it</h2>
        <p>
          Submitted details are used solely to respond to your request, connect you with relevant
          workspace operators, and improve our service. We never sell your data. Analytics (Google
          Analytics 4, Microsoft Clarity) are collected in aggregate to improve the site.
        </p>
        <h2>Sharing</h2>
        <p>
          We share your requirement with a workspace operator only when needed to fulfil your
          enquiry — for example, to confirm availability or schedule your visit.
        </p>
        <h2>Retention & rights</h2>
        <p>
          You may request access to or deletion of your lead data at any time by writing to
          hello@amadhi.com. We retain enquiry records for up to 24 months.
        </p>
        <h2>Contact</h2>
        <p>Questions? Email hello@amadhi.com.</p>
      </div>
    </Section>
  );
}
