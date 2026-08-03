import type { Metadata } from "next";
import { Section } from "@/components/ui/primitives";
import { CompareClient } from "./compare-client";

export const metadata: Metadata = {
  title: "Compare Workspaces Side by Side",
  description: "Compare up to 3 shortlisted workspaces across price, amenities, capacity and ratings.",
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <Section className="py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-navy-950">Compare workspaces</h1>
      <p className="mb-8 max-w-xl text-muted">
        Your shortlist, side by side. Add up to 3 spaces from any listing page — saved on this
        device, no account needed.
      </p>
      <CompareClient />
    </Section>
  );
}
