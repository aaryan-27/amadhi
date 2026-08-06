"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth, canAccess } from "@/lib/auth";
import { slugify } from "@/lib/utils";

async function requireRole(module: Parameters<typeof canAccess>[1]) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canAccess(role, module)) {
    throw new Error("Not authorized");
  }
  return { userId: (session.user as { id?: string }).id, role };
}

async function log(userId: string | undefined, action: string, entity: string, entityId = "") {
  await db.activityLog.create({ data: { userId, action, entity, entityId } });
}

/* ─── Leads ─────────────────────────────────────────────────────────── */

export async function updateLeadStatus(leadId: string, status: string) {
  const { userId } = await requireRole("leads");
  const valid = ["new", "contacted", "visit_scheduled", "negotiation", "won", "lost"];
  if (!valid.includes(status)) throw new Error("Invalid status");
  const data: { status: string; firstRespondedAt?: Date } = { status };
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (lead && !lead.firstRespondedAt && status !== "new") data.firstRespondedAt = new Date();
  await db.lead.update({ where: { id: leadId }, data });
  await log(userId, `lead:${status}`, "lead", leadId);
  revalidatePath("/admin/leads");
}

export async function assignLead(leadId: string, adminUserId: string) {
  const { userId } = await requireRole("leads");
  await db.lead.update({
    where: { id: leadId },
    data: { assignedTo: adminUserId || null },
  });
  await log(userId, "lead:assign", "lead", leadId);
  revalidatePath("/admin/leads");
}

export async function addLeadNote(leadId: string, text: string) {
  const { userId } = await requireRole("leads");
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  const notes = JSON.parse(lead.notesJson || "[]");
  notes.push({ at: new Date().toISOString(), by: userId, text: text.slice(0, 1000) });
  await db.lead.update({ where: { id: leadId }, data: { notesJson: JSON.stringify(notes) } });
  revalidatePath("/admin/leads");
}

/* ─── Listings ──────────────────────────────────────────────────────── */

export async function toggleListingFlag(
  listingId: string,
  flag: "featured" | "trending" | "verified"
) {
  const { userId } = await requireRole("listings");
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Not found");
  await db.listing.update({ where: { id: listingId }, data: { [flag]: !listing[flag] } });
  await log(userId, `listing:toggle:${flag}`, "listing", listingId);
  revalidatePath("/admin/listings");
}

export async function setListingStatus(listingId: string, status: string) {
  const { userId } = await requireRole("listings");
  if (!["draft", "published", "archived"].includes(status)) throw new Error("Invalid status");
  await db.listing.update({ where: { id: listingId }, data: { status } });
  await log(userId, `listing:${status}`, "listing", listingId);
  revalidatePath("/admin/listings");
}

export async function updateListingCore(
  listingId: string,
  data: { name: string; summary: string; description: string; address: string; capacity: number }
) {
  const { userId } = await requireRole("listings");
  await db.listing.update({
    where: { id: listingId },
    data: {
      name: data.name.slice(0, 120),
      summary: data.summary.slice(0, 400),
      description: data.description.slice(0, 8000),
      address: data.address.slice(0, 300),
      capacity: Math.max(0, Math.min(10000, data.capacity)),
    },
  });
  await log(userId, "listing:update", "listing", listingId);
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
}

/** Everything the listing form can submit. Relations are replaced wholesale. */
export type ListingInput = {
  id?: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  cityId: string;
  localityId: string;
  /** Typed instead of picked — created inside the selected city. */
  newLocalityName?: string;
  operatorId: string;
  newOperatorName?: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  openingTime: string;
  closingTime: string;
  openDays: string;
  status: string;
  verified: boolean;
  featured: boolean;
  trending: boolean;
  virtualTourUrl: string;
  brochureUrl: string;
  nearby: { name: string; distanceKm: number; type: string }[];
  amenityIds: string[];
  images: { url: string; alt: string }[];
  plans: {
    productType: string;
    name: string;
    seatsMin: number;
    seatsMax: number;
    highlights: string;
    prices: { amount: number; period: string; unitNote: string }[];
  }[];
};

const PRODUCT_TYPES = [
  "coworking", "managed_office", "private_cabin", "dedicated_desk",
  "meeting_room", "office_leasing", "virtual_office",
];
const PERIODS = ["month", "hour", "day", "sqft_month", "year"];
/** Matches the floor applied across the imported inventory and the public copy. */
const PRICE_FLOOR_MONTH = 5999;

