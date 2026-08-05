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
 * Deliberately does NOT set connection_limit. The commonly cited serverless
 * value of 1 serialises every query in a process, and Next.js serves requests
 * concurrently within one instance — measured against this database, 1 in 5
 * requests failed with P2024 "timed out fetching a new connection" at only five
 * concurrent readers. Prisma's default pool size is the safer starting point;
 * set connection_limit explicitly in the URL if a deployment needs to cap it.
 */
function normalizePooledUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const pooled = raw.includes(":6543/") || raw.includes("pooler.");
  if (!pooled) return undefined;

  try {
    const url = new URL(raw);
    if (url.searchParams.get("pgbouncer") === "true") return undefined; // already correct
    url.searchParams.set("pgbouncer", "true");
    return url.toString();
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
