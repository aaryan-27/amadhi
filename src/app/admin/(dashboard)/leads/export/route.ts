import { db } from "@/lib/db";
import { auth, canAccess } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canAccess(role, "leads")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { name: true } },
      city: { select: { name: true } },
      locality: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const header = "Created,Type,Name,Phone,Email,Product,Seats,Listing,City,Locality,Status,Assignee,Source,UTM";
  const rows = leads.map((l) =>
    [
      l.createdAt.toISOString(),
      l.type, l.name, l.phone, l.email, l.productType, l.seats,
      l.listing?.name ?? "", l.city?.name ?? "", l.locality?.name ?? "",
      l.status, l.assignee?.name ?? "", l.source, l.utmJson,
    ].map(esc).join(",")
  );

  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="amadhi-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
