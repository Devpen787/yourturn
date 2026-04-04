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

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-800";
}

function statusHint(status: string): string {
  if (status === "AVAILABLE") return "Ready to book";
  if (status === "HELD") return "Already booked by a guest";
  if (status === "FROZEN") return "Booked and temporarily blocked";
  if (status === "USED") return "Already used";
  return status;
}

function nextStepHint(status: string): string {
  if (status === "AVAILABLE") {
    return "Choose a guest actor and book this slot from the demo wallet flow.";
  }
  if (status === "HELD") {
    return "Open details to inspect the holder state or move to resale if issuer rules allow it.";
  }
  if (status === "FROZEN") {
    return "This slot cannot move until the issuer unfreezes the current holder.";
  }
  if (status === "USED") {
    return "Lifecycle is complete. Use the issuer console to seed a fresh slot for another demo pass.";
  }
  return "Open details to inspect the current booking-right state.";
}

export function SlotsClient({ rows }: { rows: SlotRow[] }) {
  const router = useRouter();
  const [actor, setActor] = useState<ActorValue>("guestA");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const availableCount = rows.filter((row) => row.status === "AVAILABLE").length;
  const heldCount = rows.filter((row) => row.status === "HELD").length;
  const frozenCount = rows.filter((row) => row.status === "FROZEN").length;
  const usedCount = rows.filter((row) => row.status === "USED").length;

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
      {rows.length > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Available</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{availableCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Held</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{heldCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Frozen</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{frozenCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Used</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{usedCount}</p>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.serial}
            className="rounded border border-slate-200 bg-white p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-slate-600">
                  {r.startTime} → {r.endTime}
                </div>
              </div>
              <span
                className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(
                  r.status
                )}`}
              >
                {r.status}
              </span>
            </div>
            <div className="mt-1">
              Serial <strong>#{r.serial}</strong> · Price:{" "}
              <strong>{r.primaryPriceHbar} ℏ</strong>
            </div>
            <div className="mt-1 text-slate-600">{statusHint(r.status)}</div>
            <div className="mt-2 rounded bg-slate-50 p-3 text-slate-700">
              <span className="font-medium text-slate-900">Next step:</span>{" "}
              {nextStepHint(r.status)}
            </div>
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
        <div className="rounded border border-slate-200 bg-white p-4 text-slate-600">
          <p>No slots are seeded yet. The issuer must initialize the app and mint demo slots first.</p>
          <Link href="/issuer" className="mt-3 inline-flex text-blue-700 underline">
            Open issuer setup
          </Link>
        </div>
      )}
    </div>
  );
}
