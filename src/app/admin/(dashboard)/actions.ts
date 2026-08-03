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
