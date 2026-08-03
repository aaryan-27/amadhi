# Deploying Amadhi on Vercel

The primary target in `docs/08-deployment.md` is a single Hostinger VPS (no
recurring SaaS cost, per the original brief). Vercel is fully supported too and
is the quicker route for staging/preview links.

## Why the first attempt failed

```
provider = "sqlite"
url      = env("DATABASE_URL")
Validation Error Count: 1  →  schema.prisma:12
Failed to collect page data for /blog/[category]/[slug]
```

Two things were wrong, both now fixed in the repo:

1. **SQLite can't run on Vercel.** Serverless functions get a read-only,
   ephemeral filesystem. Even when reads work, every write — enquiries, visit
   bookings, meeting-room requests, reviews, all admin actions — is lost.
   `prisma/schema.prisma` is now **PostgreSQL**.
2. **Prisma Client wasn't regenerated.** Vercel restores a cached
   `node_modules`, so the client went stale. `package.json` now runs
   `prisma generate` in both `postinstall` and `build`.

Pages such as `/blog/[category]/[slug]` and `/spaces/[slug]` call
`generateStaticParams()`, which queries the database **at build time** — so
`DATABASE_URL` must be reachable from the Vercel build, not just at runtime.

## Steps

### 1. Create a Postgres database
Vercel Postgres (Storage → Create → Postgres) sets `DATABASE_URL` for you.
Neon or Supabase work identically — copy their connection string.

### 2. Set environment variables
Project → Settings → Environment Variables (Production **and** Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://…` (Vercel Postgres sets this automatically) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |
| `CLOUDINARY_CLOUD_NAME` | your cloud name |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | only if re-running media scripts |
| `SEARCH_ENGINE` | `postgres` (after step 4) |

`ADMIN_SEED_PASSWORD` is only needed when you seed.

### 3. Create the schema and load the inventory
Run locally, pointed at the new database:

```bash
export DATABASE_URL="postgresql://…"

npx prisma db push                              # create tables
node prisma/migrate-sqlite-to-postgres.mjs      # copy the shipped dev.db across
```

That moves ~25,000 rows — 1,468 listings, 8,930 images, 378 operators, 171
localities, blog, FAQs and admin users. Add `--dry-run` first to preview, or
`--wipe` to clear the destination.

Alternatively `npx prisma db seed` gives the small demo dataset instead.

### 4. Enable Postgres search (optional, recommended)
```bash
psql "$DATABASE_URL" -f prisma/postgres-fts.sql
```
Adds `pg_trgm` + tsvector indexes. Then set `SEARCH_ENGINE=postgres` so
`SearchService` uses similarity ranking instead of the `contains` fallback.

### 5. Deploy
Push to `main`, or `vercel --prod`. Build runs `prisma generate && next build`.

## Known limitations on serverless

- **Rate limiting weakens.** `src/lib/rate-limit.ts` keeps counters in process
  memory. Each serverless instance has its own and they are short-lived, so the
  per-IP caps (8/min on `/api/v1/leads`) stop being enforced globally. The
  honeypot and dwell-time checks still work. For real protection add Upstash
  Redis and back `rateLimit()` with it.
- **ISR** works well on Vercel — `revalidate = 60` on listing pages and `300`
  on blog pages behaves as intended.
- **`prisma/dev.db` is ignored at runtime** once `DATABASE_URL` is Postgres. It
  stays in the repo purely as the portable data snapshot for step 3.

## Licensing note

Vercel's **Hobby plan prohibits commercial use**. Amadhi is a commercial site,
so production on Vercel needs **Pro (~$20/month)**. The VPS runbook in
`docs/08-deployment.md` remains the zero-recurring-cost option; a common split
is VPS for production, Vercel for preview deploys.

## Working locally without Postgres

```bash
DATABASE_URL="file:./dev.db"
npx prisma generate --schema=prisma/schema.sqlite.prisma
npm run dev
```

`prisma/schema.sqlite.prisma` is model-identical to the Postgres schema. Note
that `npm install` re-runs `postinstall` and regenerates the Postgres client, so
repeat the command above after installing.
