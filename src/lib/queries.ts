/**
 * Server-side data access. All reads used by public pages live here so
 * templates stay thin and caching stays consistent (ISR 60s on pages).
 */
import { db } from "@/lib/db";
import { cache } from "react";
import type { Prisma } from "@prisma/client";

export type ListingCardData = {
  id: string;
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  featured: boolean;
  trending: boolean;
  capacity: number;
  openDays: string;
  city: { slug: string; name: string };
  locality: { slug: string; name: string };
  operator: { slug: string; name: string; logoUrl: string } | null;
  image: { url: string; alt: string } | null;
  fromPrice: { amount: number; period: string; productType: string } | null;
  amenities: string[];
  productTypes: string[];
};

const cardInclude = {
  city: { select: { slug: true, name: true } },
  locality: { select: { slug: true, name: true } },
  operator: { select: { slug: true, name: true, logoUrl: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  plans: { include: { prices: true } },
  amenities: { include: { amenity: true } },
} satisfies Prisma.ListingInclude;

type ListingWithCard = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export function toCard(l: ListingWithCard, productType?: string): ListingCardData {
  const all = l.plans.flatMap((p) =>
    p.prices.map((pr) => ({ amount: pr.amount, period: pr.period, productType: p.productType }))
  );
  const scoped = productType ? all.filter((p) => p.productType === productType) : all;
  // Headline price preference: monthly seat products > any monthly > hourly > per-sq-ft
  const SEAT_PRODUCTS = ["coworking", "dedicated_desk", "private_cabin", "managed_office"];
  const seatMonthly = scoped.filter((p) => p.period === "month" && SEAT_PRODUCTS.includes(p.productType));
  const anyMonthly = scoped.filter((p) => p.period === "month");
  const pool = seatMonthly.length ? seatMonthly : anyMonthly.length ? anyMonthly : scoped.length ? scoped : all;
  const fromPrice = [...pool].sort((a, b) => a.amount - b.amount)[0] ?? null;
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    rating: l.rating,
    reviewCount: l.reviewCount,
    verified: l.verified,
    featured: l.featured,
    trending: l.trending,
    capacity: l.capacity,
    openDays: l.openDays,
    city: l.city,
    locality: l.locality,
    operator: l.operator,
    image: l.images[0] ? { url: l.images[0].url, alt: l.images[0].alt } : null,
    fromPrice,
    amenities: l.amenities.map((a) => a.amenity.name),
    productTypes: [...new Set(l.plans.map((p) => p.productType))],
  };
}

export const getCities = cache(() =>
  db.city.findMany({ include: { _count: { select: { listings: { where: { status: "published" } } } } } })
);

export const getCity = cache((slug: string) =>
  db.city.findUnique({
    where: { slug },
    include: {
      localities: {
        include: { _count: { select: { listings: { where: { status: "published" } } } } },
      },
    },
  })
);

export const getLocality = cache((citySlug: string, localitySlug: string) =>
  db.locality.findFirst({
    where: { slug: localitySlug, city: { slug: citySlug } },
    include: {
      city: true,
      _count: { select: { listings: { where: { status: "published" } } } },
    },
  })
);

export interface ListingFilters {
  productType?: string;
  citySlug?: string;
  localitySlug?: string;
  operatorSlug?: string;
  amenities?: string[]; // amenity slugs
  priceMin?: number;
  priceMax?: number;
  capacityMin?: number;
  q?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  perPage?: number;
}

export async function findListings(f: ListingFilters) {
  const where: Prisma.ListingWhereInput = { status: "published" };
  if (f.citySlug) where.city = { slug: f.citySlug };
  if (f.localitySlug) where.locality = { slug: f.localitySlug };
  if (f.operatorSlug) where.operator = { slug: f.operatorSlug };
  if (f.productType) where.plans = { some: { productType: f.productType } };
  if (f.capacityMin) where.capacity = { gte: f.capacityMin };
  if (f.q) where.OR = [{ name: { contains: f.q } }, { address: { contains: f.q } }];
  if (f.amenities?.length)
    where.AND = f.amenities.map((slug) => ({ amenities: { some: { amenity: { slug } } } }));

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    f.sort === "rating"
      ? [{ rating: "desc" }, { reviewCount: "desc" }]
      : f.sort === "newest"
        ? [{ createdAt: "desc" }]
        : [{ featured: "desc" }, { verified: "desc" }, { rating: "desc" }];

  const perPage = f.perPage ?? 12;
  const page = Math.max(1, f.page ?? 1);

  const [rows, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: cardInclude,
      orderBy,
      // price sorting happens in JS after mapping (price lives on plans)
      take: f.sort?.startsWith("price") ? 200 : perPage,
      skip: f.sort?.startsWith("price") ? 0 : (page - 1) * perPage,
    }),
    db.listing.count({ where }),
  ]);

  let cards = rows.map((r) => toCard(r, f.productType));
  if (f.priceMin) cards = cards.filter((c) => (c.fromPrice?.amount ?? 0) >= f.priceMin!);
  if (f.priceMax) cards = cards.filter((c) => (c.fromPrice?.amount ?? Infinity) <= f.priceMax!);
  if (f.sort === "price_asc")
    cards.sort((a, b) => (a.fromPrice?.amount ?? 1e9) - (b.fromPrice?.amount ?? 1e9));
  if (f.sort === "price_desc")
    cards.sort((a, b) => (b.fromPrice?.amount ?? 0) - (a.fromPrice?.amount ?? 0));
  if (f.sort?.startsWith("price")) {
    const start = (page - 1) * perPage;
    return { cards: cards.slice(start, start + perPage), total: cards.length, page, perPage };
  }
  return { cards, total, page, perPage };
}

