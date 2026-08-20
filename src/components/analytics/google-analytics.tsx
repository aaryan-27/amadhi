import Script from "next/script";

/**
 * Google Analytics 4.
 *
 * Rendered from the root layout, so it loads on every page.
 *
 * The snippet Google hands out is two raw <script> tags for <head>. Pasting
 * those into an App Router layout is unreliable — Next owns <head> and hoists,
 * dedupes and reorders what goes in it — so this uses next/script, which is the
 * supported equivalent. "afterInteractive" is what Next and Google both
 * recommend for gtag: it still fires on the first paint of every route, but
 * loads after hydration so it never blocks rendering.
 *
 * The measurement ID is public by design — it appears in the page source of
 * every GA-tracked site — so keeping it in the repo is safe. NEXT_PUBLIC_GA4_ID
 * overrides it, which is how you point a staging deploy at a separate property.
 */
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "G-RJLJVRJQ1G";

export function GoogleAnalytics() {
  if (!GA4_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');
        `.trim()}
      </Script>
    </>
  );
}
