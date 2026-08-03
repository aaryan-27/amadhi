/**
 * SearchService — clean interface so the engine can be swapped
 * (Postgres FTS/pg_trgm today → self-hosted Meilisearch later)
 * without touching any caller.
 */
import { db } from "@/lib/db";

export interface SearchSuggestion {
  group: "Localities" | "Spaces" | "Operators";
  label: string;
  sublabel: string;
  href: string;
}

export interface SearchService {
  autocomplete(q: string, limit?: number): Promise<SearchSuggestion[]>;
}

/** Case-insensitive contains matching — works on SQLite and Postgres. */
class PrismaContainsSearchService implements SearchService {
  async autocomplete(q: string, limit = 8): Promise<SearchSuggestion[]> {
    const term = q.trim();
    if (term.length < 2) return [];

    const [localities, listings, operators] = await Promise.all([
      db.locality.findMany({
        where: { name: { contains: term } },
        include: { city: true, _count: { select: { listings: { where: { status: "published" } } } } },
        take: limit,
      }),
      db.listing.findMany({
        where: { status: "published", name: { contains: term } },
        include: { locality: true, city: true },
        take: limit,
      }),
      db.operator.findMany({
        where: { name: { contains: term } },
        take: 4,
      }),
    ]);

    const out: SearchSuggestion[] = [];
    for (const l of localities) {
      out.push({
        group: "Localities",
        label: l.name,
        sublabel: `${l.city.name} · ${l._count.listings} spaces`,
        href: `/coworking-space/${l.city.slug}/${l.slug}`,
      });
    }
    for (const s of listings) {
      out.push({
        group: "Spaces",
        label: s.name,
        sublabel: `${s.locality.name}, ${s.city.name}`,
        href: `/spaces/${s.slug}`,
      });
    }
    for (const o of operators) {
      out.push({
        group: "Operators",
        label: o.name,
        sublabel: "Operator",
        href: `/search?operator=${o.slug}`,
      });
    }
    return out.slice(0, limit + 6);
  }
}

/**
 * Production engine: raw pg_trgm similarity ranking (requires
 * prisma/postgres-fts.sql applied). Activated via SEARCH_ENGINE=postgres.
 */
class PgTrgmSearchService extends PrismaContainsSearchService {
  override async autocomplete(q: string, limit = 8): Promise<SearchSuggestion[]> {
    const term = q.trim();
    if (term.length < 2) return [];
    try {
      type Row = { kind: string; label: string; sublabel: string; href: string };
      const rows = await db.$queryRawUnsafe<Row[]>(
        `
        (SELECT 'Localities' AS kind, l.name AS label,
                c.name AS sublabel,
                '/coworking-space/' || c.slug || '/' || l.slug AS href,
                similarity(l.name, $1) AS score
           FROM "Locality" l JOIN "City" c ON c.id = l."cityId"
          WHERE l.name % $1 ORDER BY score DESC LIMIT $2)
        UNION ALL
        (SELECT 'Spaces', s.name, loc.name || ', ' || c.name,
                '/spaces/' || s.slug, similarity(s.name, $1)
           FROM "Listing" s
           JOIN "Locality" loc ON loc.id = s."localityId"
           JOIN "City" c ON c.id = s."cityId"
          WHERE s.status = 'published' AND s.name % $1
          ORDER BY similarity(s.name, $1) DESC LIMIT $2)
        UNION ALL
        (SELECT 'Operators', o.name, 'Operator',
                '/search?operator=' || o.slug, similarity(o.name, $1)
           FROM "Operator" o WHERE o.name % $1 LIMIT 4)
        `,
        term,
        limit
      );
      return rows.map((r) => ({
        group: r.kind as SearchSuggestion["group"],
        label: r.label,
        sublabel: r.sublabel,
        href: r.href,
      }));
    } catch {
      // Extension not installed yet — degrade gracefully.
      return super.autocomplete(term, limit);
    }
  }
}

export const searchService: SearchService =
  process.env.SEARCH_ENGINE === "postgres"
    ? new PgTrgmSearchService()
    : new PrismaContainsSearchService();
