#!/usr/bin/env node
/**
 * Mirror every third-party image into Amadhi's own Cloudinary account.
 *
 * Today the site hotlinks 8,943 listing photos from myHQ's Cloudinary plus a
 * handful of Unsplash images. This copies them into an account you control and
 * rewrites the database URLs, so nothing depends on someone else's CDN.
 *
 * Uses Cloudinary's remote-fetch upload: we hand Cloudinary the source URL and
 * it pulls the bytes server-side, so the images never travel through this
 * machine.
 *
 * Setup — put these in amadhi/.env (never share the secret with anyone):
 *   CLOUDINARY_CLOUD_NAME="your-cloud-name"
 *   CLOUDINARY_API_KEY="123456789012345"
 *   CLOUDINARY_API_SECRET="..."
 *
 * Usage:
 *   node scripts/mirror-images-to-cloudinary.mjs --check      # verify creds only
 *   node scripts/mirror-images-to-cloudinary.mjs              # dry run (no writes)
 *   node scripts/mirror-images-to-cloudinary.mjs --commit --limit=20   # test batch
 *   node scripts/mirror-images-to-cloudinary.mjs --commit     # full migration
 *   node scripts/mirror-images-to-cloudinary.mjs --verify     # spot-check live URLs
 *
 * Safe to re-run: anything already pointing at your cloud is skipped, and
 * uploads use a deterministic public_id so repeats overwrite rather than
 * duplicate.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const CHECK_ONLY = args.includes("--check");
const VERIFY = args.includes("--verify");
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0);
const CONCURRENCY = Number((args.find((a) => a.startsWith("--concurrency=")) || "").split("=")[1] || 4);

/* ─── env ──────────────────────────────────────────────────────────── */
function envFromFile(key) {
  try {
    const txt = readFileSync(path.join(PROJECT, ".env"), "utf8");
    const m = txt.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n\\r]+)"?`, "m"));
    return m ? m[1].trim() : null;
  } catch { return null; }
}
const env = (k) => process.env[k] || envFromFile(k);

const CLOUD = env("CLOUDINARY_CLOUD_NAME");
const KEY = env("CLOUDINARY_API_KEY");
const SECRET = env("CLOUDINARY_API_SECRET");
process.env.DATABASE_URL = env("DATABASE_URL") || `file:${path.join(PROJECT, "prisma", "dev.db")}`;

if (!CLOUD || !KEY || !SECRET) {
  console.error(`
✖ Cloudinary credentials missing.

  Add these three lines to amadhi/.env, then re-run:

    CLOUDINARY_CLOUD_NAME="your-cloud-name"
    CLOUDINARY_API_KEY="your-api-key"
    CLOUDINARY_API_SECRET="your-api-secret"

  Find them on the Cloudinary dashboard after signing up (free tier).
`);
  process.exit(1);
}

/* ─── cloudinary signed upload ─────────────────────────────────────── */
const sign = (params) =>
  createHash("sha1")
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + SECRET)
    .digest("hex");

async function uploadRemote(sourceUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { overwrite: "true", public_id: publicId, timestamp: String(timestamp) };
  const form = new FormData();
  form.append("file", sourceUrl);
  form.append("api_key", KEY);
  for (const [k, v] of Object.entries(signed)) form.append(k, v);
  form.append("signature", sign(signed));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body.secure_url;
}

async function withRetry(fn, label, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      // don't retry a permanent rejection (bad source URL, 4xx other than rate limit)
      if (e.status && e.status !== 420 && e.status !== 429 && e.status < 500) break;
      await new Promise((r) => setTimeout(r, 1000 * i * i));
    }
  }
  throw new Error(`${label}: ${lastErr?.message ?? "unknown error"}`);
}

/* ─── credential check ─────────────────────────────────────────────── */
async function checkCreds() {
  // Admin API authenticates with HTTP Basic (key:secret) — signed params are
  // for the Upload API only.
  const auth = "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) {
    console.error(`✖ Cloudinary rejected the credentials (HTTP ${res.status}). Check cloud name / key / secret in .env.`);
    return false;
  }
  const u = await res.json();
  const cr = u.credits ?? {};
  console.log(`✔ Connected to Cloudinary cloud "${CLOUD}"`);
  if (cr.limit != null) console.log(`   plan credits: ${cr.usage ?? 0} / ${cr.limit} used  (storage ${(u.storage?.usage ?? 0) / 1e9 | 0} GB)`);
  return true;
}

/* ─── main ─────────────────────────────────────────────────────────── */
const OURS = new RegExp(`res\\.cloudinary\\.com/${CLOUD}/`, "i");
const slugPart = (s) => String(s).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").slice(0, 80);

