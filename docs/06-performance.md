# Performance Optimization Plan

**Targets:** Lighthouse ≥95 mobile · LCP <2.0s · CLS <0.05 · INP <200ms · <150KB critical JS.

## Already implemented

| Lever | Implementation |
|---|---|
| Rendering | RSC-first; SSG for hubs/city/detail pages via `generateStaticParams`; ISR 60s (listings) / 300s (blog); only `/search` fully dynamic |
| JS budget | Shared first-load ~103 kB; heaviest route 138 kB. Leaflet, Tiptap, forms all dynamically imported or admin-only; Framer Motion avoided in favour of CSS transitions |
| Images | `next/image` AVIF/WebP, explicit `sizes`, aspect-ratio boxes on every image (zero CLS), `priority` only on LCP hero/gallery, Unsplash/Cloudinary auto-format |
| Fonts | Two families self-hosted via `next/font` (zero external requests), `display: swap`, subset latin |
| Caching | Cloudflare edge caching for static assets + HTML (respecting ISR headers); autocomplete responses `s-maxage=120`; Next data cache + React `cache()` dedupes queries per render |
| No Redis | In-memory rate limiting + ISR keeps the stack single-process; Postgres indexes carry query load |
| CLS | Fixed-height header, aspect-ratio media, skeleton loaders sized to content |
| Analytics | Deferred via GTM only after consent/config; Meta Pixel prepared but disabled |

## Budgets (CI-enforceable via Lighthouse CI, see `09-testing.md`)

- HTML ≤ 60 kB gzipped per page
- Critical JS ≤ 150 kB; per-route chunk ≤ 40 kB
- LCP image ≤ 120 kB (Cloudinary `f_auto,q_auto,w_1600`)
- Fonts ≤ 2 families / ≤ 120 kB total
- Third-party scripts: GTM only (loads GA4/Clarity async post-LCP)

## VPS-side

- Nginx: brotli/gzip, `expires max` on `/_next/static`, HTTP/2
- PM2 single instance (8 GB RAM: Node ~1.5 GB, Postgres ~1 GB, headroom for builds); `NODE_OPTIONS=--max-old-space-size=2048`
- Build on GitHub Actions, rsync `.next` to VPS → CPU never spent building in production
- Postgres: `shared_buffers=1GB`, `effective_cache_size=3GB`; indexes on every hot path (slugs, status composites, GIN trigram)

## Monitoring

UptimeRobot (free) for availability; CrUX API for field CWV (surfaced in admin SEO notes); `pm2 monit` + `pg_stat_statements` for server-side regressions.
