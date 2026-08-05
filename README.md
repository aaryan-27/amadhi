# Amadhi.com — Your space to grow

Delhi NCR's premium coworking & managed office marketplace. **Gurugram · Noida · Delhi.**
Next.js 15 (App Router) + Prisma + Tailwind v4, running as a single deployable app designed for one Hostinger KVM VPS. Account-free public site, lead-gen conversion model, Auth.js-protected admin.

## Quickstart (development)

```bash
npm install
cp .env.example .env    # then fill in DATABASE_URL (Postgres) + AUTH_SECRET

npx prisma db push                            # create the schema
node prisma/migrate-sqlite-to-postgres.mjs    # load the shipped NCR inventory

npm run dev             # http://localhost:3000
```

The repo ships `prisma/dev.db` — a SQLite snapshot holding the full live dataset
(1,468 listings, 8,930 images, 378 operators). The migrate script copies it into
Postgres. Prefer the small demo dataset instead? Run `npx prisma db seed`.

No Postgres to hand? See [working locally without Postgres](docs/11-vercel-deployment.md#working-locally-without-postgres).

**Admin:** http://localhost:3000/admin — sign in as `admin@amadhi.com` (a sales-role user, `sales@amadhi.com`, is seeded too).
Set `ADMIN_SEED_PASSWORD` in `.env` **before** seeding to choose their password; if you leave it unset the seed generates a random one and prints it once. No default password is baked into the repo.

**Deployment** — the app runs on PostgreSQL in every environment. After the first `prisma db push`, apply `prisma/postgres-fts.sql` and set `SEARCH_ENGINE=postgres` to enable pg_trgm search ranking.

- **Free, step-by-step for non-developers** (Supabase + Vercel): [docs/12-free-deployment.md](docs/12-free-deployment.md)
- Single VPS (no commercial-use limits, never sleeps): [docs/08-deployment.md](docs/08-deployment.md)
- Vercel reference (what changed and why): [docs/11-vercel-deployment.md](docs/11-vercel-deployment.md)

## Deliverables index

| # | Deliverable | Where |
|---|---|---|
| 1–4 | PRD · Personas · User-flow diagrams · IA & sitemap | [docs/01-prd-personas-flows.md](docs/01-prd-personas-flows.md) |
| 5–7, 11–12 | Wireframes · Design system · Hi-fi mockups · Component library · Admin/CMS design | [docs/02-design-system.md](docs/02-design-system.md) + the built app (`src/components`, `/admin`) |
| 8 | Database schema (Prisma) | [prisma/schema.prisma](prisma/schema.prisma) · [prisma/schema.sqlite.prisma](prisma/schema.sqlite.prisma) · [prisma/postgres-fts.sql](prisma/postgres-fts.sql) |
| 9 | API documentation | [docs/04-api.md](docs/04-api.md) |
| 10 | Architecture (single-VPS topology) | [docs/03-architecture.md](docs/03-architecture.md) |
| 13 | SEO strategy + technical SEO | [docs/05-seo.md](docs/05-seo.md) |
| 14 | Performance plan | [docs/06-performance.md](docs/06-performance.md) |
| 15 | Security practices | [docs/07-security.md](docs/07-security.md) |
| 16 | Deployment guide (VPS → Nginx → PM2 → Certbot → Cloudflare → GH Actions) | [docs/08-deployment.md](docs/08-deployment.md) |
| 17 | Testing strategy | [docs/09-testing.md](docs/09-testing.md) |
| 18 | Future roadmap | [docs/10-roadmap.md](docs/10-roadmap.md) |
| — | Vercel deployment | [docs/11-vercel-deployment.md](docs/11-vercel-deployment.md) |

## Hard constraints honoured

- Markets: **Gurugram, Noida, Delhi only** — everywhere (nav, seeds, sitemap)
- **No Day Pass** product anywhere
- **No end-user accounts** — wishlist/recently-viewed/compare are localStorage; reviews via moderated public form; admin is the only authenticated surface (Auth.js credentials + RBAC)
- **Lead-gen, not checkout** — enquiry, visit booking, meeting-room request, WhatsApp, call, brochure; `MeetingRoomRequest.paymentId` reserved for Phase-2 Razorpay
- **Free-first** — self-hosted Postgres, Leaflet+OSM, pg_trgm search behind a swappable `SearchService`, Cloudinary/GA4/Clarity/Cloudflare/Brevo free tiers

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:push` / `npm run db:seed` | Schema push / deterministic NCR seed |
| `npm run lint` | ESLint |
