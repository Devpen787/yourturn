"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";

export type SlotRow = {
  serial: number;
  title: string;
  startTime: string;
  endTime: string;
  primaryPriceHbar: number;
  status: string;
};

function statusHint(status: string): string {
  if (status === "AVAILABLE") return "Ready to book";
  if (status === "HELD") return "Already booked by a guest";
  if (status === "FROZEN") return "Booked and temporarily blocked";
  if (status === "USED") return "Already used";
  return status;
}

export function SlotsClient({ rows }: { rows: SlotRow[] }) {
  const router = useRouter();
  const [actor, setActor] = useState<ActorValue>("guestA");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<number | null>(null);

  async function book(serial: number) {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Select guestA or guestB to book");
      return;
    }
    setLoading(serial);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, serial }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      setMsg(`Booked serial ${serial}. Tx: ${data.txId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Public slots</h1>
      <ActorSelector pageDefault="guestA" onChange={setActor} />
      {msg && (
        <p className="mb-2 rounded bg-emerald-50 p-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      {err && (
        <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-800">{err}</p>
      )}
      <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        A slot is bookable only while it is <strong>AVAILABLE</strong>. After booking, the right moves to a guest and may later be resold, frozen, or marked used under issuer rules.
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.serial}
            className="rounded border border-slate-200 bg-white p-4 text-sm"
          >
            <div className="font-medium">{r.title}</div>
            <div className="text-slate-600">
              {r.startTime} → {r.endTime}
            </div>
            <div className="mt-1">
              Price: <strong>{r.primaryPriceHbar} ℏ</strong> · Status:{" "}
              <strong>{r.status}</strong>
            </div>
            <div className="mt-1 text-slate-600">{statusHint(r.status)}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                className="text-blue-700 underline"
                href={`/slots/${r.serial}`}
              >
                Details
              </Link>
              {r.status === "AVAILABLE" && (
                <button
                  type="button"
                  className="rounded bg-slate-800 px-2 py-1 text-white disabled:opacity-50"
                  disabled={loading !== null}
                  onClick={() => book(r.serial)}
                >
                  {loading === r.serial ? "…" : "Book"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && (
        <p className="text-slate-600">
          No slots in Redis yet. Issuer must Initialize and Mint Demo Slots.
        </p>
      )}
    </div>
  );
}
