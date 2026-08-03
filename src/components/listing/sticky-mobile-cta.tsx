"use client";

import { Phone, Send } from "lucide-react";
import { SITE } from "@/lib/site";

/** Persistent bottom action bar on listing & detail pages (mobile only). */
export function StickyMobileCta({
  onEnquire,
}: {
  /** Accepted for call-site context; WhatsApp messaging now lives in the
      floating button, so the bar itself doesn't need the listing name. */
  listingName?: string;
  onEnquire?: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-line bg-white/95 p-2.5 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      {/* WhatsApp intentionally omitted — it lives in the floating button so
          the two never duplicate each other on mobile. */}
      <a
        href={SITE.phoneHref}
        className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-navy-200 text-sm font-semibold text-navy-900"
        data-gtm="call-click-sticky"
      >
        <Phone className="h-4 w-4" aria-hidden /> Call
      </a>
      {onEnquire ? (
        <button
          type="button"
          onClick={onEnquire}
          className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent-500 text-sm font-semibold text-white"
        >
          <Send className="h-4 w-4" aria-hidden /> Enquire
        </button>
      ) : (
        <a
          href="#enquire"
          className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent-500 text-sm font-semibold text-white"
        >
          <Send className="h-4 w-4" aria-hidden /> Enquire
        </a>
      )}
    </div>
  );
}
