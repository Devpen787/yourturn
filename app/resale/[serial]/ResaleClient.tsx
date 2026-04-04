"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { ResaleAskPrice } from "@/components/ResaleAskPrice";
import { describeDemoRoyaltyFromAsk } from "@/lib/demo/pricing";
import type { ResaleListing } from "@/lib/types/listing";

export function ResaleClient({
  serial,
  tokenId,
  initialListing,
  slotTitle,
  guestAId = "",
  guestBId = "",
}: {
  serial: number;
  tokenId: string | null;
  initialListing: ResaleListing | null;
  slotTitle: string;
  guestAId?: string;
  guestBId?: string;
}) {
  const router = useRouter();
  const [actor, setActor] = useState<ActorValue>("guestA");
  const [ask, setAsk] = useState(() => {
    if (initialListing?.askUsd != null)
      return String(initialListing.askUsd);
    if (initialListing?.askPriceHbar != null)
      return String(initialListing.askPriceHbar);
    return "15";
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const listedActive = initialListing?.active === true;
  const listedAsk = listedActive ? initialListing!.askPriceHbar : Number(ask) || 0;
  const listedRoyalty = describeDemoRoyaltyFromAsk(listedAsk);
  const draftRoyalty = describeDemoRoyaltyFromAsk(Number(ask) || 0);

  function accountForActor(a: ActorValue): string {
    if (a === "guestA") return guestAId.trim();
    if (a === "guestB") return guestBId.trim();
    return "";
  }

  async function createListing() {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Select guestA or guestB as seller");
      return;
    }
    const askNum = Number(ask);
    if (!Number.isFinite(askNum) || askNum < 0.01) {
      setErr("Ask must be at least US$0.01");
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
          askUsd: askNum,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      setMsg(
        `Listing live: US$${askNum} (= ${askNum} ℏ, demo 1 ℏ = US$1). Switch to the other guest — Buy below or Public slots.`
      );
      setActor((prev) =>
        prev === "guestA" ? "guestB" : prev === "guestB" ? "guestA" : prev
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
      setErr("Select guestA or guestB as buyer");
      return;
    }
    if (!initialListing?.active) return;
    const buyerAcc = accountForActor(actor);
    const seller = initialListing.sellerAccountId.trim();
    if (buyerAcc && seller && buyerAcc === seller) {
      setErr("Switch to the other guest — you cannot buy your own listing.");
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

        {listedActive ? (
          <>
            <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
              <p className="font-medium">
                On sale for{" "}
                <ResaleAskPrice
                  askUsd={initialListing!.askUsd}
                  askPriceHbar={initialListing!.askPriceHbar}
                />
              </p>
              <p className="mt-1 text-sm">
                Seller account:{" "}
                <span className="font-mono text-xs">
                  {initialListing!.sellerAccountId}
                </span>
              </p>
              <p className="mt-2 text-sm">
                Select the <strong>other</strong> guest (not the seller), then
                buy. You can also buy from{" "}
                <strong>Public slots</strong> with the green button.
              </p>
              <p className="mt-2 text-xs text-slate-700">
                <strong>10% issuer royalty (HTS):</strong>{" "}
                {listedRoyalty.royaltyUsd} ({listedRoyalty.royaltyHbar}) · Seller
                net ≈ {listedRoyalty.netUsd} ({listedRoyalty.netHbar})
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50"
                disabled={!!loading || !tokenId}
                onClick={() => buy()}
              >
                {loading === "buy"
                  ? "…"
                  : initialListing!.askUsd != null
                    ? `Buy at US$${initialListing!.askUsd}`
                    : `Buy at ${initialListing!.askPriceHbar} ℏ`}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
            <p className="font-medium">List for resale (holder only)</p>
            <p className="text-xs text-slate-600">
              After listing, this form is hidden — only the other guest can buy.
            </p>
            <label className="flex flex-wrap items-center gap-2">
              Ask (USD)
              <input
                className="w-28 rounded border border-slate-300 px-2 py-1"
                type="number"
                min={0.01}
                step={0.01}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
              />
            </label>
            <p className="text-xs text-slate-600">
              <strong>10% royalty preview:</strong> {draftRoyalty.royaltyUsd} (
              {draftRoyalty.royaltyHbar}) · Seller net ≈ {draftRoyalty.netUsd} (
              {draftRoyalty.netHbar}). Same USD number is used as ℏ on testnet.
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
        )}
      </div>
      {msg && (
        <p className="rounded bg-emerald-50 p-2 text-emerald-900">{msg}</p>
      )}
      {err && <p className="rounded bg-red-50 p-2 text-red-800">{err}</p>}
    </div>
  );
}
