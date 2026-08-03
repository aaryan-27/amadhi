# Architecture — Single-VPS Topology

One deployable Next.js 15 app (App Router, TypeScript) serves the public site, the admin dashboard and all APIs. No separate backend service — fits one Hostinger KVM VPS (2 vCPU / 8 GB).

## Topology

```mermaid
flowchart TB
  subgraph Internet
    U[Visitors] --> CF[Cloudflare Free\nDNS · CDN · WAF · caching]
    GSC[Googlebot] --> CF
  end
  subgraph VPS[Hostinger KVM VPS — Ubuntu 22.04]
    CF --> NG[Nginx reverse proxy\nTLS via Certbot, gzip/brotli]
    NG --> PM[PM2 → Next.js :3000\nSSR + ISR + API routes + Server Actions]
    PM --> PG[(PostgreSQL 16\npg_trgm + tsvector)]
    CRON[cron: nightly pg_dump\n→ R2/second dir] --> PG
  end
  PM --> CLD[Cloudinary free tier\nf_auto/q_auto images]
  PM --> SMTP[Hostinger SMTP / Brevo free\ntransactional email]
  U -.wa.me / tel: deep links.-> WA[WhatsApp / Phone]
  GH[GitHub Actions free\nbuild + deploy over SSH] --> VPS
  UR[UptimeRobot free] -.monitors.-> NG
```

## App layering

```
src/
  app/(public)/…        Public pages — RSC-first, ISR 60s on listing-bearing pages
  app/admin/…           Auth.js-guarded admin (login public, (dashboard) group guarded)
  app/api/v1/…          REST route handlers (Zod-validated, rate-limited)
  app/sitemap.ts        DB-driven sitemap with locality quality gate
  components/           ui / layout / listing / forms / seo
  lib/
    db.ts               Prisma singleton
    queries.ts          All public read paths (React cache() + card mapper)
    search.ts           SearchService interface → PrismaContains | PgTrgm impls
    auth.ts             NextAuth config + RBAC helper (canAccess)
    validation.ts       Zod schemas + anti-spam helpers
    rate-limit.ts       In-memory sliding window (single-process OK under PM2)
    store.ts            Client localStorage store (wishlist/recent/compare) + UTM capture
  data/product-content.ts  Product-page marketing content
prisma/
  schema.prisma          Dev schema (SQLite) — model-identical to prod
  schema.postgres.prisma Production schema (PostgreSQL 16)
  postgres-fts.sql       pg_trgm + tsvector setup (run once on prod)
  seed.ts                Deterministic NCR seed (3 cities, 22 localities, 47 listings…)
```

## Key decisions

1. **One app, not app+NestJS** — Server Actions/route handlers cover admin mutations and public APIs; halves memory footprint and deploy surface.
2. **SearchService interface** — `autocomplete()` behind an interface; `SEARCH_ENGINE=postgres` env flips from Prisma-contains (dev) to raw pg_trgm similarity SQL (prod). Meilisearch later = one new class, zero caller changes.
3. **SQLite dev / Postgres prod** — identical models (enum-like fields are strings validated by Zod; JSON payloads in `*Json` string columns so both providers behave identically). Deployment guide covers the swap.
4. **ISR everywhere public** — `revalidate = 60` on listing-bearing pages, 300 on blog; DB hit per page per minute max, the rest served static from Nginx/Cloudflare.
5. **No Redis** — Next.js data cache + ISR + in-memory rate limiter; single-process PM2 (`instances: 1`) keeps memory coherent. Scale path: PM2 cluster + Redis rate limiting.
6. **localStorage user state** — hard constraint honoured: wishlist/recent/compare never touch the server; a tiny pub-sub keeps all mounted components in sync.
7. **Leads are the spine** — every conversion (enquiry/visit/room/brochure/partner/notify/contact) lands in the `Lead` table with UTM JSON, SLA due date and pipeline status; VisitBooking/MeetingRoomRequest keep their own operational records linked to the same listing.
8. **Future Razorpay** — `MeetingRoomRequest.paymentId` nullable column reserved.

## Database schema

See `prisma/schema.prisma` (source of truth). 27 models: City, Locality, Operator, Listing, ListingImage, Amenity, ListingAmenity, Plan, Price, AvailabilitySlot, Company, Lead, VisitBooking, MeetingRoomRequest, Review, Author, BlogCategory, Tag, BlogPost, BlogPostTag, Media, Faq (polymorphic via entityType/entityId), SeoMeta, Role, AdminUser, ActivityLog, Notification, Setting. Indexed on slugs, status+geo composites, and (prod) GIN trigram + tsvector columns via `postgres-fts.sql`. **No end-user User table.**
