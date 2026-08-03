"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Lock } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  return (
    <form
      className="space-y-4 rounded-2xl border border-navy-700 bg-navy-900 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await signIn("credentials", { email, password, redirect: false });
        setBusy(false);
        if (res?.error) {
          setError("Invalid email or password.");
          return;
        }
        router.push(params.get("from") ?? "/admin");
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-navy-200">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-navy-600 bg-navy-950 px-3.5 text-sm text-cream-100 outline-none placeholder:text-navy-500 focus:border-cream-200"
          placeholder="admin@amadhi.com"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-navy-200">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-navy-600 bg-navy-950 px-3.5 text-sm text-cream-100 outline-none focus:border-cream-200"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
        Sign in
      </button>
    </form>
  );
}
