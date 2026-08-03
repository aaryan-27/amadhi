# SEO Strategy & Technical Implementation

## Strategy

**Programmatic depth over breadth.** The `/{product}/{city}/{locality}` lattice (7 × 3 × 22) targets high-intent queries like "coworking space in cyber city" while a strict quality gate keeps thin pages out of the index. Blog + author pages build EEAT; internal-link modules on every template push equity down to listings and across products.

### Keyword → template mapping

| Intent | Query pattern | Template |
|---|---|---|
| Category | "coworking space delhi ncr" | Product hub `/{product}` |
| City | "managed office noida" | `/{product}/{city}` |
| Micro-market (money) | "coworking cyber city" | `/{product}/{city}/{locality}` |
| Brand/space | "workline cyber city price" | `/spaces/{slug}` |
| Informational | "virtual office gst delhi" | Blog → internal links to money pages |

### Quality gate (implemented)
A locality page is indexed **only when it has ≥3 live listings** (`LOCALITY_INDEX_THRESHOLD`); below that it serves `noindex,follow` with a canonical rolling up to the city page, and is excluded from the sitemap. This prevents programmatic thin-content penalties while the empty page still converts via notify-me.

## Technical implementation (all live in code)

- **Metadata:** Next Metadata API on every route — dynamic titles/descriptions with price/count data, self-referencing canonicals, OG + Twitter cards, `metadataBase`.
- **JSON-LD** (`src/components/seo/jsonld.tsx`): Organization + WebSite/SearchAction (site-wide), BreadcrumbList (every templated page), LocalBusiness (city/locality/listing w/ geo + AggregateRating), Product+Offer (listing plans), FAQPage (home/product/city/locality/listing), Article + Person (blog/authors).
- **Sitemaps:** `app/sitemap.ts` — DB-driven, real `lastmod`, quality-gated localities, priorities tiered hub→city→locality→listing→blog.
- **Robots:** `app/robots.ts` — disallows `/admin`, `/api/`, `/search`, `/compare`, `/wishlist`.
- **Internal linking modules:** header mega-menu + city dropdown; footer directory + popular-searches strip; city pages link hub ↑ / localities ↓ / sibling cities ↔ / other products; locality pages link related localities + same-locality other products; listings link back to locality and related spaces; blog posts get a tag-driven "Find {product} in {city}" module.
- **Pagination:** real `<a>` links with `rel=prev/next`, URL-synced filters (shareable, crawlable).
- **Images:** descriptive alt text from structured data ("{name} — open seating area"), `next/image` lazy below fold, priority on LCP images.
- **Content freshness:** ISR (60s) keeps counts/median prices near-live; sitemap `lastmod` from `updatedAt`.

## Operating playbook (post-launch)

1. Verify domain in Search Console; submit sitemap; monitor coverage weekly from the admin SEO notes.
2. Publish 2 blog posts/week alternating money-adjacent (pricing reports) and informational; every post links to ≥2 money pages via the tag module.
3. Raise locality inventory to ≥3 before marketing a micro-market (gate flips indexing automatically).
4. Watch CWV in CrUX; the performance budget in `06-performance.md` is the guardrail.
5. NAP consistency: footer + contact page + Organization schema all read from `src/lib/site.ts` — single source of truth.
