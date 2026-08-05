# Deploying Amadhi for free — a step-by-step guide

Written so someone who has never deployed a website can follow it. Every click
and command is spelled out. Budget about **45 minutes**.

You will end up with a live site at `https://something.vercel.app` serving all
1,468 listings, with a working admin dashboard and lead capture.

## Read this first — the honest limits

Free means real trade-offs. Both matter:

1. **Vercel's Hobby plan does not permit commercial use.** Amadhi is a
   commercial business. This setup is fine for a demo, a staging link, or
   showing the site to stakeholders. For a *live* Amadhi taking real customer
   enquiries you need Vercel **Pro (~$20/month)**, or the single-server setup in
   [08-deployment.md](08-deployment.md).
2. **Supabase pauses free databases after 7 days with no activity.** A paused
   database means the site shows errors until you open the Supabase dashboard
   and click Restore. Fine for a demo; not for production.

The genuinely free-forever alternative is a single VPS, covered in
[08-deployment.md](08-deployment.md). It costs a few hundred rupees a month but
has no commercial-use restriction and never pauses.

## What you need before starting

- A **GitHub account** with this repository pushed to it
- An email address for two free signups (Supabase, Vercel)
- The project on your computer, with a **terminal** — needed for Part 2 only

Nothing else. No credit card.

---

# Part 1 — Create the database (10 min)

The site stores listings, leads and blog posts in PostgreSQL. Supabase gives you
one free.

### 1.1 Sign up

