# Testing Strategy

## Layers

1. **Static:** `tsc --noEmit` + ESLint (`next lint`) — already gating `next build`; runs in CI on every push.
2. **Unit (Vitest — free):** pure logic first: `lib/validation.ts` (phone regex, honeypot/dwell), `lib/utils.ts` (slugify, INR formatting, read time), `lib/queries.ts` price-preference logic (`toCard` must never headline a sq-ft or virtual-office price when seat plans exist), rate limiter window behaviour.
3. **Integration:** API route handlers against a seeded SQLite database — lead creation resolves slugs→ids and sets `slaDueAt`; visit/room requests create both operational row + pipeline Lead; review always lands `pending`; spam (filled honeypot / fast submit) returns fake success and writes nothing; rate limiter 429s.
4. **E2E (Playwright — free):**
   - Enquiry happy path: home → 2-step form → success state → row visible in admin kanban after login.
   - Visit booking from detail page tabs.
   - Compare: add 3 cards → tray → comparison table renders amenities matrix; 4th add is refused.
   - Wishlist/recently-viewed survive reload (localStorage).
   - Search autocomplete keyboard navigation (↓ ↵ navigates to locality page).
   - Filters sync to URL and survive back/forward.
   - Admin RBAC: sales role sees Leads but not Settings; unauthenticated /admin redirects to login.
   - Locality quality gate: <3-listing locality serves `noindex` meta.
5. **Lighthouse CI (free):** budget assertions (perf ≥95 mobile, LCP <2s, CLS <0.05, total JS <150 kB) on `/`, one city page, one detail page — fails the PR on regression.

## Suggested CI pipeline

```yaml
lint+types → unit (vitest) → prisma db push + seed (sqlite) →
integration → build → playwright (against `next start`) → lhci autorun
```

## Manual QA checklist (already executed on this build)

- ✅ `next build` clean — 121 pages, first-load JS 103–138 kB
- ✅ All 21 key routes return 200 (smoke script)
- ✅ Lead POST + search autocomplete verified via API
- ✅ Admin login → dashboard → kanban verified in browser
- ✅ Headline-price logic fixed & re-verified (seat plans beat VO/sq-ft prices)
- ✅ Mobile sticky CTA, mega menu, city page, detail page visually QA'd
