"use client";

import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/site";

/**
 * Floating WhatsApp action. Sits above the mobile sticky CTA bar so the two
 * never overlap, and stays out of the way of the compare tray.
 */
export function FloatingWhatsApp() {
  return (
    <a
      href={waLink("Hi Amadhi! I'm looking for a workspace in Delhi NCR.")}
      target="_blank"
      rel="noopener noreferrer"
      data-gtm="whatsapp-click-floating"
      aria-label="Chat with Amadhi on WhatsApp"
      className="group fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition-transform hover:scale-105 focus-visible:scale-105 md:right-6"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <MessageCircle className="h-7 w-7" aria-hidden />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-cream-100 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 md:block">
        Chat on WhatsApp
      </span>
    </a>
  );
}
