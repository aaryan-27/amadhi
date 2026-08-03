# Amadhi Design System

Derived from the official brand guidelines (deep midnight navy + warm cream lettermark + terracotta accents). Inspiration tier: Stripe/Linear restraint, Airbnb usability, Apple whitespace. One confident accent, no flashy gradients.

## 1. Color Tokens (Tailwind v4 `@theme`, defined in `src/app/globals.css`)

| Token | Hex | Usage |
|---|---|---|
| `navy-950` | `#040C1E` | Brand base — heroes, footer, admin bg, primary dark buttons |
| `navy-900…navy-50` | scale | Dark-surface elevations → light washes/borders |
| `cream-200` | `#F4E3D1` | Brand cream — logo field, dark-surface text, accents |
| `cream-100/50` | `#F9EFE2/#FCF7EF` | Icon chips, soft fills |
| `accent-500` | `#C24E2E` | The one accent — primary CTAs, active states, links |
| `accent-600/700` | darker | Hover/active |
| `ink` | `#0B1220` | Body text on light |
| `muted` | `#55607A` | Secondary text (4.5:1 on white) |
| `line` | `#E6E2D9` | Warm hairline borders |
| `wash` | `#FAF7F1` | Alternating section background |
| `success/warning/danger` | `#1D7A4F/#B0761A/#B3392B` | Status |

WhatsApp CTAs use `#128c4b` (recognisable, AA-compliant on white).

## 2. Typography

- **Display — Poppins** (500/600/700, self-hosted via `next/font`, `display: swap`): headings, prices, stats. Matches the rounded geometric letterforms in the brochure.
- **Body — Inter** (variable): everything else.
- Scale: 12 / 13 / 14(base) / 15 / 16 / 18 / 20 / 24 / 30 / 36 / 48-60(hero). Line-height 1.5–1.75 body, 1.1–1.2 display. Letter-spacing −0.01em on display.

## 3. Shape, Elevation, Motion

- Radii: `rounded-full` for buttons/chips/inputs, `rounded-2xl` (1rem) cards, `rounded-3xl` bands.
- Shadows: `shadow-card` (subtle) → `shadow-pop` (hover/overlays). Never harsh.
- Motion: 150–300ms color/transform transitions; card hover lift ≤2px + image scale 1.05; `prefers-reduced-motion` kills all.

## 4. Component Library (all built, see `src/components/`)

| Component | File | Notes |
|---|---|---|
| Navbar + MegaMenu + city dropdown | `layout/header.tsx` | Sticky, blur, inline expanding search, mobile drawer |
| Footer directory | `layout/footer.tsx` | 4-col + popular-searches SEO strip; Admin link footer-only |
| SearchBar | `layout/search-bar.tsx` | Debounced autocomplete grouped Localities/Spaces/Operators, full keyboard nav (combobox ARIA) |
| ListingCard | `listing/listing-card.tsx` | 4:3 image (zero-CLS), badges, wishlist+compare, from-price |
| FilterPanel | `listing/filter-panel.tsx` | URL-synced; chips; list⇄map toggle; sort |
| ListingExplorer | `listing/listing-explorer.tsx` | Grid/map views, crawlable pagination, empty state + notify-me |
| LeafletMap | `listing/leaflet-map.tsx` | OSM tiles, price-pill markers, dynamic import |
| CompareTray | `listing/compare-tray.tsx` | Floating, max 3, localStorage |
| StickyMobileCTA | `listing/sticky-mobile-cta.tsx` | Call / WhatsApp / Enquire, safe-area aware |
| FaqAccordion | `ui/accordion.tsx` | ARIA disclosure pattern |
| Buttons/Badges/RatingStars/Breadcrumbs/Skeletons/EmptyState | `ui/primitives.tsx` | Variants: primary(accent), dark, outline, ghost, cream, whatsapp |
| Lead forms ×6 | `forms/lead-forms.tsx` | 2-step enquiry, visit, meeting-room, review, brochure gate, notify-me — shared anti-spam hook |
| Gallery + EnquiryCard tabs + Share | `app/(public)/spaces/[slug]/detail-client.tsx` | Sticky card: price, Call/WA, Enquire/Visit/Room tabs |
| Admin suite | `app/admin/**` | Dark theme, sidebar, kanban, tables, Tiptap editor |

## 5. Wireframe → Mockup mapping (low-fi intent, hi-fi = the built pages)

- **Home:** hero(navy, H1+search) → 7 category cards+enquiry card → locality chips by city → why/stats band → operator strip → featured grid → testimonials → enterprise band(navy) → enquiry+FAQ split → footer.
- **City page:** navy header w/ live counts + median price → locality chips → filter bar → card grid / map split → FAQ+enquiry → 3-way internal-link block.
- **Detail:** breadcrumb → title+badges+share → gallery(16:9 + 5 thumbs) | sticky enquiry card → about → amenities grid → plans table → availability note → map+nearby → brochure gate → reviews → FAQs → related.
- **Admin:** left rail nav → KPI cards → 2-col recents; kanban 6 columns; tables with inline status/flag controls.

## 6. Accessibility contract

Focus ring `2px accent-500` on `:focus-visible`; skip-link; landmarks (`nav/main/footer`, labelled asides); every icon `aria-hidden` with text or `aria-label`; form fields always labelled + `role="alert"` errors; touch targets ≥44px (`min-h-[44px]` in button base); map view always paired with an equivalent list.
