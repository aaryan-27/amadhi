import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Login — Amadhi",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/brand/icon.png" alt="Amadhi" width={56} height={56} className="h-14 w-14 rounded-2xl" />
          <div className="text-center">
            <p className="font-display text-xl font-bold tracking-wide text-cream-100">AMADHI ADMIN</p>
            <p className="text-sm text-navy-300">Sign in to your dashboard</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-navy-400">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
