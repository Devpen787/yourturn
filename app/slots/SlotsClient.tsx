"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { DemoPricingNotice } from "@/components/DemoPricingNotice";
import { ResaleAskPrice } from "@/components/ResaleAskPrice";
import { SlotPrimaryPrice } from "@/components/SlotPrimaryPrice";

export type SlotRow = {
  serial: number;
  title: string;
  startTime: string;
  endTime: string;
  primaryPriceHbar: number;
  priceUsd: number | null;
  status: string;
  /** App-side resale listing (Redis), not on-chain order book */
  resaleAskHbar: number | null;
  resaleAskUsd: number | null;
  resaleSellerAccountId: string | null;
};

export function SlotsClient({
  rows,
  guestAId = "",
  guestBId = "",
}: {
  rows: SlotRow[];
  guestAId?: string;
  guestBId?: string;
}) {
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

  function accountForActor(a: ActorValue): string {
    if (a === "guestA") return guestAId.trim();
    if (a === "guestB") return guestBId.trim();
    return "";
  }

  async function buyResale(serial: number, sellerAccountId: string) {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Select guestA or guestB as buyer");
      return;
    }
    const buyerAcc = accountForActor(actor);
    if (buyerAcc && sellerAccountId && buyerAcc === sellerAccountId) {
      setErr("Switch to the other guest — you cannot buy your own listing.");
      return;
    }
    setLoading(serial);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/resale-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, serial }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      setMsg(`Bought resale for serial ${serial}. Tx: ${data.txId}`);
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
      <DemoPricingNotice />
      <ActorSelector pageDefault="guestA" onChange={setActor} />
      {msg && (
        <p className="mb-2 rounded bg-emerald-50 p-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      {err && (
        <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-800">{err}</p>
      )}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.serial}
            className="rounded border border-slate-200 bg-white p-4 text-sm"
          >
            <div className="font-medium">
              Serial #{r.serial} · {r.title}
            </div>
            <div className="text-slate-600">
              {r.startTime} → {r.endTime}
            </div>
            <div className="mt-1">
              Price:{" "}
              <SlotPrimaryPrice
                priceUsd={r.priceUsd ?? undefined}
                primaryPriceHbar={r.primaryPriceHbar}
              />{" "}
              · Status: <strong>{r.status}</strong>
            </div>
            {r.resaleAskHbar != null &&
              r.resaleSellerAccountId &&
              (r.status === "HELD" || r.status === "FROZEN") && (
                <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-950">
                  <span className="font-medium">Resale:</span>{" "}
                  <ResaleAskPrice
                    askUsd={r.resaleAskUsd ?? undefined}
                    askPriceHbar={r.resaleAskHbar}
                  />{" "}
                  — choose the <strong>other</strong> guest above, then buy.
                  {r.status === "FROZEN" && (
                    <span className="block text-amber-900">
                      Frozen: unfreeze from Issuer before buying.
                    </span>
                  )}
                </p>
              )}
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
              {r.resaleAskHbar != null &&
                r.resaleSellerAccountId &&
                r.status === "HELD" && (
                  <button
                    type="button"
                    className="rounded bg-emerald-800 px-2 py-1 text-white disabled:opacity-50"
                    disabled={loading !== null}
                    onClick={() =>
                      buyResale(r.serial, r.resaleSellerAccountId!)
                    }
                  >
                    {loading === r.serial
                      ? "…"
                      : r.resaleAskUsd != null
                        ? `Buy resale (US$${r.resaleAskUsd})`
                        : `Buy resale (${r.resaleAskHbar} ℏ)`}
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
