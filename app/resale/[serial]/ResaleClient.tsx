"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { useToast } from "@/components/providers/ToastProvider";
import { calcRoyalty } from "@/lib/domain/fees";
import type { SlotStatus } from "@/lib/domain/guards";
import type { ResaleListing } from "@/lib/types/listing";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";

function demoPersonLabel(actor: "guestA" | "guestB"): string {
  return actor === "guestA" ? "Person A" : "Person B";
}

export function ResaleClient({
  serial,
  tokenId,
  mirrorHolderActor,
  initialListing,
  currentStatus,
  resaleAllowed,
  slotTitle,
  lockTo,
}: {
  serial: number;
  tokenId: string | null;
  mirrorHolderActor: "guestA" | "guestB" | null;
  initialListing: ResaleListing | null;
  currentStatus: SlotStatus | null;
  resaleAllowed: boolean;
  slotTitle: string;
  lockTo?: "guestA" | "guestB";
}) {
  const router = useRouter();
  const toast = useToast();
  const [actor, setActor] = useState<ActorValue>("guestA");
  const [ask, setAsk] = useState(
    initialListing?.askPriceHbar?.toString() ?? "20"
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"list" | "buy" | null>(null);
  const askFieldId = useId();
  const feeHintId = useId();

  const askNum = Number(ask) || 0;
  const royalty = calcRoyalty(askNum);
  const askInvalid = useMemo(() => {
    if (ask.trim() === "") return false;
    return !Number.isFinite(askNum) || askNum <= 0;
  }, [ask, askNum]);

  const listPersonaMismatch =
    !!tokenId &&
    mirrorHolderActor != null &&
    actor !== mirrorHolderActor;
  const buyPersonaBlocksPurchase =
    !!initialListing?.active &&
    mirrorHolderActor != null &&
    actor === mirrorHolderActor;
  const resaleBlockedMessage = useMemo(() => {
    if (currentStatus === "AVAILABLE") {
      return "No customer holds this pass yet, so there is nothing to resell.";
    }
    if (currentStatus === "FROZEN") {
      return "The provider has paused this pass. It cannot be listed or bought until it is reopened.";
    }
    if (currentStatus === "USED") {
      return "This pass has already been checked in and closed. It cannot be resold.";
    }
    if (!resaleAllowed) {
      return "This session is not set up for resale under provider rules.";
    }
    return null;
  }, [currentStatus, resaleAllowed]);

  const canShowSellerControls =
    currentStatus === "HELD" &&
    resaleAllowed &&
    !initialListing?.active;
  const canShowBuyerControls =
    !!initialListing?.active &&
    currentStatus !== "USED" &&
    currentStatus !== "FROZEN";
  const showActionSurface = canShowSellerControls || canShowBuyerControls;

  const listDisabled = !!loading || !tokenId || !!resaleBlockedMessage || listPersonaMismatch;
  const buyDisabled =
    !!loading ||
    !tokenId ||
    !!resaleBlockedMessage ||
    !initialListing?.active ||
    buyPersonaBlocksPurchase;

  const mirrorHint =
    !tokenId || mirrorHolderActor == null
      ? null
      : listPersonaMismatch
        ? {
            tone: "warn" as const,
            text: (
              <>
                Switch to <strong>{demoPersonLabel(mirrorHolderActor)}</strong>{" "}
                before listing — the API only accepts the current on-chain holder
                as seller.
              </>
            ),
          }
        : buyPersonaBlocksPurchase
          ? {
              tone: "warn" as const,
              text: (
                <>
                  The listed seller is{" "}
                  <strong>{demoPersonLabel(mirrorHolderActor)}</strong>. Switch to
                  the buyer (the other person) to complete the purchase.
                </>
              ),
            }
          : {
              tone: "info" as const,
              text: (
                <>
                  Mirror shows this pass is held by{" "}
                  <strong>{demoPersonLabel(mirrorHolderActor)}</strong>. Match the
                  selector when listing; use the other person to buy an active
                  listing.
                </>
              ),
            };

  async function createListing(): Promise<boolean> {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Switch to the person who currently holds this pass before listing it.");
      return false;
    }
    if (!Number.isFinite(askNum) || askNum <= 0) {
      setErr("Enter a positive resale ask");
      return false;
    }
    setLoading("list");
    setSuccess(null);
    setSuccessLink(null);
    setErr(null);
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
        return false;
      }
      const auditHref =
        typeof data.hashscanUrl === "string" && data.hashscanUrl.length > 0
          ? data.hashscanUrl
          : typeof data.auditTxId === "string" && data.auditTxId.length > 0
            ? getHashscanTxUrl(data.auditTxId)
            : null;
      setSuccess(
        `${demoPersonLabel(actor)} listed Ref #${serial} at ${askNum.toFixed(
          2
        )} ℏ. Switch to the other person to complete the handoff.`
      );
      setSuccessLink(
        auditHref
          ? {
              href: auditHref,
              label: "View audit transaction on HashScan",
            }
          : null
      );
      toast({
        variant: "success",
        message: `Listing created at ${askNum.toFixed(2)} ℏ. Switch to the other person to complete the handoff.`,
        link: auditHref
          ? {
              href: auditHref,
              label: "View audit transaction on HashScan",
            }
          : undefined,
      });
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function buy(): Promise<boolean> {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Switch to the person who is buying this pass.");
      return false;
    }
    setLoading("buy");
    setSuccess(null);
    setSuccessLink(null);
    setErr(null);
    try {
      const res = await fetch("/api/resale-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, serial }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return false;
      }
      const txHref =
        typeof data.hashscanUrl === "string" && data.hashscanUrl.length > 0
          ? data.hashscanUrl
          : typeof data.txId === "string" && data.txId.length > 0
            ? getHashscanTxUrl(data.txId)
            : null;
      setSuccess(
        `${demoPersonLabel(actor)} bought Ref #${serial}. The provider dashboard and My passes will now show the new holder.`
      );
      setSuccessLink(
        txHref
          ? {
              href: txHref,
              label: "View transaction on HashScan",
            }
          : null
      );
      toast({
        variant: "success",
        message: "Purchased. This pass now belongs to the buyer.",
        link: txHref
          ? {
              href: txHref,
              label: "View transaction on HashScan",
            }
          : undefined,
      });
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "mt-4 space-y-4",
        tokenId && "pb-28 md:pb-4"
      )}
    >
      <ActorSelector
        pageDefault={lockTo ?? "guestA"}
        allowedActors={["guestA", "guestB"]}
        title="Customer handoff"
        description="Switch between Person A and Person B to show the seller side and the buyer side of the resale flow."
        lockTo={lockTo}
        onChange={setActor}
      />
      <p className="text-sm text-slate-600">
        Person A and Person B are demo customer identities. When you use demo sign-in, this page locks to that customer.{" "}
        <Link
          href="/demo-help"
          className={cn(getButtonClassName("textLink"), "min-h-0 px-0 py-0 text-sm")}
        >
          How this demo works
        </Link>
      </p>
      {mirrorHint ? (
        <p
          className={cn(
            "rounded border p-3 text-sm",
            mirrorHint.tone === "warn"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-slate-200 bg-slate-50 text-slate-700"
          )}
          role={mirrorHint.tone === "warn" ? "status" : undefined}
        >
          {mirrorHint.text}
        </p>
      ) : null}
      {resaleBlockedMessage ? (
        <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {resaleBlockedMessage}
        </p>
      ) : null}
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
        {showActionSurface ? (
          <>
            {canShowSellerControls ? (
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
                  disabled={listDisabled}
                  className="w-fit"
                  onClick={() => {
                    setErr(null);
                    setConfirmAction("list");
                  }}
                >
                  List this pass
                </Button>
              </div>
            ) : null}
            {canShowBuyerControls ? (
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
                  disabled={buyDisabled}
                  className="w-fit"
                  onClick={() => {
                    setErr(null);
                    setConfirmAction("buy");
                  }}
                >
                  Buy this pass
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            This page is now read-only because the pass is not in a live resale state.
          </div>
        )}
      </div>
      <LiveFeedback
        className="space-y-2"
        success={success}
        successLink={successLink}
        error={err}
      />
      {tokenId && showActionSurface ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
          role="region"
          aria-label="Resale actions"
        >
          <div className="mx-auto flex max-w-lg gap-2">
            <Button
              type="button"
              variant="primary"
              loading={loading === "list"}
              loadingLabel="Listing…"
              disabled={listDisabled}
              className="min-w-0 flex-1"
              onClick={() => {
                setErr(null);
                setConfirmAction("list");
              }}
            >
              List
            </Button>
            <Button
              type="button"
              variant="primarySuccess"
              loading={loading === "buy"}
              loadingLabel="Buying…"
              disabled={buyDisabled}
              className="min-w-0 flex-1"
              onClick={() => {
                setErr(null);
                setConfirmAction("buy");
              }}
            >
              Buy
            </Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmAction === "list"}
        title="Review this resale listing"
        description="Check the seller, ask, and fee preview before you list this pass."
        details={[
          { label: "Seller", value: actor === "guestA" ? "Person A" : "Person B" },
          { label: "Pass", value: `${slotTitle} · Ref #${serial}` },
          { label: "Ask", value: `${askNum.toFixed(2)} ℏ` },
          { label: "Provider fee preview", value: `${royalty.toFixed(2)} ℏ` },
        ]}
        warning="Listing a pass is the seller's approval to move it. There is no separate second approval step in this demo."
        confirmLabel="List this pass"
        loading={loading === "list"}
        loadingLabel="Listing…"
        onClose={() => {
          if (loading == null) setConfirmAction(null);
        }}
        onConfirm={() => {
          void createListing().then((ok) => {
            if (ok) setConfirmAction(null);
          });
        }}
      />
      <ConfirmDialog
        open={confirmAction === "buy"}
        title="Review this purchase"
        description="Check the buyer, the listed ask, and the role switch before you buy this pass."
        details={[
          { label: "Buyer", value: actor === "guestA" ? "Person A" : "Person B" },
          { label: "Pass", value: `${slotTitle} · Ref #${serial}` },
          {
            label: "Listed ask",
            value: `${initialListing?.askPriceHbar ?? askNum} ℏ`,
          },
          {
            label: "Provider fee preview",
            value: `${calcRoyalty(initialListing?.askPriceHbar ?? askNum).toFixed(2)} ℏ`,
          },
        ]}
        warning="Buying transfers the pass to the buyer immediately in this demo. There is no extra approval step after purchase."
        confirmLabel="Buy this pass"
        loading={loading === "buy"}
        loadingLabel="Buying…"
        onClose={() => {
          if (loading == null) setConfirmAction(null);
        }}
        onConfirm={() => {
          void buy().then((ok) => {
            if (ok) setConfirmAction(null);
          });
        }}
      />
    </div>
  );
}