Go to **[supabase.com](https://supabase.com)** → **Start your project** → sign in
with GitHub.

### 1.2 Create the project

Click **New project** and fill in:

| Field | What to enter |
|---|---|
| Name | `amadhi` |
| Database Password | Click **Generate a password**, then **copy it somewhere safe** |
| Region | **South Asia (Mumbai)** — closest to Delhi NCR users |

> **Do not skip saving the password.** Supabase shows it once. If you lose it you
> must reset it later under Settings → Database.

Click **Create new project** and wait ~2 minutes while it provisions.

### 1.3 Copy the two connection strings

Go to **Project Settings** (gear icon) → **Database** → scroll to
**Connection string**. You need **both** of these:

| Tab in Supabase | Port | We will call it |
|---|---|---|
| **Transaction pooler** | 6543 | `DATABASE_URL` |
| **Direct connection** | 5432 | `DIRECT_URL` |

Copy each into a scratch text file. In both, replace `[YOUR-PASSWORD]` with the
password from step 1.2.

Then **add this to the end of the pooler one only**:

```
?pgbouncer=true
```

You should end up with two lines that look like this:

```
DATABASE_URL="postgresql://postgres.abcdefgh:YourPassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.abcdefgh:YourPassword@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

<details>
<summary>Why two connection strings?</summary>

Vercel runs your site as many small short-lived programs. Each one opens its own
database connection, and Postgres runs out quickly — so normal traffic goes
through the **pooler** (6543), which shares a small set of connections.

But the pooler can't handle the commands that *create* tables. Those need the
**direct** connection (5432). Prisma is configured to use the right one
automatically.
</details>

---

# Part 2 — Load the data (15 min)

This is the only part needing a terminal. You are copying the 1,468 listings from
the file in the repo into your new Supabase database.

### 2.1 Open a terminal in the project folder

```bash
cd "/Users/aryan/Downloads/Amadhi Website/amadhi"
```

> Your prompt must show **`amadhi`**. If it shows `Amadhi Website`, you are one
> folder too high and every command below will fail.

If you are setting this up on a different computer, clone it first:

```bash
git clone https://github.com/amadhi-gg/amadhi-website.git && cd amadhi-website && npm install
```

### 2.2 Put the connection strings in `.env`

Open the file named `.env` in the project folder with any text editor. Find the
line starting `DATABASE_URL=` and replace that whole line with **both** lines you
prepared in step 1.3.

Keep the other lines (`AUTH_SECRET`, `CLOUDINARY_CLOUD_NAME`) as they are.

### 2.3 Create the tables

```bash
npx prisma db push
```

Expect `Your database is now in sync with your Prisma schema` after ~30 seconds.

### 2.4 Copy the listings across

```bash
node prisma/migrate-sqlite-to-postgres.mjs
```

This moves **25,030 rows** — 1,468 listings, 8,930 images, 378 operators, 171
localities, plus blog posts and FAQs. It prints each table as it goes and ends
with `✅ migrated 25030 rows`. Takes 2–5 minutes.

> Want to preview without writing anything? Add `--dry-run`.

### 2.5 Turn on fast search

In the Supabase dashboard, click **SQL Editor** (left sidebar) → **New query**.
Open `prisma/postgres-fts.sql` from the project folder, copy all of it, paste it
in, and click **Run**.

You should see `Success. No rows returned`. This builds the search indexes that
make the search bar fast.

### 2.6 Set your own admin password

The repo is public, so its built-in admin password is public too. Change it:

```bash
node scripts/set-admin-password.mjs --email=admin@amadhi.com
```

It prints a new random password **once** — save it in your password manager. Do
the same for `sales@amadhi.com`. To choose your own instead, add
`--password='your-choice'` (minimum 10 characters).

### 2.7 Put your local site back to normal

Your computer used a local file-based database for development. Restore it:

```bash
npx prisma generate --schema=prisma/schema.sqlite.prisma
```

---

# Part 3 — Put the site online (10 min)

### 3.1 Generate a security key

This signs admin login sessions. Run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the line it prints — that is your `AUTH_SECRET`.

### 3.2 Sign up for Vercel

Go to **[vercel.com](https://vercel.com)** → **Sign Up** → **Continue with
GitHub**.

### 3.3 Import the repository

Click **Add New… → Project**. Find `amadhi-website` in the list and click **Import**.
Vercel detects Next.js automatically — **change none of the build settings**.

### 3.4 Add the environment variables

Before deploying, expand **Environment Variables** and add these five. For each:
type the name, paste the value, click **Add**.

| Name | Value |
|---|---|
| `DATABASE_URL` | the pooler string (port **6543**) from step 1.3 |
| `DIRECT_URL` | the direct string (port **5432**) from step 1.3 |
| `AUTH_SECRET` | the key from step 3.1 |
| `CLOUDINARY_CLOUD_NAME` | `o2gthvvd` |
| `SEARCH_ENGINE` | `postgres` |

> Make sure each is enabled for **Production**, **Preview** and **Development**
> (all three boxes ticked, which is the default).

### 3.5 Deploy

Click **Deploy** and wait 2–4 minutes.

When it finishes you get a URL like `https://amadhi-xyz.vercel.app`. Open it —
the homepage should load with listings.

---

# Part 4 — Check everything works

Visit these on your new URL:

- [ ] `/` — homepage loads, hero images appear
- [ ] `/coworking-space/gurugram` — listing cards with photos and prices
- [ ] Click any listing — detail page with photos, amenities, map
- [ ] Type in the header search — suggestions appear
- [ ] `/robots.txt` — plain text, not an error
- [ ] `/sitemap.xml` — long XML list
- [ ] `/admin/login` — sign in with the password from step 2.6
- [ ] Submit an enquiry on any listing, then check it appears in admin → Leads

If all pass, you are live.

## Connecting your own domain (optional)

In Vercel: **Settings → Domains → Add**, type `www.amadhi.com`, and Vercel shows
you the DNS record to create with your domain registrar. HTTPS is automatic.

Then update the domain the site uses in its sitemap and canonical links — edit
`domain:` in `src/lib/site.ts` and the `Sitemap:` line in `public/robots.txt`,
then commit and push. Vercel redeploys automatically.

## Making changes later

Push to `main` on GitHub and Vercel rebuilds and redeploys by itself. No commands
needed.

---

# Troubleshooting

**Build fails: "Can't reach database server"**
`DATABASE_URL` is wrong or the password wasn't substituted. Check `[YOUR-PASSWORD]`
was replaced with the real one, and that the Supabase project shows *Active*.

**Build fails: "Environment variable not found: DIRECT_URL"**
You missed one in step 3.4. Add it under Settings → Environment Variables, then
Deployments → ⋯ → Redeploy.

**Site loads but has no listings**
Part 2 didn't finish. Re-run `node prisma/migrate-sqlite-to-postgres.mjs` and
confirm it ends with `✅ migrated 25030 rows`.

**Images are broken**
`CLOUDINARY_CLOUD_NAME` is missing or misspelled. It must be exactly `o2gthvvd`.

**Admin login says invalid credentials**
Re-run step 2.6 — but point it at Supabase, not your local database. Make sure
`.env` still holds the Supabase strings when you run it.

**Site suddenly errors after a week**
Supabase paused the free database. Open the Supabase dashboard and click
**Restore**. To stop this happening, upgrade Supabase or move to a VPS.

**`command not found: npx`**
Node.js isn't installed. Get the LTS version from
[nodejs.org](https://nodejs.org), then reopen your terminal.
