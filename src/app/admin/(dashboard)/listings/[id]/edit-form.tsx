"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { updateListingCore } from "../../actions";

const inputCls =
  "w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2.5 text-sm text-navy-100 placeholder:text-navy-500 focus:border-cream-200 outline-none";
const labelCls = "mb-1.5 block text-sm font-medium text-navy-200";

export function ListingEditForm({
  listing,
}: {
  listing: { id: string; name: string; summary: string; description: string; address: string; capacity: number };
}) {
  const [form, setForm] = useState(listing);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateListingCore(listing.id, {
            name: form.name,
            summary: form.summary,
            description: form.description,
            address: form.address,
            capacity: Number(form.capacity) || 0,
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        });
      }}
    >
      <div>
        <label className={labelCls} htmlFor="l-name">Name</label>
        <input id="l-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="l-summary">Summary (card text)</label>
        <textarea id="l-summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="l-desc">Description</label>
        <textarea id="l-desc" rows={10} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="l-address">Address</label>
          <input id="l-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="l-capacity">Capacity (seats)</label>
          <input id="l-capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className={inputCls} />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-6 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : saved ? <Check className="h-4 w-4" aria-hidden /> : null}
        {saved ? "Saved" : "Save changes"}
      </button>
    </form>
  );
}
