import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Inbox, Building2, PenSquare, Star, Settings, LogOut,
} from "lucide-react";
import { auth, signOut, canAccess, MODULE_ACCESS } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

const NAV: { href: string; label: string; icon: React.ElementType; module: keyof typeof MODULE_ACCESS }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/admin/leads", label: "Leads", icon: Inbox, module: "leads" },
  { href: "/admin/listings", label: "Listings", icon: Building2, module: "listings" },
  { href: "/admin/blog", label: "Blog", icon: PenSquare, module: "blog" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, module: "reviews" },
  { href: "/admin/settings", label: "Settings", icon: Settings, module: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const role = (session.user as { role?: string }).role ?? "viewer";

  return (
    <div className="flex min-h-screen bg-navy-950 text-navy-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-navy-800 bg-navy-900">
        <div className="flex items-center gap-2.5 border-b border-navy-800 px-5 py-4">
          <Image src="/brand/mark-light.png" alt="" width={32} height={29} className="h-7 w-auto" />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-wide text-cream-100">AMADHI</p>
            <p className="text-[10px] uppercase tracking-wider text-navy-400">Admin</p>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 space-y-0.5 p-3">
          {NAV.filter((item) => canAccess(role, item.module)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-cream-100"
            >
              <item.icon className="h-4.5 w-4.5" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-navy-800 p-3">
          <p className="px-3.5 pb-2 text-xs text-navy-400">
            {session.user.name} · <span className="capitalize">{role.replace("_", " ")}</span>
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-cream-100"
            >
              <LogOut className="h-4.5 w-4.5" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="ml-60 flex-1 p-8">{children}</div>
    </div>
  );
}
