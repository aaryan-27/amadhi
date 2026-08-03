# Future Roadmap

## Phase 1.5 — Admin depth (2–4 weeks)
- Listing CRUD completion: Cloudinary media library (folders, signed uploads, crop), plan/price editor, amenity picker, Leaflet lat/lng picker, FAQ editor, SEO overrides (SeoMeta), related-listing curation, brochure upload
- Blog: scheduling, version history, internal-link suggester, OG image fields, tag manager
- Lead management: notes UI, follow-up reminders (Notification cron), call logs, company/customer views
- SEO dashboard: Search Console API integration, missing-meta/alt audits, broken-link crawler, schema validator, CrUX widget
- Admin user management (invite/deactivate/role change)
- Email notifications on new leads via Hostinger SMTP/Brevo

## Phase 2 — Monetisation & scale (quarter 2)
- **Razorpay** for meeting-room prepayment (`MeetingRoomRequest.paymentId` already reserved); refunds + webhook reconciliation
- **WhatsApp Business API** (Cloud API): templated lead confirmations + SLA nudges, replacing wa.me for outbound
- **Meilisearch** self-hosted: implement `MeilisearchService` behind the existing `SearchService` interface (typo tolerance, synonyms "CP"→"Connaught Place", facet counts)
- Availability calendar goes live-inventory (AvailabilitySlot admin + real-time hold)
- Operator portal (scoped role): operators update their own pricing/photos → moderation queue

## Phase 3 — Marketplace network effects
- User accounts (optional, still not required to convert): saved searches, cross-device wishlist, enquiry history
- More NCR micro-markets (Faridabad, Ghaziabad/Indirapuram, Greater Noida West, Dwarka Expressway, New Gurugram sectors) — same city model; the 3-city constraint is a Phase-1/2 product decision, and each new market must clear the ≥3-verified-listings gate before indexing
- Pricing intelligence: quarterly micro-market reports auto-generated from Price history (programmatic linkable assets)
- Reviews v2: operator responses, photo reviews, verified-visit badge (link Review→VisitBooking)
- A/B testing via GrowthBook (self-hosted, free) on CTA copy and enquiry-form order

## Infrastructure scale path (only when needed)
1 VPS → PM2 cluster mode + Redis (rate limits/session cache) → managed Postgres → second app node behind Cloudflare load balancing. The single-app monolith remains valid well past 1M monthly visits with ISR + edge caching.
