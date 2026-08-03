import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { PRODUCTS, CITIES, SITE } from "@/lib/site";
import { LOCALITY_INDEX_THRESHOLD } from "@/lib/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.domain;
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // 7 product hubs
  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${base}/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  // 21 product × city pages (3 cities only — hard constraint)
  const cityPages: MetadataRoute.Sitemap = PRODUCTS.flatMap((p) =>
    CITIES.map((c) => ({
      url: `${base}/${p.slug}/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }))
  );

  // Locality pages — only those passing the ≥3 live listings quality gate
  const localities = await db.locality.findMany({
    include: {
      city: true,
      _count: { select: { listings: { where: { status: "published" } } } },
    },
  });
  const localityPages: MetadataRoute.Sitemap = localities
    .filter((l) => l._count.listings >= LOCALITY_INDEX_THRESHOLD)
    .flatMap((l) =>
      PRODUCTS.map((p) => ({
        url: `${base}/${p.slug}/${l.city.slug}/${l.slug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }))
    );

  // Listings
  const listings = await db.listing.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });
  const listingPages: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${base}/spaces/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  // Blog
  const posts = await db.blogPost.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
  });
  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.category.slug}/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...cityPages, ...localityPages, ...listingPages, ...blogPages];
}
