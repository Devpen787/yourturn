"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { calcRoyalty, calcSellerNet } from "@/lib/domain/fees";
import type { ResaleListing } from "@/lib/types/listing";

export function ResaleClient({
  serial,
  tokenId,
  initialListing,
  slotTitle,
}: {
  serial: number;
  tokenId: string | null;
  initialListing: ResaleListing | null;
  slotTitle: string;
}) {
  const router = useRouter();
  const [actor, setActor] = useState<ActorValue>("guestA");
  const [ask, setAsk] = useState(
    initialListing?.askPriceHbar?.toString() ?? "20"
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const askNum = Number(ask) || 0;
  const royalty = calcRoyalty(askNum);
  const net = calcSellerNet(askNum);

  async function createListing() {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Select guestA or guestB as seller");
      return;
    }
    setLoading("list");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/resale-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor,
          serial,
          askPriceHbar: askNum,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      setMsg("Listing created");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function buy() {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Select guestA or guestB as buyer");
      return;
    }
    setLoading("buy");
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
      setMsg(`Purchased. Tx: ${data.txId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <ActorSelector pageDefault="guestA" onChange={setActor} />
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-medium">{slotTitle}</h2>
        {!tokenId && (
          <p className="mt-2 text-amber-800">Token not initialized.</p>
        )}
        {initialListing?.active && (
          <p className="mt-2 text-slate-700">
            Active listing: <strong>{initialListing.askPriceHbar} ℏ</strong> from{" "}
            {initialListing.sellerAccountId}
          </p>
        )}
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
          <p className="font-medium">Create listing (holder)</p>
          <label className="flex items-center gap-2">
            Ask (ℏ)
            <input
              className="w-24 rounded border border-slate-300 px-2 py-1"
              type="number"
              min={1}
              step={1}
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
            />
          </label>
          <p className="text-xs text-slate-600">
            Royalty preview: {royalty.toFixed(2)} ℏ · Seller net: {net.toFixed(2)}{" "}
            ℏ
          </p>
          <button
            type="button"
            className="w-fit rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-50"
            disabled={!!loading || !tokenId}
            onClick={() => createListing()}
          >
            {loading === "list" ? "…" : "Create listing"}
          </button>
        </div>
        <div className="mt-6 grid gap-2 border-t border-slate-100 pt-4">
          <p className="font-medium">Buy listed slot (other guest)</p>
          <button
            type="button"
            className="w-fit rounded bg-emerald-800 px-3 py-2 text-white disabled:opacity-50"
            disabled={!!loading || !tokenId || !initialListing?.active}
            onClick={() => buy()}
          >
            {loading === "buy" ? "…" : "Buy at listed price"}
          </button>
        </div>
      </div>
      {msg && (
        <p className="rounded bg-emerald-50 p-2 text-emerald-900">{msg}</p>
      )}
      {err && <p className="rounded bg-red-50 p-2 text-red-800">{err}</p>}
    </div>
  );
}
