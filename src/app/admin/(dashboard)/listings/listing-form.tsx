"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2, AlertCircle } from "lucide-react";
import { saveListing, type ListingInput } from "../actions";

const inputCls =
  "w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2.5 text-sm text-navy-100 placeholder:text-navy-500 focus:border-cream-200 outline-none";
const labelCls = "mb-1.5 block text-sm font-medium text-navy-200";
const sectionCls = "rounded-2xl border border-navy-800 bg-navy-900/40 p-5";
const headingCls = "mb-4 font-display text-sm font-bold uppercase tracking-wider text-cream-100";
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-200 hover:border-cream-200 hover:text-cream-100";

const PRODUCT_TYPES = [
  { value: "coworking", label: "Coworking" },
  { value: "managed_office", label: "Managed office" },
  { value: "private_cabin", label: "Private cabin" },
  { value: "dedicated_desk", label: "Dedicated desk" },
  { value: "meeting_room", label: "Meeting room" },
  { value: "office_leasing", label: "Office / commercial leasing" },
  { value: "virtual_office", label: "Virtual office" },
];
const PERIODS = [
  { value: "month", label: "per month" },
  { value: "hour", label: "per hour" },
  { value: "day", label: "per day" },
  { value: "sqft_month", label: "per sq ft / month" },
  { value: "year", label: "per year" },
];
const PRICE_FLOOR_MONTH = 5999;

export type FormCity = { id: string; name: string; localities: { id: string; name: string }[] };
export type FormOperator = { id: string; name: string };
export type FormAmenity = { id: string; name: string };

export type ListingFormValue = Omit<ListingInput, "newLocalityName" | "newOperatorName">;

/** A blank listing, so "Add listing" starts from something valid. */
export function emptyListing(cityId: string): ListingFormValue {
  return {
    name: "", slug: "", summary: "", description: "",
    cityId, localityId: "", operatorId: "",
    address: "", lat: 0, lng: 0, capacity: 0,
    openingTime: "09:00", closingTime: "20:00", openDays: "Mon–Sat",
    status: "draft", verified: false, featured: false, trending: false,
    virtualTourUrl: "", brochureUrl: "",
    nearby: [], amenityIds: [], images: [],
    plans: [],
  };
}

