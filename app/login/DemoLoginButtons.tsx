"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setSelectedActor } from "@/components/ActorSelector";
import { postDemoLogin } from "@/components/demo-login-client";

type Props = {
  sessionAppRole?: "issuer" | "user" | null;
  /** Locked demo guest for current session (User A vs B). */
  sessionHederaPersona?: "guestA" | "guestB" | null;
};

export function DemoLoginButtons({
  sessionAppRole = null,
  sessionHederaPersona = null,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"issuer" | "guestA" | "guestB" | null>(null);

  const blockIssuer = sessionAppRole === "user";
  const registeredGuest =
    sessionAppRole === "user" && sessionHederaPersona == null;
  const blockGuestA =
    sessionAppRole === "issuer" ||
    registeredGuest ||
    sessionHederaPersona === "guestB";
  const blockGuestB =
    sessionAppRole === "issuer" ||
    registeredGuest ||
    sessionHederaPersona === "guestA";

  async function go(role: "issuer" | "guestA" | "guestB") {
    if (role === "issuer" && blockIssuer) return;
    if (role === "guestA" && blockGuestA) return;
    if (role === "guestB" && blockGuestB) return;
    setErr(null);
    setBusy(role);
    try {
      const r = await postDemoLogin(role);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      if (role === "guestA") setSelectedActor("guestA");
      if (role === "guestB") setSelectedActor("guestB");
      window.location.assign(role === "issuer" ? "/issuer" : "/slots");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Demo (one click)
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={!!busy || blockIssuer}
          title={
            blockIssuer
              ? "Log out first to sign in as demo issuer"
              : undefined
          }
          onClick={() => go("issuer")}
          className="rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-3 text-left text-sm font-medium text-amber-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "issuer" ? "…" : "Demo issuer"}
          <span className="mt-1 block text-xs font-normal text-amber-900/80">
            App → Issuer console
          </span>
        </button>
        <button
          type="button"
          disabled={!!busy || blockGuestA}
          title={
            blockGuestA
              ? "Log out first, or you are signed in as User B"
              : undefined
          }
          onClick={() => go("guestA")}
          className="rounded-lg border-2 border-sky-300 bg-sky-50 px-3 py-3 text-left text-sm font-medium text-sky-950 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "guestA" ? "…" : "Demo user A"}
          <span className="mt-1 block text-xs font-normal text-sky-900/80">
            New app account · Guest A only
          </span>
        </button>
        <button
          type="button"
          disabled={!!busy || blockGuestB}
          title={
            blockGuestB
              ? "Log out first, or you are signed in as User A"
              : undefined
          }
          onClick={() => go("guestB")}
          className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-3 py-3 text-left text-sm font-medium text-indigo-950 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "guestB" ? "…" : "Demo user B"}
          <span className="mt-1 block text-xs font-normal text-indigo-900/80">
            New app account · Guest B only
          </span>
        </button>
      </div>
      {err && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      )}
      <p className="text-xs text-slate-500">
        User A and User B are <strong>separate</strong> Redis accounts, each
        locked to one Hedera wallet. Register with email if you need to switch
        A/B in one session (not recommended for the split demo).
      </p>
    </div>
  );
}
