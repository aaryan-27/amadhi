#!/usr/bin/env node
/**
 * Queue drafts to publish themselves, one per day.
 *
 * There is no cron job and nothing to keep running: a post is live once its
 * publishedAt has passed (see livePostWhere in src/lib/queries.ts), so this
 * just stamps each draft with a date and marks it "scheduled". Pages
 * revalidate every 5 minutes, so a post appears shortly after its slot.
 *
 *   node scripts/schedule-blog-posts.mjs                  # preview the queue
 *   node scripts/schedule-blog-posts.mjs --apply          # commit it
 *   node scripts/schedule-blog-posts.mjs --time=09:30 --per-day=1 --apply
 *   node scripts/schedule-blog-posts.mjs --list           # show what's queued
 *
 * Re-running is safe: days that already have a post are skipped, so new
 * drafts queue up after the existing ones rather than double-booking a day.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.split("=")[1] : d; };
const APPLY = args.includes("--apply");
const LIST = args.includes("--list");
const PER_DAY = Math.max(1, Number(flag("per-day", "1")));
const [HH, MM] = flag("time", "09:30").split(":").map(Number);
const IST_OFFSET_MIN = 5 * 60 + 30;

const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
const db = new PrismaClient();

/** A given IST wall-clock time on `dayOffset` days from today, as a UTC instant. */
function istSlot(dayOffset, hh, mm) {
  const nowIst = new Date(Date.now() + IST_OFFSET_MIN * 60_000);
  const d = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + dayOffset, hh, mm));
  return new Date(d.getTime() - IST_OFFSET_MIN * 60_000);
}
const istDay = (d) => new Date(d.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
const fmt = (d) => `${istDay(d)} ${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")} IST`;

if (LIST) {
  const queued = await db.blogPost.findMany({
    where: { status: "scheduled" }, orderBy: { publishedAt: "asc" },
    select: { slug: true, title: true, publishedAt: true },
  });
  const now = new Date();
  console.log(`${queued.length} scheduled post(s):`);
  for (const p of queued) {
    console.log(`  ${fmt(p.publishedAt)}  ${p.publishedAt <= now ? "LIVE  " : "queued"}  ${p.title}`);
  }
  await db.$disconnect();
  process.exit(0);
}

// Days already spoken for, so re-runs append instead of colliding.
const taken = new Map();
for (const p of await db.blogPost.findMany({
  where: { publishedAt: { not: null }, status: { in: ["published", "scheduled"] } },
  select: { publishedAt: true },
})) {
  const k = istDay(p.publishedAt);
  taken.set(k, (taken.get(k) ?? 0) + 1);
}

// Oldest drafts first, so the batches written earlier go out first.
const drafts = await db.blogPost.findMany({
  where: { status: "draft" }, orderBy: { createdAt: "asc" },
  select: { id: true, slug: true, title: true },
});

if (!drafts.length) {
  console.log("No drafts waiting. Write some with scripts/write-blog-posts.mjs first.");
  await db.$disconnect();
  process.exit(0);
}

const plan = [];
let day = 1; // start tomorrow, never backdate
for (const d of drafts) {
  while ((taken.get(istDay(istSlot(day, HH, MM))) ?? 0) >= PER_DAY) day++;
  const when = istSlot(day, HH, MM);
  taken.set(istDay(when), (taken.get(istDay(when)) ?? 0) + 1);
  plan.push({ ...d, when });
}

console.log(`${APPLY ? "Scheduling" : "Would schedule"} ${plan.length} post(s), ${PER_DAY}/day at ${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")} IST:\n`);
for (const p of plan) console.log(`  ${fmt(p.when)}  ${p.title}`);

if (APPLY) {
  for (const p of plan) {
    await db.blogPost.update({ where: { id: p.id }, data: { status: "scheduled", publishedAt: p.when } });
  }
  const last = plan[plan.length - 1];
  console.log(`\nQueued. Nothing else to run — each post goes live on its own date.`);
  console.log(`Last post publishes ${fmt(last.when)}.`);
} else {
  console.log(`\nRe-run with --apply to queue them.`);
}
await db.$disconnect();
