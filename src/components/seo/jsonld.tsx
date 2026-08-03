import { SITE } from "@/lib/site";

/** Renders a JSON-LD script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.domain,
  logo: `${SITE.domain}/brand/icon.png`,
  slogan: SITE.tagline,
  email: SITE.email,
  telephone: SITE.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${SITE.address.line1}, ${SITE.address.line2}`,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.state,
    postalCode: SITE.address.pincode,
    addressCountry: "IN",
  },
  sameAs: Object.values(SITE.social),
});

export const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.domain,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE.domain}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

export const breadcrumbLd = (items: { name: string; href?: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    ...(item.href ? { item: `${SITE.domain}${item.href}` } : {}),
  })),
});

export const faqLd = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
});

export const localBusinessLd = (opts: {
  name: string;
  url: string;
  image?: string;
  lat: number;
  lng: number;
  street: string;
  locality: string;
  region: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: opts.name,
  url: `${SITE.domain}${opts.url}`,
  ...(opts.image ? { image: opts.image } : {}),
  priceRange: opts.priceRange ?? "₹₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: opts.street,
    addressLocality: opts.locality,
    addressRegion: opts.region,
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: opts.lat, longitude: opts.lng },
  ...(opts.rating && opts.reviewCount
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: opts.rating,
          reviewCount: opts.reviewCount,
          bestRating: 5,
        },
      }
    : {}),
});

export const articleLd = (opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: opts.title,
  description: opts.description,
  mainEntityOfPage: `${SITE.domain}${opts.url}`,
  ...(opts.image ? { image: opts.image } : {}),
  datePublished: opts.datePublished,
  dateModified: opts.dateModified,
  author: { "@type": "Person", name: opts.authorName },
  publisher: {
    "@type": "Organization",
    name: SITE.name,
    logo: { "@type": "ImageObject", url: `${SITE.domain}/brand/icon.png` },
  },
});

export const productOfferLd = (opts: {
  name: string;
  description: string;
  url: string;
  offers: { name: string; price: number; period: string }[];
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: opts.name,
  description: opts.description,
  url: `${SITE.domain}${opts.url}`,
  offers: opts.offers.map((o) => ({
    "@type": "Offer",
    name: o.name,
    price: o.price,
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
  })),
});
