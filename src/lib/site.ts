/**
 * Amadhi site-wide configuration & taxonomy.
 * Markets: Gurugram, Noida, Delhi ONLY. No Day Pass product.
 */

export const SITE = {
  name: "Amadhi",
  tagline: "Your space to grow",
  heroStat: "100K+ Spaces. One Platform. Zero Brokerage.",
  subline: "Amadhi, your gateway to smarter, flexible and professional work environments",
  domain: "https://www.amadhi.com",
  description:
    "Amadhi is Delhi NCR's premium coworking and managed office marketplace. 100K+ spaces, one platform, zero brokerage — verified workspaces in Gurugram, Noida and Delhi.",
  phone: "+91 92113 49922",
  phoneHref: "tel:+919211349922",
  phone2: "+91 87964 69922",
  phone2Href: "tel:+918796469922",
  whatsapp: "919211349922",
  email: "hello@amadhi.com",
  hours: "Mon–Fri, 9 am – 6 pm",
  address: {
    line1: "Unit No. 507, AIPL Joy Street",
    line2: "Sector 66",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122018",
    lat: 28.3928,
    lng: 77.0665,
  },
  social: {
    linkedin: "https://www.linkedin.com/company/broklinkconsulting/",
    instagram: "https://www.instagram.com/amadhi.spaces",
    twitter: "https://x.com/amadhispaces",
  },
} as const;

/* ─── Partner logo walls (extracted from the official Amadhi brochure) ── */

export const CHANNEL_PARTNERS = [
  { name: "alt.f coworking", logo: "/partners/altf.png" },
  { name: "Regus", logo: "/partners/regus.png" },
  { name: "COWRKS", logo: "/partners/cowrks.png" },
  { name: "URBNWRK", logo: "/partners/urbanwrk.png" },
  { name: "Spring House Workspaces", logo: "/partners/springhouse.png" },
  { name: "The Circle.Work", logo: "/partners/circlework.png" },
  { name: "Ofis Square", logo: "/partners/ofissquare.png" },
  { name: "Innov8", logo: null },
  { name: "91Springboard", logo: "/partners/91springboard.png" },
  { name: "Smartworks", logo: "/partners/smartworks.png" },
  { name: "WeWork", logo: null },
  { name: "CorporatEdge", logo: null },
] as const;

/**
 * Client logos for the "Businesses leveraging Amadhi" strip. These live under
 * /clients (not /partners — that folder is workspace operators) and are stored
 * with a transparent outer plate so they sit directly on the section wash.
 */
export const BUSINESS_PARTNERS = [
  { name: "SAP", logo: "/clients/sap.png" },
  { name: "RateGain", logo: "/clients/rategain.png" },
  { name: "Nuvama Wealth", logo: "/clients/nuvama.png" },
  { name: "Shyft", logo: "/clients/shyft.png" },
  { name: "Xoxoday", logo: "/clients/xoxoday.png" },
  { name: "SiriusAI", logo: "/clients/siriusai.png" },
  { name: "Contempo", logo: "/clients/contempo.png" },
  { name: "Jimmy's Cocktails", logo: "/clients/jimmys.png" },
  { name: "TradeGhar", logo: "/clients/tradeghar.png" },
  { name: "OakBridge Advisory", logo: "/clients/oakbridge.png" },
  { name: "Plantd", logo: "/clients/plantd.png" },
  { name: "Spare", logo: "/clients/spare.png" },
  { name: "Loomiz", logo: "/clients/loomiz.png" },
  { name: "Dove Soft", logo: "/clients/dovesoft.png" },
] as const;

/**
 * Real client testimonials from amadhi.com.
 * `company`/`logo` are only set where we hold an attribution. Logos point at
 * /clients/tight — the mark cropped free of its canvas padding, so it still
 * reads at avatar size. Reviewers without one render an initials monogram
 * rather than an invented company mark.
 */
export interface Testimonial {
  quote: string;
  name: string;
  persona: string;
  company?: string;
  logo?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Amadhi's support in finding a coworking space that met our needs was invaluable. They were responsive, provided honest advice, and patiently listened to all details, offering prompt and helpful information. Their proactive approach and quick responses make them a great organisation to work with.",
    name: "Amrita Saini",
    persona: "HR Manager",
    company: "Shyft",
    logo: "/clients/tight/shyft.png",
  },
  {
    quote:
      "Our office in Gurgaon embodies a lively and energetic atmosphere, fostering productivity and teamwork with excellent facilities. Amadhi and the team were instrumental in helping us find the perfect space that met all our needs, making the transition smooth and easy.",
    name: "Mukhtesh Narula",
    persona: "Founder",
    company: "Dove Soft",
    logo: "/clients/tight/dovesoft.png",
  },
  {
    quote:
      "As a company venturing into India, we were clueless about the co-working office market in Gurgaon. Their expertise, from exploring options to finalising the lease, was invaluable. We highly recommend their services for anyone seeking office space.",
    name: "Saurabh Shah",
    persona: "Director",
    company: "Spare",
    logo: "/clients/tight/spare.png",
  },
  {
    quote:
      "We had a seamless experience with Amadhi while renting our workspace. What impressed me the most was their attention to detail and commitment to ensuring a hassle-free experience. Their dedication to customer satisfaction sets them apart from the rest.",
    name: "Rajan Kamboj",
    persona: "Founder",
    company: "DreamITCS",
    logo: "https://res.cloudinary.com/o2gthvvd/image/upload/v1785501857/amadhi/clients/dreamitcs.jpg",
  },
  {
    quote:
      "Amadhi and the team provided excellent service, responding promptly with several options to choose from. Their quick response and range of choices made the experience efficient and accommodating, showcasing their commitment to hassle-free, quality service.",
    name: "Anshul",
    persona: "Chief Product Officer",
    company: "Plantd",
    logo: "/clients/tight/plantd.png",
  },
];

