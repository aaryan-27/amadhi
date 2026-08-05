import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Transaction poolers (Supabase Supavisor on port 6543, PgBouncer) hand the same
 * backend connection to different clients, so Postgres rejects the second query
 * that reuses a prepared statement name: 42P05 "prepared statement s0 already
 * exists". Prisma only stops using prepared statements when the URL carries
 * pgbouncer=true — a parameter that is easy to lose when copying a connection
 * string out of a dashboard, and whose absence breaks the build rather than
 * failing loudly at configuration time.
 *
 * Adding it here means a pooled URL works whether or not the parameter was set.
 * Schema changes are unaffected: those run over DIRECT_URL (see schema.prisma).
 *
 * Pool sizing is set here too, because both defaults are wrong for this app:
 *
 * - connection_limit defaults to cpus*2+1, which is 3 on a small build machine.
 *   `next build` prerenders 122 pages in parallel workers, each issuing several
 *   queries, and three connections cannot keep up.
 * - pool_timeout defaults to 10s. A build running far from the database (Vercel
 *   iad1 → Supabase ap-south-1 is a ~250ms round trip, versus ~20ms in-region)
 *   holds each connection long enough that queued queries blow through it.
 *
 * Together those produced P2024 "timed out fetching a new connection" partway
 * through prerendering. Do NOT drop these back to connection_limit=1: that value
 * is widely repeated for serverless, but Next.js serves requests concurrently
 * inside one instance, and a pool of one failed 1 in 5 requests at merely five
 * concurrent readers. An explicit value in the URL always wins over these.
 */
const POOL_DEFAULTS = { connection_limit: "10", pool_timeout: "30" };

function normalizePooledUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const pooled = raw.includes(":6543/") || raw.includes("pooler.");
  if (!pooled) return undefined;

  try {
    const url = new URL(raw);
    const before = url.toString();
    url.searchParams.set("pgbouncer", "true");
    for (const [key, value] of Object.entries(POOL_DEFAULTS)) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString() === before ? undefined : url.toString();
  } catch {
    return undefined; // unparseable — leave it to Prisma to report
  }
}

const patchedUrl = normalizePooledUrl(process.env.DATABASE_URL);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only override when the URL actually needed fixing, so the schema's own
    // env("DATABASE_URL") stays the source of truth in every normal case.
    ...(patchedUrl ? { datasourceUrl: patchedUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
