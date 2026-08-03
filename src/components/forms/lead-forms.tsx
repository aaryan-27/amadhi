"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, Download, Loader2 } from "lucide-react";
import { PRODUCTS, CITIES } from "@/lib/site";
import { captureUtm } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/* Shared plumbing ----------------------------------------------------- */

async function submitLead(path: string, payload: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

function useAntiSpam() {
  // honeypot value + form-open timestamp (validated server-side)
  const startedAt = useMemo(() => Date.now(), []);
  const [website, setWebsite] = useState("");
  const honeypotField = (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0">
      <label>
        Leave this field empty
        <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
    </div>
  );
  return { startedAt, website, honeypotField };
}

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-400 outline-none";
const labelCls = "block text-sm font-medium text-navy-900 mb-1.5";

function SuccessState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
      <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
      <p className="font-display text-lg font-semibold text-navy-950">{title}</p>
      <p className="max-w-xs text-sm text-muted">{body}</p>
    </div>
  );
}

/* 1. Two-step enquiry form (requirement → contact; no OTP) ------------ */

export function EnquiryForm({
  listingSlug,
  citySlug,
  localitySlug,
  productType,
  compact = false,
  leadType = "enquiry",
}: {
  listingSlug?: string;
  citySlug?: string;
  localitySlug?: string;
  productType?: string;
  compact?: boolean;
  leadType?: "enquiry" | "partner" | "contact";
}) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const { startedAt, website, honeypotField } = useAntiSpam();
  const [form, setForm] = useState({
    productType: productType ?? "",
    seats: "",
    citySlug: citySlug ?? "",
    moveIn: "",
    name: "",
    phone: "",
    email: "",
    message: "",
    companyName: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (state === "done")
    return (
      <SuccessState
        title="Enquiry received!"
        body="Our workspace expert will reach out within 5 minutes during business hours (9am–8pm, Mon–Sat)."
      />
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("busy");
    try {
      await submitLead("/api/v1/leads", {
        type: leadType,
        ...form,
        listingSlug,
        localitySlug,
        website,
        startedAt,
        utm: captureUtm(),
      });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  return (
    <form onSubmit={submit} className="relative" aria-label="Enquiry form">
      {honeypotField}
      {step === 1 ? (
        <div className="space-y-4">
          {!compact && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Step 1 of 2 — Your requirement
            </p>
          )}
          <div>
            <label className={labelCls} htmlFor="enq-product">Workspace type</label>
            <select
              id="enq-product"
              required
              value={form.productType}
              onChange={(e) => set("productType", e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>Select type…</option>
              {PRODUCTS.map((p) => (
                <option key={p.type} value={p.type}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="enq-seats">Team size</label>
              <select id="enq-seats" required value={form.seats} onChange={(e) => set("seats", e.target.value)} className={inputCls}>
                <option value="" disabled>Select…</option>
                {["Just me", "2–5", "6–10", "11–25", "26–50", "51–100", "100+"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="enq-movein">Move-in</label>
              <select id="enq-movein" value={form.moveIn} onChange={(e) => set("moveIn", e.target.value)} className={inputCls}>
                <option value="">Flexible</option>
                {["Immediately", "Within 15 days", "Within 30 days", "1–3 months"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {!listingSlug && (
            <div>
              <label className={labelCls} htmlFor="enq-city">City</label>
              <select id="enq-city" required value={form.citySlug} onChange={(e) => set("citySlug", e.target.value)} className={inputCls}>
                <option value="" disabled>Select city…</option>
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              if (form.productType && form.seats && (listingSlug || form.citySlug)) setStep(2);
            }}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted hover:text-navy-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Step 2 of 2 — Your details
          </button>
          <div>
            <label className={labelCls} htmlFor="enq-name">Full name</label>
            <input id="enq-name" required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Priya Sharma" autoComplete="name" />
          </div>
          <div>
            <label className={labelCls} htmlFor="enq-phone">Mobile number</label>
            <input id="enq-phone" required type="tel" inputMode="numeric" pattern="(\+?91[\s-]?)?[6-9][0-9]{9}" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="98100 00000" autoComplete="tel" />
          </div>
          {leadType === "partner" && (
            <div>
              <label className={labelCls} htmlFor="enq-company">Company / space name</label>
              <input id="enq-company" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputCls} placeholder="Acme Workspaces" />
            </div>
          )}
          <div>
            <label className={labelCls} htmlFor="enq-email">
              Email <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="enq-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="priya@company.com" autoComplete="email" />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={state === "busy"}>
            {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Submit enquiry"}
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-muted">
            No spam, no OTP, no account needed. We respond in under 5 minutes during business hours.
          </p>
        </div>
      )}
    </form>
  );
}

/* 2. Visit booking (self-pick slot) ----------------------------------- */

const VISIT_SLOTS = ["10:00–11:00", "11:00–12:00", "12:00–13:00", "14:00–15:00", "15:00–16:00", "16:00–17:00", "17:00–18:00"];

export function VisitForm({ listingSlug }: { listingSlug: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const { startedAt, website, honeypotField } = useAntiSpam();
  const [form, setForm] = useState({ name: "", phone: "", email: "", date: "", slot: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  if (state === "done")
    return (
      <SuccessState
        title="Visit requested!"
        body="We'll confirm your slot on WhatsApp shortly. An Amadhi expert will accompany you on the visit."
      />
    );

  return (
    <form
      className="relative space-y-4"
      aria-label="Book a visit"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setState("busy");
        try {
          await submitLead("/api/v1/visits", { listingSlug, ...form, website, startedAt });
          setState("done");
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      {honeypotField}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="visit-date">Date</label>
          <input id="visit-date" required type="date" min={minDate} max={maxDate} value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="visit-slot">Time slot</label>
          <select id="visit-slot" required value={form.slot} onChange={(e) => set("slot", e.target.value)} className={inputCls}>
            <option value="" disabled>Select…</option>
            {VISIT_SLOTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="visit-name">Full name</label>
        <input id="visit-name" required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} autoComplete="name" />
      </div>
      <div>
        <label className={labelCls} htmlFor="visit-phone">Mobile number</label>
        <input id="visit-phone" required type="tel" inputMode="numeric" pattern="(\+?91[\s-]?)?[6-9][0-9]{9}" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} autoComplete="tel" />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Request visit"}
      </Button>
    </form>
  );
}

/* 3. Meeting-room booking request ------------------------------------- */

export function MeetingRoomForm({ listingSlug }: { listingSlug: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const { startedAt, website, honeypotField } = useAntiSpam();
  const [form, setForm] = useState({ name: "", phone: "", email: "", date: "", startTime: "10:00", hours: "1", attendees: "4" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (state === "done")
    return (
      <SuccessState
        title="Booking request sent!"
        body="We'll confirm availability and pricing on WhatsApp within minutes."
      />
    );

  return (
    <form
      className="relative space-y-4"
      aria-label="Meeting room booking request"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setState("busy");
        try {
          await submitLead("/api/v1/meeting-rooms", { listingSlug, ...form, website, startedAt });
          setState("done");
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      {honeypotField}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="mr-date">Date</label>
          <input id="mr-date" required type="date" min={minDate} value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="mr-start">Start time</label>
          <input id="mr-start" required type="time" min="08:00" max="20:00" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="mr-hours">Duration (hrs)</label>
          <select id="mr-hours" value={form.hours} onChange={(e) => set("hours", e.target.value)} className={inputCls}>
            {[1, 2, 3, 4, 6, 8].map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="mr-att">Attendees</label>
          <select id="mr-att" value={form.attendees} onChange={(e) => set("attendees", e.target.value)} className={inputCls}>
            {[2, 4, 6, 8, 10, 14, 20].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="mr-name">Full name</label>
        <input id="mr-name" required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} autoComplete="name" />
      </div>
      <div>
        <label className={labelCls} htmlFor="mr-phone">Mobile number</label>
        <input id="mr-phone" required type="tel" inputMode="numeric" pattern="(\+?91[\s-]?)?[6-9][0-9]{9}" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} autoComplete="tel" />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Request booking"}
      </Button>
    </form>
  );
}

/* 4. Review submission (moderated, account-free) ----------------------- */

export function ReviewForm({ listingSlug }: { listingSlug: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const { startedAt, website, honeypotField } = useAntiSpam();
  const [form, setForm] = useState({ name: "", email: "", persona: "", rating: "5", title: "", body: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (state === "done")
    return (
      <SuccessState
        title="Review submitted"
        body="Thanks! Your review will appear once our team verifies it — usually within one business day."
      />
    );

  return (
    <form
      className="relative space-y-4"
      aria-label="Write a review"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setState("busy");
        try {
          await submitLead("/api/v1/reviews", { listingSlug, ...form, website, startedAt });
          setState("done");
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      {honeypotField}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="rv-name">Name</label>
          <input id="rv-name" required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="rv-rating">Rating</label>
          <select id="rv-rating" value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{"★".repeat(r)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="rv-persona">
          You are a… <span className="font-normal text-muted">(optional)</span>
        </label>
        <select id="rv-persona" value={form.persona} onChange={(e) => set("persona", e.target.value)} className={inputCls}>
          <option value="">Prefer not to say</option>
          {["Freelancer", "Startup Founder", "Team Manager", "Enterprise Leader", "Consultant"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="rv-body">Your experience</label>
        <textarea id="rv-body" required minLength={20} rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} className={cn(inputCls, "h-auto py-2.5")} placeholder="What did you like? What could be better?" />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" variant="dark" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Submit review"}
      </Button>
    </form>
  );
}

/* 5. Email-gated brochure download ------------------------------------ */

export function BrochureGate({ listingSlug, brochureUrl }: { listingSlug?: string; brochureUrl: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [email, setEmail] = useState("");
  const { startedAt, website, honeypotField } = useAntiSpam();

  if (state === "done")
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
        <span>
          Brochure unlocked —{" "}
          <a href={brochureUrl} download className="font-semibold underline">download PDF</a>
        </span>
      </div>
    );

  return (
    <form
      className="relative flex flex-col gap-2 sm:flex-row"
      aria-label="Download brochure"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await submitLead("/api/v1/leads", {
            type: "brochure", name: "Brochure Lead", email, listingSlug, website, startedAt,
          });
          setState("done");
          window.open(brochureUrl, "_blank");
        } catch {
          setState("idle");
        }
      }}
    >
      {honeypotField}
      <label className="sr-only" htmlFor="br-email">Email for brochure</label>
      <input
        id="br-email"
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Work email for the brochure"
        className={cn(inputCls, "flex-1")}
      />
      <Button type="submit" variant="dark" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : (<><Download className="h-4 w-4" aria-hidden /> Brochure</>)}
      </Button>
    </form>
  );
}

/* 6. Notify-me capture for empty states ------------------------------- */

export function NotifyMe({ citySlug, localitySlug }: { citySlug?: string; localitySlug?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [email, setEmail] = useState("");
  const { startedAt, website, honeypotField } = useAntiSpam();

  if (state === "done")
    return <p className="text-sm font-medium text-success" role="status">You&apos;re on the list — we&apos;ll email you when inventory opens up.</p>;

  return (
    <form
      className="relative flex w-full max-w-md gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await submitLead("/api/v1/leads", { type: "notify_me", name: "Notify Me", email, citySlug, localitySlug, website, startedAt });
          setState("done");
        } catch {
          setState("idle");
        }
      }}
    >
      {honeypotField}
      <label className="sr-only" htmlFor="notify-email">Email address</label>
      <input id="notify-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={cn(inputCls, "flex-1")} />
      <Button type="submit" size="md" disabled={state === "busy"}>Notify me</Button>
    </form>
  );
}
