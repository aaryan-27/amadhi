import type { Metadata } from "next";
import { Section } from "@/components/ui/primitives";
import { WishlistClient } from "./wishlist-client";

export const metadata: Metadata = {
  title: "Your Wishlist & Recently Viewed",
  description: "Spaces you've saved and recently viewed — stored on this device, no account needed.",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <Section className="py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-navy-950">Saved spaces</h1>
      <p className="mb-8 max-w-xl text-muted">
        Your wishlist and recently viewed spaces live on this device — private, account-free.
      </p>
      <WishlistClient />
    </Section>
  );
}
