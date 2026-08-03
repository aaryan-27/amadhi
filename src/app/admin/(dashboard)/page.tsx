import Link from "next/link";
import { Inbox, Building2, PenSquare, CalendarCheck, Star, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";

export default async function AdminHome() {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [
    leadCount, leadWeek, visitCount, listingCount, publishedCount, blogCount,
    pendingReviews, recentLeads, activity, topLocalities,
  ] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    db.visitBooking.count(),
    db.listing.count(),
    db.listing.count({ where: { status: "published" } }),
    db.blogPost.count({ where: { status: "published" } }),
    db.review.count({ where: { status: "pending" } }),
    db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { listing: { select: { name: true } }, city: { select: { name: true } } },
    }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
    db.locality.findMany({
      include: { city: true, _count: { select: { listings: { where: { status: "published" } }, leads: true } } },
      take: 40,
    }),
  ]);

  const top5 = topLocalities
    .sort((a, b) => b._count.leads - a._count.leads || b._count.listings - a._count.listings)
    .slice(0, 5);

  const kpis = [
    { label: "Total leads", value: leadCount, sub: `+${leadWeek} this week`, icon: Inbox, href: "/admin/leads" },
    { label: "Visit bookings", value: visitCount, sub: "All time", icon: CalendarCheck, href: "/admin/leads" },
    { label: "Listings live", value: `${publishedCount}/${listingCount}`, sub: "Published / total", icon: Building2, href: "/admin/listings" },
    { label: "Blog posts", value: blogCount, sub: "Published", icon: PenSquare, href: "/admin/blog" },
    { label: "Reviews pending", value: pendingReviews, sub: "Awaiting moderation", icon: Star, href: "/admin/reviews" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream-100">Dashboard</h1>
      <p className="mt-1 text-sm text-navy-300">
        Traffic KPIs (GA4/Clarity) appear here once analytics IDs are configured in Settings.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-2xl border border-navy-800 bg-navy-900 p-5 transition-colors hover:border-navy-600">
            <k.icon className="h-5 w-5 text-accent-400" aria-hidden />
            <p className="mt-3 font-display text-2xl font-bold text-cream-100">{k.value}</p>
            <p className="text-sm text-navy-300">{k.label}</p>
            <p className="mt-1 text-xs text-navy-400">{k.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent leads */}
        <div className="rounded-2xl border border-navy-800 bg-navy-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-navy-800 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-cream-100">Recent leads</h2>
            <Link href="/admin/leads" className="text-sm text-accent-400 hover:underline">View pipeline →</Link>
          </div>
          <ul className="divide-y divide-navy-800">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-cream-100">
                    {lead.name} <span className="text-navy-400">· {lead.phone || lead.email}</span>
                  </p>
                  <p className="truncate text-xs text-navy-400">
                    {lead.type.replace("_", " ")} · {lead.listing?.name ?? lead.city?.name ?? "General"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-navy-800 px-2.5 py-1 text-xs capitalize text-navy-200">
                  {lead.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top localities + activity */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-navy-800 bg-navy-900">
            <h2 className="flex items-center gap-2 border-b border-navy-800 px-5 py-4 font-display text-base font-semibold text-cream-100">
              <TrendingUp className="h-4 w-4 text-accent-400" aria-hidden /> Top localities
            </h2>
            <ul className="divide-y divide-navy-800">
              {top5.map((l) => (
                <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-navy-100">{l.name}, {l.city.name}</span>
                  <span className="text-xs text-navy-400">{l._count.listings} live · {l._count.leads} leads</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-navy-800 bg-navy-900">
            <h2 className="border-b border-navy-800 px-5 py-4 font-display text-base font-semibold text-cream-100">
              Recent activity
            </h2>
            <ul className="divide-y divide-navy-800">
              {activity.map((a) => (
                <li key={a.id} className="px-5 py-2.5 text-xs text-navy-300">
                  <span className="text-navy-100">{a.user?.name ?? "System"}</span> — {a.action}
                  <span className="ml-1 text-navy-500">
                    {a.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
