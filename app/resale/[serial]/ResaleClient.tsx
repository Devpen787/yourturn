"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { calcRoyalty } from "@/lib/domain/fees";
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

  async function createListing() {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Switch to the person who currently holds this pass before listing it.");
      return;
    }
    if (!Number.isFinite(askNum) || askNum <= 0) {
      setErr("Enter a positive resale ask");
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
      setMsg(
        `Listing created at ${askNum.toFixed(2)} ℏ. Switch to the other person to complete the handoff.`
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function buy() {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Switch to the person who is buying this pass.");
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
      setMsg(
        `Purchased. This pass now belongs to the buyer. Tx: ${data.txId}`
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <ActorSelector
        pageDefault="guestA"
        allowedActors={["guestA", "guestB"]}
        title="Customer handoff"
        description="Switch between Person A and Person B to show the seller side and the buyer side of the resale flow."
        onChange={setActor}
      />
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-medium">{slotTitle}</h2>
        {!tokenId && (
          <p className="mt-2 text-amber-800">
            Demo not ready yet — open the provider dashboard and run setup first.
          </p>
        )}
        {initialListing?.active && (
          <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
            <p>
              <span className="font-medium">Active listing:</span>{" "}
              <strong>{initialListing.askPriceHbar} ℏ</strong>
            </p>
            <p className="mt-1 text-sm">
              Listed by (seller account):{" "}
              <span className="font-mono text-xs">{initialListing.sellerAccountId}</span>
            </p>
            <p className="mt-2 text-sm">
              The seller has already approved this move by creating the listing.
              Another buyer can now take over the pass.
            </p>
          </div>
        )}
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
          <p className="font-medium">Current holder lists the pass</p>
          <p className="text-xs text-slate-600">
            The holder sets the resale ask under provider rules. They may list above
            cost, at cost, or below cost.
          </p>
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
            Provider fee on resale (10% preview): {royalty.toFixed(2)} ℏ. Confirm
            final amounts on the completed resale transaction.
          </p>
          <button
            type="button"
            className="w-fit rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-50"
            disabled={!!loading || !tokenId}
            onClick={() => createListing()}
          >
            {loading === "list" ? "…" : "List this pass"}
          </button>
        </div>
        <div className="mt-6 grid gap-2 border-t border-slate-100 pt-4">
          <p className="font-medium">Another person buys the listed pass</p>
          <p className="text-xs text-slate-600">
            Buying this listing transfers the pass to the new holder under provider policy.
          </p>
          <button
            type="button"
            className="w-fit rounded bg-emerald-800 px-3 py-2 text-white disabled:opacity-50"
            disabled={!!loading || !tokenId || !initialListing?.active}
            onClick={() => buy()}
          >
            {loading === "buy" ? "…" : "Buy this pass"}
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
