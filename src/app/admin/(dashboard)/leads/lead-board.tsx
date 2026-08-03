"use client";

import { useTransition } from "react";
import { Phone, MessageCircle, Mail, Clock } from "lucide-react";
import { updateLeadStatus, assignLead } from "../actions";
import { cn } from "@/lib/utils";

export interface PlainLead {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  productType: string;
  seats: string;
  status: string;
  listingName: string | null;
  cityName: string | null;
  localityName: string | null;
  assignedTo: string;
  assigneeName: string | null;
  utm: string;
  slaDueAt: string | null;
  firstRespondedAt: string | null;
  createdAt: string;
}

const COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "new", label: "New", tone: "border-t-accent-400" },
  { key: "contacted", label: "Contacted", tone: "border-t-sky-400" },
  { key: "visit_scheduled", label: "Visit Scheduled", tone: "border-t-amber-400" },
  { key: "negotiation", label: "Negotiation", tone: "border-t-purple-400" },
  { key: "won", label: "Won", tone: "border-t-emerald-400" },
  { key: "lost", label: "Lost", tone: "border-t-navy-600" },
];

function SlaBadge({ lead }: { lead: PlainLead }) {
  if (lead.firstRespondedAt || lead.status !== "new" || !lead.slaDueAt) return null;
  const msLeft = new Date(lead.slaDueAt).getTime() - Date.now();
  const overdue = msLeft < 0;
  const mins = Math.abs(Math.round(msLeft / 60000));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        overdue ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
      )}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {overdue ? `SLA overdue ${mins}m` : `SLA ${mins}m left`}
    </span>
  );
}

export function LeadBoard({
  leads,
  admins,
}: {
  leads: PlainLead[];
  admins: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("mt-6 grid gap-4 overflow-x-auto pb-4 lg:grid-cols-3 xl:grid-cols-6", pending && "opacity-70")}>
      {COLUMNS.map((col) => {
        const items = leads.filter((l) => l.status === col.key);
        return (
          <section key={col.key} aria-label={`${col.label} leads`} className="min-w-56">
            <h2 className={cn("rounded-t-xl border-t-2 bg-navy-900 px-3.5 py-2.5 font-display text-sm font-semibold text-cream-100", col.tone)}>
              {col.label} <span className="ml-1 text-xs font-normal text-navy-400">{items.length}</span>
            </h2>
            <div className="space-y-2.5 rounded-b-xl bg-navy-900/50 p-2.5">
              {items.map((lead) => (
                <article key={lead.id} className="rounded-xl border border-navy-800 bg-navy-900 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-cream-100">{lead.name}</p>
                    <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-navy-300">
                      {lead.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-navy-300">
                    {lead.listingName ?? [lead.localityName, lead.cityName].filter(Boolean).join(", ") ?? "General"}
                  </p>
                  {(lead.productType || lead.seats) && (
                    <p className="mt-0.5 text-xs text-navy-400">
                      {[lead.productType.replace("_", " "), lead.seats && `${lead.seats} seats`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-2"><SlaBadge lead={lead} /></div>

                  {/* Quick actions */}
                  <div className="mt-2.5 flex gap-1.5">
                    {lead.phone && (
                      <>
                        <a href={`tel:${lead.phone}`} aria-label={`Call ${lead.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-navy-200 hover:text-cream-100">
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                        </a>
                        <a
                          href={`https://wa.me/91${lead.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hi ${lead.name.split(" ")[0]}, this is Amadhi — thanks for your enquiry!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${lead.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-navy-200 hover:text-emerald-400"
                        >
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} aria-label={`Email ${lead.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-navy-200 hover:text-cream-100">
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>

                  {/* Status + assignment */}
                  <div className="mt-2.5 space-y-1.5">
                    <label className="sr-only" htmlFor={`status-${lead.id}`}>Change status</label>
                    <select
                      id={`status-${lead.id}`}
                      value={lead.status}
                      onChange={(e) => startTransition(() => updateLeadStatus(lead.id, e.target.value))}
                      className="h-8 w-full rounded-lg border border-navy-700 bg-navy-950 px-2 text-xs text-navy-100"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`assign-${lead.id}`}>Assign executive</label>
                    <select
                      id={`assign-${lead.id}`}
                      value={lead.assignedTo}
                      onChange={(e) => startTransition(() => assignLead(lead.id, e.target.value))}
                      className="h-8 w-full rounded-lg border border-navy-700 bg-navy-950 px-2 text-xs text-navy-100"
                    >
                      <option value="">Unassigned</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-[10px] text-navy-500">
                    {new Date(lead.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </article>
              ))}
              {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-navy-500">No leads</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
