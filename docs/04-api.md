# API Documentation — `/api/v1`

All public write endpoints: JSON bodies, Zod validation, IP rate limiting (in-memory sliding window), and dual anti-spam (hidden `website` honeypot must be empty; `startedAt` dwell-time must be ≥2.5s — spam gets a fake `200 {ok:true}` and is silently dropped). No auth on public endpoints; admin endpoints require an Auth.js session + role.

## Public

### `GET /api/v1/search?q={term}`
Autocomplete (60 req/min/IP). Returns grouped suggestions.
```json
{ "suggestions": [ { "group": "Localities|Spaces|Operators", "label": "Cyber City", "sublabel": "Gurugram · 4 spaces", "href": "/coworking-space/gurugram/cyber-city" } ] }
```

### `POST /api/v1/leads` (8/min/IP)
Creates a Lead (types: `enquiry | brochure | partner | notify_me | contact`). Resolves `citySlug`/`localitySlug`/`listingSlug` → relations; captures `utm{}`; sets `slaDueAt = now + 1h`; creates admin Notification.
```json
{
  "type": "enquiry", "name": "Priya Sharma", "phone": "9810000000",
  "email": "", "productType": "coworking", "seats": "6-10",
  "moveIn": "Within 30 days", "citySlug": "gurugram",
  "listingSlug": "", "companyName": "", "utm": {"utm_source": "google"},
  "website": "", "startedAt": 1789000000000
}
```
→ `201 { "ok": true, "id": "…" }` · `400 { "error": "…" }` · `429`

### `POST /api/v1/visits` (6/min/IP)
`{ listingSlug, name, phone, email?, date: "YYYY-MM-DD", slot: "10:00–11:00", website, startedAt }`
Creates VisitBooking **and** a pipeline Lead. → `201`.

### `POST /api/v1/meeting-rooms` (6/min/IP)
`{ listingSlug, name, phone, email?, date, startTime: "HH:MM", hours: 1–12, attendees, website, startedAt }`
Creates MeetingRoomRequest (`paymentId` reserved for Razorpay) + Lead. → `201`.

### `POST /api/v1/reviews` (3/min/IP)
`{ listingSlug, name, email?, persona?, rating: 1–5, title?, body(≥20 chars), website, startedAt }`
Always enters moderation as `pending`; approval recomputes the listing's `rating`/`reviewCount`. → `201`.

### `GET /api/v1/listings/compare?slugs=a,b,c`
Up to 3 slugs → full comparison payload (price, rating, capacity, hours, operator, amenities).

## Admin (session + RBAC)

- `GET/POST /api/auth/[...nextauth]` — Auth.js credentials sign-in/session/sign-out.
- `GET /admin/leads/export` — CSV of all leads (roles: leads module). 401 otherwise.
- **Server Actions** (in `src/app/admin/(dashboard)/actions.ts`, all `requireRole`-guarded + activity-logged): `updateLeadStatus`, `assignLead`, `addLeadNote`, `toggleListingFlag`, `setListingStatus`, `updateListingCore`, `moderateReview`, `saveBlogPost`, `deleteBlogPost`, `saveSetting`.

## Validation reference

Indian mobile: `^(\+?91[\s-]?)?[6-9]\d{9}$`. Dates `YYYY-MM-DD`; times `HH:MM`. All strings length-capped server-side. Phone/email optional only where the UX allows (brochure/notify need email only).

## Error contract

`400` first Zod issue message · `404` unknown listing · `429` rate-limited · `500` generic (details never leaked). Success is always `{ ok: true, id? }`.
