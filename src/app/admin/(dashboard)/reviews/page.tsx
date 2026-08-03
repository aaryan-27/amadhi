import { db } from "@/lib/db";
import { Star } from "lucide-react";
import { ModerateButtons } from "./moderate-buttons";

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { listing: { select: { name: true, slug: true } } },
    take: 100,
  });
  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");

  const ReviewCard = ({ review }: { review: (typeof reviews)[number] }) => (
    <article className="rounded-2xl border border-navy-800 bg-navy-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold text-cream-100">
            {review.name}
            <span className="ml-2 inline-flex items-center gap-0.5 text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden /> {review.rating}
            </span>
          </p>
          <p className="text-xs text-navy-400">
            {review.persona && `${review.persona} · `}
            {review.listing.name} ·{" "}
            {review.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <span
          className={
            review.status === "approved"
              ? "rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-400"
              : review.status === "rejected"
                ? "rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-400"
                : "rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-400"
          }
        >
          {review.status}
        </span>
      </div>
      {review.title && <p className="mt-3 text-sm font-medium text-navy-100">{review.title}</p>}
      <p className="mt-1.5 text-sm leading-relaxed text-navy-300">{review.body}</p>
      <div className="mt-4">
        <ModerateButtons reviewId={review.id} status={review.status} />
      </div>
    </article>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream-100">Review moderation</h1>
      <p className="mt-1 text-sm text-navy-300">
        {pending.length} pending · approving recomputes the listing&apos;s aggregate rating.
      </p>

      {pending.length > 0 && (
        <section aria-label="Pending reviews" className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">Pending</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        </section>
      )}

      <section aria-label="Moderated reviews" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy-400">History</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {rest.slice(0, 20).map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      </section>
    </div>
  );
}