/** Append -2, -3 … until the slug is free. Ignores the row being edited. */
async function uniqueListingSlug(base: string, ignoreId?: string) {
  const root = slugify(base).slice(0, 90) || "listing";
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const clash = await db.listing.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/**
 * Create or update a listing and all of its relations.
 *
 * Images, amenities, plans and prices are replaced rather than diffed: the form
 * always submits the complete set, so a delete-then-insert inside one
 * transaction is both simpler and impossible to leave half-applied.
 */
export async function saveListing(input: ListingInput) {
  const { userId } = await requireRole("listings");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (!input.cityId) throw new Error("City is required");
  if (!input.localityId && !input.newLocalityName?.trim()) throw new Error("Locality is required");
  if (!["draft", "published", "archived"].includes(input.status)) throw new Error("Invalid status");

  const city = await db.city.findUnique({ where: { id: input.cityId } });
  if (!city) throw new Error("Unknown city");

  const lat = Number.isFinite(input.lat) ? input.lat : city.lat;
  const lng = Number.isFinite(input.lng) ? input.lng : city.lng;

  // A new space is often the first one in its locality, so allow creating one
  // inline rather than forcing a separate trip to the database.
  let localityId = input.localityId;
  if (input.newLocalityName?.trim()) {
    const localityName = input.newLocalityName.trim();
    const slug = slugify(localityName);
    const existing = await db.locality.findUnique({
      where: { cityId_slug: { cityId: city.id, slug } },
    });
    localityId =
      existing?.id ??
      (await db.locality.create({
        data: { slug, name: localityName, cityId: city.id, lat, lng },
      })).id;
  }
  const locality = await db.locality.findUnique({ where: { id: localityId } });
  if (!locality || locality.cityId !== city.id) throw new Error("Locality does not belong to that city");

  let operatorId: string | null = input.operatorId || null;
  if (input.newOperatorName?.trim()) {
    const operatorName = input.newOperatorName.trim();
    const slug = slugify(operatorName);
    const existing = await db.operator.findUnique({ where: { slug } });
    operatorId =
      existing?.id ??
      (await db.operator.create({ data: { slug, name: operatorName } })).id;
  }

  const slug = await uniqueListingSlug(input.slug?.trim() || name, input.id);

  const core = {
    name: name.slice(0, 120),
    slug,
    summary: input.summary.slice(0, 400),
    description: input.description.slice(0, 8000),
    cityId: city.id,
    localityId,
    operatorId,
    address: input.address.slice(0, 300),
    lat,
    lng,
    capacity: Math.max(0, Math.min(10000, Math.round(input.capacity) || 0)),
    openingTime: input.openingTime || "09:00",
    closingTime: input.closingTime || "20:00",
    openDays: input.openDays || "Mon–Sat",
    status: input.status,
    verified: input.verified,
    featured: input.featured,
    trending: input.trending,
    virtualTourUrl: input.virtualTourUrl.slice(0, 500),
    brochureUrl: input.brochureUrl.slice(0, 500),
    nearbyJson: JSON.stringify(
      input.nearby
        .filter((n) => n.name.trim())
        .map((n) => ({ name: n.name.trim(), distanceKm: Number(n.distanceKm) || 0, type: n.type || "landmark" }))
    ),
  };

  const images = input.images
    .filter((i) => i.url.trim())
    .map((i, index) => ({ url: i.url.trim(), alt: i.alt.trim().slice(0, 200), sortOrder: index }));

  const plans = input.plans
    .filter((p) => PRODUCT_TYPES.includes(p.productType))
    .map((p) => ({
      productType: p.productType,
      name: p.name.trim().slice(0, 120) || p.productType,
      seatsMin: Math.max(1, Math.round(p.seatsMin) || 1),
      seatsMax: Math.max(Math.max(1, Math.round(p.seatsMin) || 1), Math.round(p.seatsMax) || 1),
      highlights: p.highlights.slice(0, 2000),
      prices: p.prices
        .filter((pr) => Number(pr.amount) > 0 && PERIODS.includes(pr.period))
        .map((pr) => ({
          // Keeps a hand-entered listing consistent with the ₹5,999 floor the
          // rest of the catalogue and the marketing copy promise.
          amount: pr.period === "month" ? Math.max(PRICE_FLOOR_MONTH, Math.round(pr.amount)) : Math.round(pr.amount),
          period: pr.period,
          unitNote: pr.unitNote.slice(0, 60),
        })),
    }));

  const amenityIds = [...new Set(input.amenityIds)].filter(Boolean);

  const listingId = await db.$transaction(async (tx) => {
    let id = input.id;

    if (id) {
      await tx.listing.update({ where: { id }, data: core });
      // Cascades cover images/amenities; plans are cleared explicitly so their
      // prices go with them.
      await tx.listingImage.deleteMany({ where: { listingId: id } });
      await tx.listingAmenity.deleteMany({ where: { listingId: id } });
      await tx.plan.deleteMany({ where: { listingId: id } });
    } else {
      id = (await tx.listing.create({ data: core })).id;
    }

    if (images.length) await tx.listingImage.createMany({ data: images.map((i) => ({ ...i, listingId: id! })) });
    if (amenityIds.length) {
      await tx.listingAmenity.createMany({ data: amenityIds.map((amenityId) => ({ listingId: id!, amenityId })) });
    }
    for (const plan of plans) {
      const { prices, ...planCore } = plan;
      const created = await tx.plan.create({ data: { ...planCore, listingId: id! } });
      if (prices.length) await tx.plan.update({
        where: { id: created.id },
        data: { prices: { create: prices } },
      });
    }
    return id!;
  });

  await log(userId, input.id ? "listing:update" : "listing:create", "listing", listingId);

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath(`/spaces/${slug}`);
  revalidatePath("/", "layout");

  return { id: listingId, slug };
}

/* ─── Reviews moderation ────────────────────────────────────────────── */

export async function moderateReview(reviewId: string, status: "approved" | "rejected") {
  const { userId } = await requireRole("reviews");
  const review = await db.review.update({ where: { id: reviewId }, data: { status } });
  // Recompute listing aggregate
  const approved = await db.review.findMany({
    where: { listingId: review.listingId, status: "approved" },
    select: { rating: true },
  });
  const rating = approved.length
    ? +(approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1)
    : 0;
  await db.listing.update({
    where: { id: review.listingId },
    data: { rating, reviewCount: approved.length },
  });
  await log(userId, `review:${status}`, "review", reviewId);
  revalidatePath("/admin/reviews");
}

/* ─── Blog ──────────────────────────────────────────────────────────── */

export async function saveBlogPost(input: {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  body: string;
  coverImage: string;
  categoryId: string;
  authorId: string;
  seoTitle: string;
  seoDesc: string;
  status: string;
}) {
  const { userId } = await requireRole("blog");
  const slug = slugify(input.slug || input.title).slice(0, 120);
  const readMins = Math.max(1, Math.round(input.body.split(/\s+/).length / 220));
  const data = {
    title: input.title.slice(0, 200),
    slug,
    excerpt: input.excerpt.slice(0, 400),
    body: input.body,
    coverImage: input.coverImage,
    categoryId: input.categoryId,
    authorId: input.authorId,
    seoTitle: input.seoTitle.slice(0, 70),
    seoDesc: input.seoDesc.slice(0, 170),
    status: ["draft", "published", "scheduled", "archived"].includes(input.status)
      ? input.status
      : "draft",
    readMins,
    publishedAt: input.status === "published" ? new Date() : undefined,
  };
  const post = input.id
    ? await db.blogPost.update({ where: { id: input.id }, data })
    : await db.blogPost.create({ data });
  await log(userId, input.id ? "blog:update" : "blog:create", "blog", post.id);
  revalidatePath("/admin/blog");
  return { id: post.id, slug: post.slug };
}

export async function deleteBlogPost(postId: string) {
  const { userId } = await requireRole("blog");
  await db.blogPostTag.deleteMany({ where: { postId } });
  await db.blogPost.delete({ where: { id: postId } });
  await log(userId, "blog:delete", "blog", postId);
  revalidatePath("/admin/blog");
}

/* ─── Settings ──────────────────────────────────────────────────────── */

export async function saveSetting(key: string, value: string) {
  const { userId } = await requireRole("settings");
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  await log(userId, "setting:update", "setting", key);
  revalidatePath("/admin/settings");
}