/** Median monthly from-price for a product in a city/locality (live-computed, ISR-cached). */
export async function medianPrice(productType: string, citySlug?: string, localitySlug?: string) {
  const prices = await db.price.findMany({
    where: {
      period: { in: ["month", "sqft_month"] },
      plan: {
        productType,
        listing: {
          status: "published",
          ...(citySlug ? { city: { slug: citySlug } } : {}),
          ...(localitySlug ? { locality: { slug: localitySlug } } : {}),
        },
      },
    },
    select: { amount: true },
    orderBy: { amount: "asc" },
  });
  if (!prices.length) return null;
  return prices[Math.floor(prices.length / 2)].amount;
}

export const getFeaturedListings = cache(async () => {
  const rows = await db.listing.findMany({
    where: { status: "published", featured: true },
    include: cardInclude,
    take: 8,
  });
  return rows.map((r) => toCard(r));
});

export const getListingDetail = cache((slug: string) =>
  db.listing.findUnique({
    where: { slug },
    include: {
      city: true,
      locality: true,
      operator: true,
      images: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
      plans: { include: { prices: true } },
      reviews: { where: { status: "approved" }, orderBy: { createdAt: "desc" }, take: 12 },
    },
  })
);

export async function getRelatedListings(listingId: string, localityId: string, cityId: string) {
  const rows = await db.listing.findMany({
    where: {
      status: "published",
      id: { not: listingId },
      OR: [{ localityId }, { cityId }],
    },
    include: cardInclude,
    orderBy: [{ localityId: "asc" }, { rating: "desc" }],
    take: 4,
  });
  return rows.map((r) => toCard(r));
}

export const getFaqs = cache((entityType: string, entityId: string) =>
  db.faq.findMany({
    where: { entityType, entityId },
    orderBy: { sortOrder: "asc" },
  })
);

export const getOperators = cache(() =>
  db.operator.findMany({
    include: { _count: { select: { listings: { where: { status: "published" } } } } },
  })
);

/**
 * Real channel partners — the operator brands we actually carry inventory for,
 * ranked by live listing count. Replaces the old hardcoded brochure list, so
 * the homepage can never advertise a partner we don't list.
 */
export const getChannelPartners = cache(async (limit = 12) => {
  const rows = await db.operator.findMany({
    include: { _count: { select: { listings: { where: { status: "published" } } } } },
  });
  return rows
    .filter((o) => o._count.listings > 0)
    .sort((a, b) => {
      // brands whose logo we hold lead the wall, then by inventory depth
      const logoDiff = Number(Boolean(b.logoUrl)) - Number(Boolean(a.logoUrl));
      return logoDiff !== 0 ? logoDiff : b._count.listings - a._count.listings;
    })
    .slice(0, limit)
    .map((o) => ({
      slug: o.slug,
      name: o.name,
      logo: o.logoUrl || null,
      listings: o._count.listings,
    }));
});

export interface LocalityChip { slug: string; name: string; count: number }
export interface LocalityGeo { slug: string; name: string; city: string; lat: number; lng: number }

/**
 * Powers the hero search: per product, the most-stocked localities in each city
 * (for the "popular locations" chips) plus their coordinates (for "near me").
 * Only localities that actually hold inventory for that product are included,
 * so neither feature can send someone to an empty page.
 */
export const getPopularLocalities = cache(
  async (productTypes: string[], perCity = 10) => {
    const out: Record<string, { chips: Record<string, LocalityChip[]>; geo: LocalityGeo[] }> = {};
    for (const productType of productTypes) {
      const rows = await db.locality.findMany({
        include: {
          city: { select: { slug: true } },
          _count: {
            select: { listings: { where: { status: "published", plans: { some: { productType } } } } },
          },
        },
      });
      const chips: Record<string, LocalityChip[]> = {};
      const geo: LocalityGeo[] = [];
      for (const r of rows) {
        if (r._count.listings === 0) continue;
        (chips[r.city.slug] ??= []).push({ slug: r.slug, name: r.name, count: r._count.listings });
        geo.push({ slug: r.slug, name: r.name, city: r.city.slug, lat: r.lat, lng: r.lng });
      }
      for (const c of Object.keys(chips)) {
        chips[c] = chips[c].sort((a, b) => b.count - a.count).slice(0, perCity);
      }
      out[productType] = { chips, geo };
    }
    return out;
  }
);

/** Total distinct operator brands with live inventory (for the stats band). */
export const getOperatorCount = cache(async () => {
  const rows = await db.operator.findMany({
    select: { _count: { select: { listings: { where: { status: "published" } } } } },
  });
  return rows.filter((o) => o._count.listings > 0).length;
});

/* ─── Blog ──────────────────────────────────────────────────────────── */

export const getBlogPosts = cache((categorySlug?: string) =>
  db.blogPost.findMany({
    where: {
      status: "published",
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: { category: true, author: true, tags: { include: { tag: true } } },
    orderBy: { publishedAt: "desc" },
  })
);

export const getBlogPost = cache((slug: string) =>
  db.blogPost.findUnique({
    where: { slug },
    include: { category: true, author: true, tags: { include: { tag: true } } },
  })
);

export const getBlogCategories = cache(() =>
  db.blogCategory.findMany({
    include: { _count: { select: { posts: { where: { status: "published" } } } } },
  })
);

export const getAuthor = cache((slug: string) =>
  db.author.findUnique({
    where: { slug },
    include: {
      posts: {
        where: { status: "published" },
        include: { category: true, author: true, tags: { include: { tag: true } } },
        orderBy: { publishedAt: "desc" },
      },
    },
  })
);

/** Locality quality gate: publish/index only with ≥3 live listings. */
export const LOCALITY_INDEX_THRESHOLD = 3;
