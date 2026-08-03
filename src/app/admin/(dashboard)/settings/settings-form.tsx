"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { saveSetting } from "../actions";

export function SettingsForm({
  title,
  fields,
}: {
  title: string;
  fields: { key: string; label: string; hint?: string; value: string }[];
}) {
  const [values, setValues] = useState(Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="rounded-2xl border border-navy-800 bg-navy-900 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          for (const f of fields) {
            if (values[f.key] !== f.value) await saveSetting(f.key, values[f.key]);
          }
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        });
      }}
    >
      <h2 className="font-display text-base font-semibold text-cream-100">{title}</h2>
      <div className="mt-4 space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`set-${f.key}`} className="mb-1.5 block text-sm font-medium text-navy-200">
              {f.label}
            </label>
            <input
              id={`set-${f.key}`}
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2.5 text-sm text-navy-100 outline-none focus:border-cream-200"
            />
            {f.hint && <p className="mt-1 text-xs text-navy-500">{f.hint}</p>}
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : saved ? <Check className="h-4 w-4" aria-hidden /> : null}
        {saved ? "Saved" : "Save"}
      </button>
    </form>
  );
}