export function ListingForm({
  initial,
  cities,
  operators,
  amenities,
  mode,
}: {
  initial: ListingFormValue;
  cities: FormCity[];
  operators: FormOperator[];
  amenities: FormAmenity[];
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<ListingFormValue>(initial);
  const [newLocality, setNewLocality] = useState("");
  const [newOperator, setNewOperator] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ListingFormValue>(key: K, value: ListingFormValue[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const localities = useMemo(
    () => cities.find((c) => c.id === form.cityId)?.localities ?? [],
    [cities, form.cityId]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveListing({
          ...form,
          newLocalityName: newLocality || undefined,
          newOperatorName: newOperator || undefined,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        if (mode === "create") router.push(`/admin/listings/${result.id}`);
        else router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the listing");
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      {/* ── Basics ── */}
      <section className={sectionCls}>
        <h2 className={headingCls}>Basics</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="f-name">Name *</label>
              <input id="f-name" required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="WeWork Cyber City" />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-slug">URL slug</label>
              <input id="f-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} className={inputCls} placeholder="auto-generated from the name" />
              <p className="mt-1 text-xs text-navy-400">Leave blank to generate it. A duplicate gets -2 appended.</p>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="f-summary">Summary (shown on cards)</label>
            <textarea id="f-summary" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-desc">Description</label>
            <textarea id="f-desc" rows={8} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      {/* ── Location ── */}
      <section className={sectionCls}>
        <h2 className={headingCls}>Location</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="f-city">City *</label>
              <select
                id="f-city" value={form.cityId} className={inputCls}
                onChange={(e) => { set("cityId", e.target.value); set("localityId", ""); }}
              >
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="f-locality">Locality *</label>
              <select
                id="f-locality" value={form.localityId} className={inputCls}
                disabled={!!newLocality}
                onChange={(e) => set("localityId", e.target.value)}
              >
                <option value="">Select a locality…</option>
                {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <input
                value={newLocality} onChange={(e) => setNewLocality(e.target.value)}
                className={`${inputCls} mt-2`} placeholder="…or type a new locality to create it"
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="f-address">Address</label>
            <input id="f-address" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="f-lat">Latitude</label>
              <input id="f-lat" type="number" step="any" value={form.lat} onChange={(e) => set("lat", Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-lng">Longitude</label>
              <input id="f-lng" type="number" step="any" value={form.lng} onChange={(e) => set("lng", Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-navy-400">Leave both at 0 and the city centre is used, so the map still renders.</p>
        </div>
      </section>

      {/* ── Operator & capacity ── */}
      <section className={sectionCls}>
        <h2 className={headingCls}>Operator &amp; opening hours</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="f-operator">Operator</label>
              <select id="f-operator" value={form.operatorId} className={inputCls} disabled={!!newOperator} onChange={(e) => set("operatorId", e.target.value)}>
                <option value="">No operator</option>
                {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <input value={newOperator} onChange={(e) => setNewOperator(e.target.value)} className={`${inputCls} mt-2`} placeholder="…or type a new operator to create it" />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-capacity">Capacity (seats)</label>
              <input id="f-capacity" type="number" min={0} value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="f-open">Opens</label>
              <input id="f-open" type="time" value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-close">Closes</label>
              <input id="f-close" type="time" value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-days">Open days</label>
              <input id="f-days" value={form.openDays} onChange={(e) => set("openDays", e.target.value)} className={inputCls} placeholder="Mon–Sat" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Publishing ── */}
      <section className={sectionCls}>
        <h2 className={headingCls}>Publishing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="f-status">Status</label>
            <select id="f-status" value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
              <option value="draft">Draft — not visible publicly</option>
              <option value="published">Published — live on the site</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <fieldset className="flex flex-wrap items-end gap-4">
            {([["verified", "Verified"], ["featured", "Featured"], ["trending", "Trending"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-navy-200">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 rounded border-navy-700 bg-navy-950" />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
        <p className="mt-3 text-xs text-navy-400">
          Rating and review count are not editable here — they are recalculated when a review is approved.
        </p>
      </section>

      {/* ── Amenities ── */}
      <section className={sectionCls}>
        <h2 className={headingCls}>Amenities</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm text-navy-200">
              <input
                type="checkbox"
                checked={form.amenityIds.includes(a.id)}
                onChange={(e) =>
                  set("amenityIds", e.target.checked
                    ? [...form.amenityIds, a.id]
                    : form.amenityIds.filter((x) => x !== a.id))
                }
                className="h-4 w-4 rounded border-navy-700 bg-navy-950"
              />
              {a.name}
            </label>
          ))}
        </div>
      </section>

      {/* ── Photos ── */}
      <RepeatableSection
        title="Photos"
        hint="Cloudinary URLs. The first photo is the cover image."
        rows={form.images}
        onAdd={() => set("images", [...form.images, { url: "", alt: "" }])}
        onRemove={(i) => set("images", form.images.filter((_, x) => x !== i))}
        render={(img, i) => (
          <div className="grid flex-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <input
              value={img.url} placeholder="https://res.cloudinary.com/…" className={inputCls}
              onChange={(e) => set("images", form.images.map((r, x) => x === i ? { ...r, url: e.target.value } : r))}
            />
            <input
              value={img.alt} placeholder="Alt text" className={inputCls}
              onChange={(e) => set("images", form.images.map((r, x) => x === i ? { ...r, alt: e.target.value } : r))}
            />
          </div>
        )}
      />

      {/* ── Nearby ── */}
      <RepeatableSection
        title="Nearby landmarks & metro"
        hint="Shown in the location panel on the listing page."
        rows={form.nearby}
        onAdd={() => set("nearby", [...form.nearby, { name: "", distanceKm: 0, type: "metro" }])}
        onRemove={(i) => set("nearby", form.nearby.filter((_, x) => x !== i))}
        render={(n, i) => (
          <div className="grid flex-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <input
              value={n.name} placeholder="Cyber City Metro Station" className={inputCls}
              onChange={(e) => set("nearby", form.nearby.map((r, x) => x === i ? { ...r, name: e.target.value } : r))}
            />
            <input
              type="number" step="0.1" min={0} value={n.distanceKm} placeholder="km" className={inputCls}
              onChange={(e) => set("nearby", form.nearby.map((r, x) => x === i ? { ...r, distanceKm: Number(e.target.value) } : r))}
            />
            <select
              value={n.type} className={inputCls}
              onChange={(e) => set("nearby", form.nearby.map((r, x) => x === i ? { ...r, type: e.target.value } : r))}
            >
              <option value="metro">Metro</option>
              <option value="landmark">Landmark</option>
            </select>
          </div>
        )}
      />

      {/* ── Plans & pricing ── */}
      <section className={sectionCls}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`${headingCls} mb-0`}>Plans &amp; pricing</h2>
          <button
            type="button" className={ghostBtn}
            onClick={() => set("plans", [...form.plans, {
              productType: "coworking", name: "", seatsMin: 1, seatsMax: 1, highlights: "",
              prices: [{ amount: PRICE_FLOOR_MONTH, period: "month", unitNote: "per seat" }],
            }])}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add plan
          </button>
        </div>

        {form.plans.length === 0 && (
          <p className="text-sm text-navy-400">
            No plans yet. A listing with no plan shows no price and cannot be filtered by product type.
          </p>
        )}

        <div className="space-y-4">
          {form.plans.map((plan, pi) => (
            <div key={pi} className="rounded-xl border border-navy-800 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Product type</label>
                  <select
                    value={plan.productType} className={inputCls}
                    onChange={(e) => set("plans", form.plans.map((p, x) => x === pi ? { ...p, productType: e.target.value } : p))}
                  >
                    {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Plan name</label>
                  <input
                    value={plan.name} placeholder="Hot desk" className={inputCls}
                    onChange={(e) => set("plans", form.plans.map((p, x) => x === pi ? { ...p, name: e.target.value } : p))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Seats min</label>
                    <input
                      type="number" min={1} value={plan.seatsMin} className={inputCls}
                      onChange={(e) => set("plans", form.plans.map((p, x) => x === pi ? { ...p, seatsMin: Number(e.target.value) } : p))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Seats max</label>
                    <input
                      type="number" min={1} value={plan.seatsMax} className={inputCls}
                      onChange={(e) => set("plans", form.plans.map((p, x) => x === pi ? { ...p, seatsMax: Number(e.target.value) } : p))}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Highlights (one per line)</label>
                  <textarea
                    rows={3} value={plan.highlights} className={inputCls}
                    onChange={(e) => set("plans", form.plans.map((p, x) => x === pi ? { ...p, highlights: e.target.value } : p))}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-navy-800 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-300">Prices</span>
                  <button
                    type="button" className={ghostBtn}
                    onClick={() => set("plans", form.plans.map((p, x) => x === pi
                      ? { ...p, prices: [...p.prices, { amount: PRICE_FLOOR_MONTH, period: "month", unitNote: "" }] } : p))}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Add price
                  </button>
                </div>
                {plan.prices.map((price, ri) => (
                  <div key={ri} className="mb-2 flex items-center gap-2">
                    <input
                      type="number" min={0} value={price.amount} placeholder="₹" className={inputCls}
                      onChange={(e) => set("plans", form.plans.map((p, x) => x === pi
                        ? { ...p, prices: p.prices.map((r, y) => y === ri ? { ...r, amount: Number(e.target.value) } : r) } : p))}
                    />
                    <select
                      value={price.period} className={inputCls}
                      onChange={(e) => set("plans", form.plans.map((p, x) => x === pi
                        ? { ...p, prices: p.prices.map((r, y) => y === ri ? { ...r, period: e.target.value } : r) } : p))}
                    >
                      {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <input
                      value={price.unitNote} placeholder="per seat" className={inputCls}
                      onChange={(e) => set("plans", form.plans.map((p, x) => x === pi
                        ? { ...p, prices: p.prices.map((r, y) => y === ri ? { ...r, unitNote: e.target.value } : r) } : p))}
                    />
                    <button
                      type="button" aria-label="Remove price" className="shrink-0 rounded-lg p-2 text-navy-400 hover:text-red-400"
                      onClick={() => set("plans", form.plans.map((p, x) => x === pi
                        ? { ...p, prices: p.prices.filter((_, y) => y !== ri) } : p))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <p className="mt-1 text-xs text-navy-400">
                  Monthly prices below ₹{PRICE_FLOOR_MONTH.toLocaleString("en-IN")} are raised to it on save, matching the rest of the catalogue.
                </p>
              </div>

              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300"
                onClick={() => set("plans", form.plans.filter((_, x) => x !== pi))}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove plan
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Links ── */}
      <section className={sectionCls}>
        <h2 className={headingCls}>Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="f-tour">Virtual tour URL</label>
            <input id="f-tour" value={form.virtualTourUrl} onChange={(e) => set("virtualTourUrl", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="f-brochure">Brochure URL</label>
            <input id="f-brochure" value={form.brochureUrl} onChange={(e) => set("brochureUrl", e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-1 bg-navy-950/90 py-4 backdrop-blur">
        <button
          type="submit" disabled={pending}
          className="flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-6 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : saved ? <Check className="h-4 w-4" aria-hidden /> : null}
          {saved ? "Saved" : mode === "create" ? "Create listing" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

/** Add/remove list with a consistent header, used for photos and nearby places. */
function RepeatableSection<T>({
  title, hint, rows, onAdd, onRemove, render,
}: {
  title: string;
  hint: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  render: (row: T, index: number) => React.ReactNode;
}) {
  return (
    <section className={sectionCls}>
      <div className="mb-1 flex items-center justify-between">
        <h2 className={`${headingCls} mb-0`}>{title}</h2>
        <button type="button" onClick={onAdd} className={ghostBtn}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add
        </button>
      </div>
      <p className="mb-4 text-xs text-navy-400">{hint}</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {render(row, i)}
            <button
              type="button" aria-label={`Remove ${title} row ${i + 1}`}
              onClick={() => onRemove(i)}
              className="shrink-0 rounded-lg p-2 text-navy-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
