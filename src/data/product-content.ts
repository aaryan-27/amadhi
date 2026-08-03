import type { ProductType } from "@/lib/site";

export interface ProductContent {
  h1: string;
  intro: string;
  benefits: { title: string; body: string }[];
  howItWorks: { title: string; body: string }[];
  crossSell: ProductType[];
  virtualOfficeExtras?: {
    useCases: { title: string; body: string }[];
    documents: string[];
    turnaround: string;
    tiers: { name: string; price: string; features: string[] }[];
  };
}

const defaultHowItWorks = [
  { title: "Tell us your requirement", body: "Share team size, budget and preferred localities — takes under a minute, no account needed." },
  { title: "Get a curated shortlist", body: "A workspace expert sends 3–5 matched options with transparent pricing within hours." },
  { title: "Visit with an expert", body: "Book slots that suit you. We accompany every visit and ask the questions you'd forget." },
  { title: "Move in at the best rate", body: "We negotiate directly with operators. Zero brokerage — you often pay below rack rate." },
];

export const PRODUCT_CONTENT: Record<ProductType, ProductContent> = {
  coworking: {
    h1: "Coworking Spaces in Delhi NCR",
    intro:
      "Flexible, fully-serviced shared workspaces in Gurugram, Noida and Delhi. One membership covers your desk, internet, meeting rooms, café and community — with terms that flex as your team grows.",
    benefits: [
      { title: "Everything included", body: "Furniture, high-speed internet, housekeeping, power backup and front desk — one predictable monthly bill." },
      { title: "Flexible terms", body: "Monthly rolling memberships and easy seat additions. Scale from 1 to 100 seats without renegotiating a lease." },
      { title: "Prime locations", body: "Metro-connected addresses in Cyber City, Sector 62 and Connaught Place that impress clients and shorten commutes." },
      { title: "Instant community", body: "Events, networking and serendipity — coworking puts your team next to founders, freelancers and Fortune 500 satellites." },
    ],
    howItWorks: defaultHowItWorks,
    crossSell: ["dedicated_desk", "private_cabin", "managed_office"],
  },
  managed_office: {
    h1: "Managed Office Spaces in Delhi NCR",
    intro:
      "Private, fully-managed offices delivered ready-to-work. An operator finds the space, builds it to your brand and runs facilities daily — you pay one per-seat fee and focus on the business.",
    benefits: [
      { title: "Your brand, your access control", body: "A self-contained office with your logo at the door, your layout and your security policies — without the CapEx." },
      { title: "OpEx, not CapEx", body: "No fit-out investment, no facility vendors, no depreciation. One monthly fee covers everything." },
      { title: "Delivered in weeks", body: "Typical NCR managed offices hand over in 2–4 weeks versus 4–8 months for a traditional lease and fit-out." },
      { title: "Elastic footprint", body: "Expansion options and shorter terms (12–36 months) protect you from over-committing ahead of headcount." },
    ],
    howItWorks: defaultHowItWorks,
    crossSell: ["office_leasing", "private_cabin", "coworking"],
  },
  private_cabin: {
    h1: "Private Cabins in Delhi NCR",
    intro:
      "Lockable private offices inside premium coworking centres across Gurugram, Noida and Delhi. Your team gets privacy and security; you keep the flexibility and amenities of a shared campus.",
    benefits: [
      { title: "Privacy with perks", body: "A lockable cabin for your team plus access to cafés, meeting rooms and events on the campus." },
      { title: "Team-sized options", body: "Cabins from 2 to 20+ seats, many with adjacency options so growing teams stay together." },
      { title: "Move-in ready", body: "Furnished, connected and serviced from day one. Most cabins can be occupied within 48 hours." },
      { title: "Predictable cost", body: "Per-cabin pricing with everything included — easier budgeting than per-seat open desks for stable teams." },
    ],
    howItWorks: defaultHowItWorks,
    crossSell: ["managed_office", "dedicated_desk", "meeting_room"],
  },
  dedicated_desk: {
    h1: "Dedicated Desks in Delhi NCR",
    intro:
      "Your own reserved desk in a professional shared workspace — same seat, same neighbours, your monitor stays put. The sweet spot between hot-desking and a private cabin.",
    benefits: [
      { title: "A desk that's yours", body: "Leave your setup, lock your drawer. Consistency without the cost of a cabin." },
      { title: "Business address included", body: "Most dedicated desk plans include mail handling and a professional address for your registrations." },
      { title: "All-inclusive", body: "Internet, meeting room credits, printing and café access bundled into one monthly price." },
      { title: "Community on tap", body: "Sit alongside other builders — the network effect of coworking with the stability of a fixed seat." },
    ],
    howItWorks: defaultHowItWorks,
    crossSell: ["coworking", "private_cabin", "virtual_office"],
  },
  meeting_room: {
    h1: "Meeting Rooms in Delhi NCR",
    intro:
      "Professional meeting and board rooms by the hour in Gurugram, Noida and Delhi. Client-ready spaces with displays, video-conferencing and front-desk support — booked on request, confirmed in minutes.",
    benefits: [
      { title: "Pay per hour", body: "From ₹399/hour for 4–6 seaters to executive boardrooms — no memberships required." },
      { title: "Client-ready by default", body: "Displays, VC bars, whiteboards and beverage service. A front desk that receives your guests properly." },
      { title: "Every district covered", body: "Rooms near your client, not just near you — Cyber City to Connaught Place to Sector 62." },
      { title: "Fast confirmation", body: "Request a slot and we confirm availability on WhatsApp within minutes, with transparent pricing." },
    ],
    howItWorks: [
      { title: "Pick a room and slot", body: "Filter by capacity, district and budget; choose your date and start time." },
      { title: "Send the request", body: "No payment needed now — requests are free and unconditional." },
      { title: "Get confirmation", body: "We verify availability with the operator and confirm on WhatsApp, usually within minutes." },
      { title: "Walk in and present", body: "The room is set up to your requirements. Pay the operator directly on the day." },
    ],
    crossSell: ["coworking", "virtual_office", "dedicated_desk"],
  },
  office_leasing: {
    h1: "Office Space Leasing in Delhi NCR",
    intro:
      "Enterprise-grade leased offices from 5,000 sq ft to entire towers across Gurugram, Noida and Delhi. Institutional advice, transparent economics and end-to-end transaction support — at zero cost to occupiers.",
    benefits: [
      { title: "Institutional access", body: "Direct lines to landlords and IPCs across NCR's Grade-A stock, including off-market availabilities." },
      { title: "Full transaction support", body: "From LOI to registration — commercial negotiation, legal coordination and fit-out planning under one desk." },
      { title: "Data-backed economics", body: "Live comparables on rents, CAM, escalations and incentives so you negotiate from strength." },
      { title: "Long-term partnership", body: "Renewals, expansions, exits and portfolio strategy — we stay accountable after the deal closes." },
    ],
    howItWorks: [
      { title: "Brief the enterprise desk", body: "Headcount plan, budget, timing and technical requirements — under NDA if needed." },
      { title: "Tour a curated pipeline", body: "We present on-market and off-market options with full financial modelling." },
      { title: "Negotiate the term sheet", body: "Rent, fit-out contribution, rent-free period, escalation and exit clauses — benchmarked against live deals." },
      { title: "Close and build", body: "Legal, registration and fit-out coordination through to handover day." },
    ],
    crossSell: ["managed_office", "coworking", "meeting_room"],
  },
  virtual_office: {
    h1: "Virtual Offices in Delhi NCR",
    intro:
      "A premium business address in Gurugram, Noida or Delhi — with the compliant documentation you need for GST registration, company incorporation and professional correspondence. From ₹899/month, delivered in 24–48 hours.",
    benefits: [
      { title: "Prestige address", body: "Cyber City, Connaught Place or Sector 62 on your letterhead, website and GST certificate." },
      { title: "Compliance-grade paperwork", body: "Rent agreement, NOC and utility bill prepared correctly the first time — verification-tested buildings." },
      { title: "Mail & call handling", body: "Professional reception receives your post and couriers; add call answering on higher tiers." },
      { title: "Fraction of the cost", body: "All the credibility of a business district address at 2–4% of the cost of physical space." },
    ],
    howItWorks: [
      { title: "Choose city and plan", body: "Pick the address and tier that matches your use case — GST, incorporation or correspondence." },
      { title: "Share KYC documents", body: "Standard entity and director KYC over email or WhatsApp. We check everything before drafting." },
      { title: "Receive your kit in 24–48h", body: "Signed agreement, NOC and utility bill — ready to file with your GST or MCA application." },
      { title: "File with confidence", body: "Our operators handle physical verification visits professionally, including signage requirements." },
    ],
    crossSell: ["dedicated_desk", "coworking", "meeting_room"],
    virtualOfficeExtras: {
      useCases: [
        { title: "GST registration (PPOB/APOB)", body: "Register your principal or additional place of business in Delhi, Haryana or UP to sell into NCR marketplaces and B2B clients." },
        { title: "Company incorporation", body: "A registered office address for your Private Limited, LLP or OPC — accepted by the MCA with our documentation kit." },
        { title: "Business correspondence", body: "A professional address for banking, invoicing and client communication, with mail forwarding to anywhere in India." },
      ],
      documents: [
        "Notarised rent/service agreement in your entity's name",
        "No-Objection Certificate (NOC) from the premises owner",
        "Latest utility bill of the premises",
        "Signage photo & geo-tagged verification support",
        "KYC checklist and filing guidance",
      ],
      turnaround: "Documentation delivered within 24–48 hours of KYC completion — or your first month is free.",
      tiers: [
        { name: "Business Address", price: "₹899/mo", features: ["Premium address for correspondence", "Mail & courier handling", "Billed annually"] },
        { name: "GST Registration", price: "₹1,199/mo", features: ["Everything in Business Address", "GST-compliant documentation kit", "Verification visit support", "Billed annually"] },
        { name: "Incorporation +", price: "₹1,499/mo", features: ["Everything in GST Registration", "MCA registered-office kit", "Meeting room hours included", "Billed annually"] },
      ],
    },
  },
};
