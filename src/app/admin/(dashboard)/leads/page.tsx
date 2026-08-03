import { db } from "@/lib/db";
import { Download } from "lucide-react";
import { LeadBoard } from "./lead-board";

export default async function AdminLeadsPage() {
  const [leads, admins] = await Promise.all([
    db.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { name: true, slug: true } },
        city: { select: { name: true } },
        locality: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      },
      take: 200,
    }),
    db.adminUser.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const plain = leads.map((l) => ({
    id: l.id,
    type: l.type,
    name: l.name,
    phone: l.phone,
    email: l.email,
    message: l.message,
    productType: l.productType,
    seats: l.seats,
    status: l.status,
    listingName: l.listing?.name ?? null,
    cityName: l.city?.name ?? null,
    localityName: l.locality?.name ?? null,
    assignedTo: l.assignee?.id ?? "",
    assigneeName: l.assignee?.name ?? null,
    utm: l.utmJson,
    slaDueAt: l.slaDueAt?.toISOString() ?? null,
    firstRespondedAt: l.firstRespondedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream-100">Lead pipeline</h1>
          <p className="mt-1 text-sm text-navy-300">
            {leads.length} leads · drag-free kanban — move leads with the status menu on each card.
          </p>
        </div>
        <a
          href="/admin/leads/export"
          download
          className="flex h-10 items-center gap-2 rounded-xl border border-navy-700 px-4 text-sm font-medium text-navy-100 hover:border-navy-500"
        >
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </a>
      </div>
      <LeadBoard leads={plain} admins={admins} />
    </div>
  );
}
