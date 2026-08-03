"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Share2, Check, Phone, MessageCircle, Heart } from "lucide-react";
import { store, subscribeStore } from "@/lib/store";
import { EnquiryForm, VisitForm, MeetingRoomForm } from "@/components/forms/lead-forms";
import { StickyMobileCta } from "@/components/listing/sticky-mobile-cta";
import { SITE, waLink } from "@/lib/site";
import { cn, formatINR } from "@/lib/utils";

/* Track recently-viewed on mount (localStorage, account-free) */
export function RecentTracker(props: {
  slug: string; name: string; locality: string; city: string;
  image: string | null; fromPrice: number | null;
}) {
  useEffect(() => {
    store.pushRecent(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.slug]);
  return null;
}

/* Gallery with thumbnail strip */
export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-navy-100">
        <Image
          src={images[active].url}
          alt={images[active].alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
        />
      </div>
      <div className="mt-2.5 grid grid-cols-5 gap-2.5" role="group" aria-label="Photo gallery thumbnails">
        {images.slice(0, 5).map((img, i) => (
          <button
            key={img.url}
            type="button"
            aria-label={`Show photo ${i + 1}: ${img.alt}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-colors",
              i === active ? "border-accent-500" : "border-transparent opacity-80 hover:opacity-100"
            )}
          >
            <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* Sticky enquiry card with Enquire / Visit / Meeting-room tabs */
export function EnquiryCard({
  listing,
}: {
  listing: {
    slug: string; name: string; capacity: number; openDays: string;
    openingTime: string; closingTime: string; fromPrice: number | null;
    fromPeriod: string | null; hasMeetingRoom: boolean;
  };
}) {
  const [tab, setTab] = useState<"enquire" | "visit" | "room">("enquire");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setSaved(store.has("wishlist", listing.slug));
    sync();
    return subscribeStore(sync);
  }, [listing.slug]);

  const hours =
    listing.openDays === "24×7" ? "Open 24×7" : `${listing.openDays} · ${listing.openingTime}–${listing.closingTime}`;

  return (
    <div id="enquire" className="rounded-2xl border border-line bg-white shadow-pop">
      <div className="border-b border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {listing.fromPrice ? (
              <p className="text-sm text-muted">
                From{" "}
                <span className="font-display text-2xl font-bold text-navy-950">{formatINR(listing.fromPrice)}</span>
                <span className="text-xs">/{listing.fromPeriod === "hour" ? "hour" : "month"}</span>
              </p>
            ) : (
              <p className="font-display text-lg font-semibold text-navy-950">Price on request</p>
            )}
            <p className="mt-1 text-xs text-muted">
              Capacity {listing.capacity} · {hours}
            </p>
          </div>
          <button
            type="button"
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={saved}
            onClick={() =>
              store.toggle("wishlist", {
                slug: listing.slug, name: listing.name, locality: "", city: "",
                image: null, fromPrice: listing.fromPrice,
              })
            }
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line",
              saved ? "text-accent-500" : "text-navy-600 hover:text-accent-500"
            )}
          >
            <Heart className={cn("h-5 w-5", saved && "fill-accent-500")} aria-hidden />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={SITE.phoneHref}
            data-gtm="call-click-detail"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-navy-200 text-sm font-semibold text-navy-900 hover:border-navy-400"
          >
            <Phone className="h-4 w-4" aria-hidden /> Call
          </a>
          <a
            href={waLink(`Hi Amadhi! I'm interested in ${listing.name}. Please share details.`)}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="whatsapp-click-detail"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#128c4b] text-sm font-semibold text-white hover:bg-[#0f7a41]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
          </a>
        </div>
      </div>

      <div role="tablist" aria-label="Contact options" className="flex border-b border-line">
        {(
          [
            ["enquire", "Enquire"],
            ["visit", "Book a Visit"],
            ...(listing.hasMeetingRoom ? [["room", "Meeting Room"] as const] : []),
          ] as [string, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key as typeof tab)}
            className={cn(
              "flex-1 px-2 py-3 text-sm font-medium transition-colors min-h-[44px]",
              tab === key
                ? "border-b-2 border-accent-500 text-navy-950"
                : "text-muted hover:text-navy-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5" role="tabpanel">
        {tab === "enquire" && <EnquiryForm listingSlug={listing.slug} compact />}
        {tab === "visit" && <VisitForm listingSlug={listing.slug} />}
        {tab === "room" && <MeetingRoomForm listingSlug={listing.slug} />}
      </div>
    </div>
  );
}

/* Share (WhatsApp / copy link) */
export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          const url = window.location.href;
          if (navigator.share) {
            try { await navigator.share({ title: name, url }); return; } catch { /* cancelled */ }
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-navy-900 hover:border-navy-400"
      >
        {copied ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
        {copied ? "Link copied" : "Share"}
      </button>
      <a
        href={waLink(`Check out this workspace: ${name}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-medium text-navy-900 hover:border-navy-400"
      >
        Share on WhatsApp
      </a>
    </div>
  );
}

export function DetailStickyCta({ name }: { name: string }) {
  return <StickyMobileCta listingName={name} />;
}
