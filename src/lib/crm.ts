import { after } from "next/server";
import { SITE, productByType } from "@/lib/site";

/**
 * Pushes website leads into Amadhi CRM (crm.amadhi.com).
 *
 * The push runs after the response is sent (`after`), so a slow or offline CRM
 * never delays or fails the visitor's form submission — the lead is always
 * saved in our own database first. The CRM call is idempotent on the website
 * lead id, so `scripts/sync-leads-to-crm.mjs` can safely re-send anything
 * that was missed.
 *
 * Env: CRM_URL (on the VPS: http://127.0.0.1:8082), CRM_API_KEY, CRM_API_SECRET.
 * Unset → the integration is off and nothing is sent.
 */

export type CrmLead = {
  websiteLeadId: string;
  type: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  company?: string | null;
  productType?: string | null;
  seats?: string | null;
  budget?: string | null;
  moveIn?: string | null;
  city?: string | null;
  locality?: string | null;
  listing?: { name: string; slug: string } | null;
  visitDate?: string | null;
  visitSlot?: string | null;
  utm?: Record<string, string> | null;
  landingPage?: string | null;
};

export function crmPayload(lead: CrmLead) {
  return {
    website_lead_id: lead.websiteLeadId,
    enquiry_type: lead.type,
    lead_name: lead.name,
    phone: lead.phone || null,
    email: lead.email || null,
    message: lead.message || null,
    company: lead.company || null,
    workspace_type: lead.productType ? (productByType(lead.productType)?.name ?? lead.productType) : null,
    seats: lead.seats || null,
    budget: lead.budget || null,
    move_in: lead.moveIn || null,
    city: lead.city || null,
    locality: lead.locality || null,
    space: lead.listing?.name ?? null,
    space_url: lead.listing ? `${SITE.domain}/spaces/${lead.listing.slug}` : null,
    visit_date: lead.visitDate || null,
    visit_slot: lead.visitSlot || null,
    utm: lead.utm ?? {},
    landing_page: lead.landingPage || null,
  };
}

/** Queue a lead for the CRM; returns immediately. */
export function sendLeadToCrm(lead: CrmLead) {
  const { CRM_URL, CRM_API_KEY, CRM_API_SECRET } = process.env;
  if (!CRM_URL || !CRM_API_KEY || !CRM_API_SECRET) return;

  after(async () => {
    try {
      const res = await fetch(`${CRM_URL}/api/method/amadhi_crm.api.website_lead`, {
        method: "POST",
        headers: {
          Authorization: `token ${CRM_API_KEY}:${CRM_API_SECRET}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(crmPayload(lead)),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[crm] lead ${lead.websiteLeadId} rejected: ${res.status} ${(await res.text()).slice(0, 300)}`);
      }
    } catch (err) {
      console.error(`[crm] lead ${lead.websiteLeadId} not sent:`, err);
    }
  });
}
