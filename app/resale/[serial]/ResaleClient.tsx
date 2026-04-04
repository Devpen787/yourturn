"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { calcRoyalty } from "@/lib/domain/fees";
import type { ResaleListing } from "@/lib/types/listing";
import { Button } from "@/components/ui/Button";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { cn } from "@/lib/cn";

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
  const askFieldId = useId();
  const feeHintId = useId();

  const askNum = Number(ask) || 0;
  const royalty = calcRoyalty(askNum);
  const askInvalid = useMemo(() => {
    if (ask.trim() === "") return false;
    return !Number.isFinite(askNum) || askNum <= 0;
  }, [ask, askNum]);

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
          <label
            className="flex flex-wrap items-center gap-2"
            htmlFor={askFieldId}
          >
            <span className="font-medium text-slate-800">Ask (ℏ)</span>
            <input
              id={askFieldId}
              className={cn(
                "min-h-[44px] w-28 rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
                askInvalid ? "border-red-400 bg-red-50/40" : "border-slate-300"
              )}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={askInvalid}
              aria-describedby={feeHintId}
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
            />
          </label>
          <p id={feeHintId} className="text-xs text-slate-600">
            Provider fee on resale (10% preview): {royalty.toFixed(2)} ℏ. Confirm
            final amounts on the completed resale transaction.
          </p>
          <Button
            type="button"
            variant="primary"
            loading={loading === "list"}
            loadingLabel="Listing…"
            disabled={!!loading || !tokenId}
            className="w-fit"
            onClick={() => createListing()}
          >
            List this pass
          </Button>
        </div>
        <div className="mt-6 grid gap-2 border-t border-slate-100 pt-4">
          <p className="font-medium">Another person buys the listed pass</p>
          <p className="text-xs text-slate-600">
            Buying this listing transfers the pass to the new holder under provider policy.
          </p>
          <Button
            type="button"
            variant="primarySuccess"
            loading={loading === "buy"}
            loadingLabel="Buying…"
            disabled={!!loading || !tokenId || !initialListing?.active}
            className="w-fit"
            onClick={() => buy()}
          >
            Buy this pass
          </Button>
        </div>
      </div>
      <LiveFeedback className="space-y-2" success={msg} error={err} />
    </div>
  );
}
