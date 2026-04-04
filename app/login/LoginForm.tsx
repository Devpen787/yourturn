"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      router.refresh();
      router.push("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {err && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-sky-800 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "…" : "Sign in"}
      </button>
    </form>
  );
}
