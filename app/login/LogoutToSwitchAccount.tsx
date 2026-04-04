"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  /** After logout, reopen sign-in with this hint (e.g. issuer vs user). */
  afterLogoutHref: string;
  currentLabel: string;
  targetLabel: string;
};

export function LogoutToSwitchAccount({
  afterLogoutHref,
  currentLabel,
  targetLabel,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function logout() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setErr("Could not log out. Try again.");
        return;
      }
      router.refresh();
      router.replace(afterLogoutHref);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-amber-950">
        Switch account type
      </h2>
      <p className="text-sm text-amber-950/90">
        You are signed in as a <strong>{currentLabel}</strong> account. To use
        the <strong>{targetLabel}</strong> area, log out first, then sign in
        again (demo or email).
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void logout()}
        className="w-full rounded-lg bg-amber-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : "Log out, then continue"}
      </button>
      {err && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      )}
    </div>
  );
}