export function waLink(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

/* ─── Product taxonomy ──────────────────────────────────────────────── */

export type ProductType =
  | "coworking"
  | "managed_office"
  | "private_cabin"
  | "dedicated_desk"
  | "meeting_room"
  | "office_leasing"
  | "virtual_office";

export interface ProductDef {
  type: ProductType;
  slug: string; // URL segment, e.g. /coworking-space
  name: string;
  plural: string;
  shortDesc: string;
  /** Entry price, taken from live inventory minimums. */
  fromPriceLabel: string;
  unit: string;
  /** True when we hold no published entry price for this product yet. */
  priceOnRequest?: boolean;
  icon: string; // lucide icon name
}

export const PRODUCTS: ProductDef[] = [
  {
    type: "coworking",
    slug: "coworking-space",
    name: "Coworking Space",
    plural: "Coworking Spaces",
    shortDesc: "Flexible shared workspaces with everything included",
    fromPriceLabel: "₹5,999",
    unit: "seat/month",
    icon: "Users",
  },
  {
    type: "managed_office",
    slug: "managed-office",
    name: "Managed Office",
    plural: "Managed Offices",
    shortDesc: "Fully-serviced private offices run for your team",
    fromPriceLabel: "₹5,999",
    unit: "seat/month",
    icon: "Building2",
  },
  {
    type: "private_cabin",
    slug: "private-cabin",
    name: "Private Cabin",
    plural: "Private Cabins",
    shortDesc: "Lockable cabins inside premium coworking hubs",
    fromPriceLabel: "₹5,999",
    unit: "cabin/month",
    icon: "DoorClosed",
  },
  {
    type: "dedicated_desk",
    slug: "dedicated-desk",
    name: "Dedicated Desk",
    plural: "Dedicated Desks",
    shortDesc: "Your own reserved desk in a shared workspace",
    fromPriceLabel: "₹5,999",
    unit: "desk/month",
    icon: "Armchair",
  },
  {
    type: "meeting_room",
    slug: "meeting-rooms",
    name: "Meeting Room",
    plural: "Meeting Rooms",
    shortDesc: "Book professional rooms by the hour",
    fromPriceLabel: "",
    unit: "hour",
    priceOnRequest: true,
    icon: "Presentation",
  },
  {
    type: "office_leasing",
    slug: "office-leasing",
    name: "Office Leasing",
    plural: "Office Spaces for Lease",
    shortDesc: "Enterprise-grade leased offices, 50–2,000 seats",
    fromPriceLabel: "₹25",
    unit: "sq ft/month",
    icon: "Landmark",
  },
  {
    type: "virtual_office",
    slug: "virtual-office",
    name: "Virtual Office",
    plural: "Virtual Offices",
    shortDesc: "Premium business address for GST & company registration",
    fromPriceLabel: "",
    unit: "month",
    priceOnRequest: true,
    icon: "MapPin",
  },
];

export const productBySlug = (slug: string) =>
  PRODUCTS.find((p) => p.slug === slug);
export const productByType = (type: string) =>
  PRODUCTS.find((p) => p.type === type);

/* ─── Cities (the only three markets) ───────────────────────────────── */

export interface CityDef {
  slug: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  blurb: string;
}

export const CITIES: CityDef[] = [
  {
    slug: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    lat: 28.4595,
    lng: 77.0266,
    blurb:
      "The corporate capital of NCR — Cyber City, Golf Course Road and Udyog Vihar host India's densest cluster of Fortune 500 offices and premium coworking hubs.",
  },
  {
    slug: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    lat: 28.5355,
    lng: 77.391,
    blurb:
      "NCR's fastest-growing tech corridor — Sector 62, Sector 125 and the Noida Expressway are home to IT parks, startups and large captive centres.",
  },
  {
    slug: "delhi",
    name: "Delhi",
    state: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    blurb:
      "The capital's business heart — from Connaught Place's heritage business district to Nehru Place, Saket and Aerocity's new-age commercial hubs.",
  },
];

export const cityBySlug = (slug: string) => CITIES.find((c) => c.slug === slug);

/* ─── Amenity master list ───────────────────────────────────────────── */

export const AMENITIES = [
  { slug: "high-speed-internet", name: "High-Speed Internet", icon: "Wifi" },
  { slug: "meeting-rooms", name: "Meeting Rooms", icon: "Presentation" },
  { slug: "private-cabins", name: "Private Cabins", icon: "DoorClosed" },
  { slug: "parking", name: "Parking", icon: "CircleParking" },
  { slug: "cafe", name: "Café & Pantry", icon: "Coffee" },
  { slug: "24x7-access", name: "24×7 Access", icon: "Clock" },
  { slug: "power-backup", name: "Power Backup", icon: "Zap" },
  { slug: "gym", name: "Gym", icon: "Dumbbell" },
  { slug: "food-court", name: "Food Court", icon: "UtensilsCrossed" },
  { slug: "wheelchair-accessible", name: "Wheelchair Accessible", icon: "Accessibility" },
  { slug: "phone-booths", name: "Phone Booths", icon: "Phone" },
  { slug: "printing", name: "Printing & Stationery", icon: "Printer" },
  { slug: "security", name: "24×7 Security", icon: "ShieldCheck" },
  { slug: "reception", name: "Reception & Front Desk", icon: "BellRing" },
  { slug: "event-space", name: "Event Space", icon: "PartyPopper" },
] as const;