async function main() {
  if (!(await checkCreds())) process.exit(1);
  if (CHECK_ONLY) return;

  const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
  const db = new PrismaClient();

  // Collect every remote image the site depends on
  const jobs = [];
  const images = await db.listingImage.findMany({
    select: { id: true, url: true, sortOrder: true, listing: { select: { slug: true } } },
    orderBy: { id: "asc" },
  });
  for (const i of images) {
    if (!/^https?:\/\//.test(i.url) || OURS.test(i.url)) continue;
    jobs.push({ kind: "listing", id: i.id, url: i.url, publicId: `amadhi/listings/${slugPart(i.listing.slug)}/${i.sortOrder}` });
  }
  const posts = await db.blogPost.findMany({ select: { id: true, slug: true, coverImage: true } });
  for (const p of posts) {
    if (!/^https?:\/\//.test(p.coverImage) || OURS.test(p.coverImage)) continue;
    jobs.push({ kind: "blog", id: p.id, url: p.coverImage, publicId: `amadhi/blog/${slugPart(p.slug)}` });
  }
  const authors = await db.author.findMany({ select: { id: true, slug: true, avatar: true } });
  for (const a of authors) {
    if (!/^https?:\/\//.test(a.avatar) || OURS.test(a.avatar)) continue;
    jobs.push({ kind: "author", id: a.id, url: a.avatar, publicId: `amadhi/authors/${slugPart(a.slug)}` });
  }

  const byKind = jobs.reduce((m, j) => ((m[j.kind] = (m[j.kind] ?? 0) + 1), m), {});
  const byHost = jobs.reduce((m, j) => { const h = j.url.match(/^https?:\/\/([^/]+)/)[1]; m[h] = (m[h] ?? 0) + 1; return m; }, {});
  console.log(`\n📦 ${jobs.length} images to mirror  ${JSON.stringify(byKind)}`);
  console.log(`   sources: ${JSON.stringify(byHost)}`);

  if (VERIFY) {
    const done = images.filter((i) => OURS.test(i.url)).slice(0, 5);
    console.log(`\n🔍 spot-checking ${done.length} already-migrated URLs…`);
    for (const d of done) {
      const r = await fetch(d.url, { method: "HEAD" });
      console.log(`   ${r.status}  ${d.url.slice(0, 90)}`);
    }
    await db.$disconnect();
    return;
  }

  const queue = LIMIT ? jobs.slice(0, LIMIT) : jobs;
  if (!COMMIT) {
    console.log(`\n   examples:`);
    queue.slice(0, 5).forEach((j) => console.log(`     ${j.publicId}\n        ← ${j.url.slice(0, 100)}`));
    console.log(`\n✅ DRY RUN — nothing uploaded or changed. Add --commit to migrate ${queue.length}.\n`);
    await db.$disconnect();
    return;
  }

  console.log(`\n⬆️  uploading ${queue.length} images (concurrency ${CONCURRENCY})…`);
  let ok = 0, failed = 0, n = 0;
  const errors = [];
  const started = Date.now();

  async function worker() {
    for (;;) {
      const job = queue[n++];
      if (!job) return;
      try {
        const secureUrl = await withRetry(() => uploadRemote(job.url, job.publicId), job.publicId);
        if (job.kind === "listing") await db.listingImage.update({ where: { id: job.id }, data: { url: secureUrl } });
        else if (job.kind === "blog") await db.blogPost.update({ where: { id: job.id }, data: { coverImage: secureUrl } });
        else await db.author.update({ where: { id: job.id }, data: { avatar: secureUrl } });
        ok++;
      } catch (e) {
        failed++;
        if (errors.length < 15) errors.push(e.message);
      }
      const done = ok + failed;
      if (done % 100 === 0) {
        const rate = done / ((Date.now() - started) / 1000);
        const left = Math.round((queue.length - done) / Math.max(rate, 0.01));
        console.log(`   ${done}/${queue.length}  ok=${ok} failed=${failed}  ~${Math.floor(left / 60)}m ${left % 60}s left`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  const remaining = await db.listingImage.count({ where: { NOT: { url: { contains: `/${CLOUD}/` } } } });
  await db.$disconnect();

  console.log(`\n✅ mirrored ${ok} images (${failed} failed) in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(`   listing images still on a third-party host: ${remaining}`);
  if (errors.length) { console.log(`   first errors:`); errors.forEach((e) => console.log(`     ${e}`)); }
  console.log(`\n   Re-run the same command to retry anything that failed.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
