import { db } from "@/lib/db";
import { SettingsForm } from "./settings-form";

const GROUPS: { title: string; keys: { key: string; label: string; hint?: string }[] }[] = [
  {
    title: "Brand",
    keys: [
      { key: "brand.name", label: "Brand name" },
      { key: "brand.tagline", label: "Tagline" },
    ],
  },
  {
    title: "Contact",
    keys: [
      { key: "contact.phone", label: "Phone (displayed)" },
      { key: "contact.whatsapp", label: "WhatsApp number", hint: "Digits only with country code, e.g. 919810000000" },
      { key: "contact.email", label: "Email" },
    ],
  },
  {
    title: "Analytics",
    keys: [
      { key: "analytics.ga4", label: "GA4 Measurement ID", hint: "G-XXXXXXX — loaded via GTM when set" },
      { key: "analytics.gtm", label: "GTM Container ID", hint: "GTM-XXXXXXX" },
      { key: "analytics.clarity", label: "Microsoft Clarity ID" },
      { key: "analytics.metaPixel.enabled", label: "Meta Pixel enabled", hint: "true/false — keep false until ads run" },
    ],
  },
];

export default async function AdminSettingsPage() {
  const settings = await db.setting.findMany();
  const values = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const roles = await db.role.findMany({ include: { _count: { select: { users: true } } } });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-cream-100">Settings</h1>
      <p className="mt-1 text-sm text-navy-300">Super Admin only. Changes apply site-wide.</p>

      <div className="mt-6 space-y-6">
        {GROUPS.map((group) => (
          <SettingsForm key={group.title} title={group.title} fields={group.keys.map((k) => ({ ...k, value: values[k.key] ?? "" }))} />
        ))}

        <div className="rounded-2xl border border-navy-800 bg-navy-900 p-6">
          <h2 className="font-display text-base font-semibold text-cream-100">Roles &amp; permissions</h2>
          <ul className="mt-4 divide-y divide-navy-800">
            {roles.map((role) => (
              <li key={role.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-navy-100">{role.name}</span>
                <span className="text-xs text-navy-400">
                  {role._count.users} user{role._count.users === 1 ? "" : "s"} ·{" "}
                  {JSON.parse(role.permsJson).join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-navy-500">
            User management (invite, deactivate, role change) ships in the next admin iteration.
          </p>
        </div>
      </div>
    </div>
  );
}
