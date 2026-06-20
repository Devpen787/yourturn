"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { RecoveryProofCard } from "@/components/proof/RecoveryProofCard";
import { WalletBudgetConnector } from "@/components/wallet/WalletBudgetConnector";
import { calcRoyalty, calcSellerNet } from "@/lib/domain/fees";
import { getConciergeHumanCopy } from "@/lib/agent/concierge-humanize";
import type { HederaAgentProof } from "@/lib/hedera-agent-kit/agent-proof";
import type { ConciergeAgentTrace, ScheduleAutomationProof } from "@/lib/types/automation";
import type { RecoveryProofDetails } from "@/lib/types/recovery-proof";
import { cn } from "@/lib/cn";

type Actor = "guestA" | "guestB";
type RecoveryAction = "create_listing" | "cancel_release_refund";

type RecoveryListing = {
  serial: number;
  askPriceHbar: number;
  royaltyHbar: number;
  sellerNetHbar: number;
  active: boolean;
};

type RecoveryPreview =
  | {
      ok: true;
      status: "recommended";
      action: "create_listing";
      previewId: string;
      expiresAt: string;
      listing: RecoveryListing;
      recommendation: {
        reason: string;
        proofTarget: string;
      };
    }
  | {
      ok: true;
      status: "recommended";
      action: "cancel_release_refund";
      previewId: string;
      expiresAt: string;
      refund: {
        serial: number;
        holderAccountId: string;
        refundHbar: number;
        effect: "transfer_to_treasury_and_burn";
      };
      recommendation: {
        reason: string;
        proofTarget: string;
      };
    }
  | {
      ok: true;
      status: "already_listed";
      listing: RecoveryListing;
      recommendation: {
        reason: string;
      };
    }
  | {
      ok: true;
      status: "blocked";
      reason: string;
      code: string;
    };

type RecoveryReceipt = {
  receiptId: string;
  action: RecoveryAction;
  actor: Actor;
  serial: number;
  askPriceHbar?: number;
  refundHbar?: number;
  royaltyHbar?: number;
  sellerNetHbar?: number;
  approvalGrantId: string;
  auditTxId?: string;
  txId?: string;
  releaseTxId?: string;
  burnTxId?: string;
  hashscanUrl?: string;
  releaseHashscanUrl?: string;
  burnHashscanUrl?: string;
  createdAt: string;
  policyBasis: string;
  scheduleProof?: ScheduleAutomationProof;
  agentTrace?: ConciergeAgentTrace;
  agentProof?: HederaAgentProof;
};

function personLabel(actor: Actor): string {
  return actor === "guestA" ? "Person A" : "Person B";
}

function formatHbar(value: number): string {
  return `${value.toFixed(2)} ℏ`;
}

function actionFromProof(proof?: RecoveryProofDetails | null): RecoveryAction | null {
  if (!proof) return null;
  return proof.refundHbar != null ? "cancel_release_refund" : "create_listing";
}

export function RecoveryConciergePanel({
  serial,
  actor,
  slotTitle,
  defaultAskPriceHbar,
  tokenReady,
  blockingReason,
  resaleAllowed,
  releaseAllowed,
  initialProof,
  focusOnMount,
  onListed,
}: {
  serial: number;
  actor: Actor;
  slotTitle: string;
  defaultAskPriceHbar: number;
  tokenReady: boolean;
  blockingReason?: string | null;
  resaleAllowed: boolean;
  releaseAllowed: boolean;
  initialProof?: RecoveryProofDetails | null;
  focusOnMount?: boolean;
  onListed?: () => void;
}) {
  const panelTitleId = useId();
  const askFieldId = useId();
  const [ask, setAsk] = useState(() => defaultAskPriceHbar.toString());
  const [action, setAction] = useState<RecoveryAction>(() =>
    actionFromProof(initialProof) ??
    (resaleAllowed ? "create_listing" : "cancel_release_refund")
  );
  const [preview, setPreview] = useState<RecoveryPreview | null>(null);
  const [receipt, setReceipt] = useState<RecoveryReceipt | null>(null);
  const [inspectedScheduleProof, setInspectedScheduleProof] =
    useState<ScheduleAutomationProof | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"preview" | "confirm" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const proofOnlyMode = !!initialProof && !receipt;

  useEffect(() => {
    setAsk(defaultAskPriceHbar.toString());
  }, [defaultAskPriceHbar, serial]);

  useEffect(() => {
    setAction(
      actionFromProof(initialProof) ??
        (resaleAllowed ? "create_listing" : "cancel_release_refund")
    );
    setPreview(null);
    setReceipt(null);
    setError(null);
    setSuccess(null);
  }, [initialProof, resaleAllowed, serial]);

  const askNum = Number(ask) || 0;
  const askInvalid = ask.trim() !== "" && (!Number.isFinite(askNum) || askNum <= 0);
  const previewListing =
    preview?.status === "already_listed" ||
    (preview?.status === "recommended" && preview.action === "create_listing")
      ? preview.listing
      : null;
  const previewRefund =
    preview?.status === "recommended" && preview.action === "cancel_release_refund"
      ? preview.refund
      : null;
  const displayRoyalty = previewListing?.royaltyHbar ?? calcRoyalty(askNum);
  const displayNet = previewListing?.sellerNetHbar ?? calcSellerNet(askNum);
  const humanCopy = getConciergeHumanCopy(action);
  const receiptProof: RecoveryProofDetails | null = receipt
      ? {
        title:
          receipt.action === "cancel_release_refund"
            ? "Refund release completed"
            : "Recovery listing created",
        statusLabel:
          receipt.action === "cancel_release_refund" ? "Refunded" : "Listed",
        actionLabel:
          receipt.action === "cancel_release_refund"
            ? "Release + test HBAR refund"
            : "Concierge recovery listing",
        serial: receipt.serial,
        actorLabel: personLabel(receipt.actor),
        currentState:
          receipt.action === "cancel_release_refund"
            ? "The booking right was released back to the provider, closed, and a real testnet HBAR refund was sent to the holder."
            : "This pass is listed for another customer to take over.",
        askPriceHbar: receipt.askPriceHbar,
        refundHbar: receipt.refundHbar,
        royaltyHbar: receipt.royaltyHbar,
        sellerNetHbar: receipt.sellerNetHbar,
        approvalId: receipt.approvalGrantId,
        auditTxId: receipt.auditTxId,
        txId: receipt.txId,
        releaseTxId: receipt.releaseTxId,
        burnTxId: receipt.burnTxId,
        hashscanUrl: receipt.hashscanUrl,
        releaseHashscanUrl: receipt.releaseHashscanUrl,
        burnHashscanUrl: receipt.burnHashscanUrl,
        policyBasis: receipt.policyBasis,
        scheduleProof: receipt.scheduleProof,
        agentTrace: receipt.agentTrace,
        agentProof: receipt.agentProof,
        occurredAt: receipt.createdAt,
      }
    : null;
  const baseVisibleProof = receiptProof ?? initialProof ?? null;
  const visibleProof =
    baseVisibleProof && inspectedScheduleProof
      ? { ...baseVisibleProof, scheduleProof: inspectedScheduleProof }
      : baseVisibleProof;

  const canConfirm = useMemo(
    () =>
      preview?.status === "recommended" &&
      (action === "cancel_release_refund" || !askInvalid) &&
      tokenReady &&
      !blockingReason,
    [action, askInvalid, blockingReason, preview, tokenReady]
  );

  async function previewRecovery() {
    if (blockingReason) {
      setError(blockingReason);
      return;
    }
    if (
      action === "create_listing" &&
      (!Number.isFinite(askNum) || askNum <= 0)
    ) {
      setError("Enter a positive resale ask before Concierge previews the handoff.");
      return;
    }
    setLoading("preview");
    setPreview(null);
    setReceipt(null);
    setInspectedScheduleProof(null);
    setSuccess(null);
    setSuccessLink(null);
    setError(null);
    try {
      const res = await fetch("/api/recovery/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor,
          serial,
          action,
          ...(action === "create_listing" ? { askPriceHbar: askNum } : {}),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || res.statusText);
        return;
      }
      setPreview(data);
      if (data.status === "blocked") {
        setError(data.reason);
      } else if (data.status === "already_listed") {
        setSuccess("This pass already has an active resale listing.");
      } else {
        setSuccess(humanCopy.previewSuccess);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function confirmRecovery(): Promise<boolean> {
    if (preview?.status !== "recommended") {
      setError("Preview the recovery action before approving it.");
      return false;
    }
    setLoading("confirm");
    setError(null);
    setSuccess(null);
    setSuccessLink(null);
    try {
      const res = await fetch("/api/recovery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, previewId: preview.previewId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || res.statusText);
        return false;
      }
      setReceipt(data.receipt);
      setSuccess(
        data.receipt?.action === "cancel_release_refund"
          ? `${personLabel(actor)} approved release. Booking #${serial} was closed and a real testnet HBAR refund was sent.`
          : `${personLabel(actor)} approved recovery. Booking #${serial} is now listed for resale.`
      );
      setSuccessLink(
        data.receipt?.hashscanUrl
          ? {
              href: data.receipt.hashscanUrl,
              label: "View audit transaction on HashScan",
            }
          : null
      );
      onListed?.();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function inspectScheduleProof(): Promise<void> {
    if (!visibleProof?.scheduleProof) return;
    setLoading("preview");
    setError(null);
    try {
      const res = await fetch("/api/automation/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, serial }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || res.statusText);
        return;
      }
      const nextScheduleProof = data.proof?.scheduleProof;
      if (nextScheduleProof) {
        setInspectedScheduleProof(nextScheduleProof);
      }
      if (receipt && nextScheduleProof) {
        setReceipt({ ...receipt, scheduleProof: nextScheduleProof });
      }
      setSuccess(
        nextScheduleProof?.status === "executed"
          ? "Schedule proof updated: the network has executed the scheduled payment."
          : "Schedule proof updated from Hedera."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section
      aria-labelledby={panelTitleId}
      className={cn(
        "overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/75 to-violet-50/70 shadow-sm ring-1 ring-slate-900/[0.03]",
        focusOnMount && "ring-2 ring-sky-200"
      )}
    >
      <div className="border-b border-white/80 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Concierge recovery
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={panelTitleId} className="text-lg font-semibold text-slate-950">
              {proofOnlyMode
                ? "Recovery receipt for this booking"
                : "Tell Concierge what you need"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {proofOnlyMode
                ? "Concierge recorded the approved recovery action, provider policy basis, and Hedera proof for this booking."
                : "Use normal customer language: sell the booking if someone else can take it, or release it when the provider allows a refund. Concierge checks the rules and asks before anything changes."}
            </p>
          </div>
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {personLabel(actor)}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="max-w-3xl space-y-4">
          {proofOnlyMode ? (
            <div className="rounded-xl border border-white/80 bg-white/85 p-4 text-sm text-slate-700 shadow-sm">
              <p className="font-medium text-slate-950">{slotTitle}</p>
              <p className="mt-1 text-xs text-slate-600">Booking #{serial}</p>
              <p className="mt-4 leading-6">
                This view is a receipt. It is intentionally read-only so the demo can
                show what happened without starting another recovery action.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/80 bg-white/85 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-950">{slotTitle}</p>
            <p className="mt-1 text-xs text-slate-600">Booking #{serial}</p>
            <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-950">
              <p className="font-semibold">Concierge guide</p>
              <p className="mt-1">{humanCopy.summary}</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition",
                  action === "create_listing"
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  !resaleAllowed && "cursor-not-allowed opacity-55"
                )}
                disabled={!resaleAllowed}
                onClick={() => {
                  setAction("create_listing");
                  setPreview(null);
                  setReceipt(null);
                }}
              >
                <span className="block text-xs opacity-75">I need help because</span>
                <span className="mt-1 block font-semibold">Someone else can take my spot</span>
                <span className="mt-1 block text-xs opacity-80">
                  Concierge checks provider rules and prepares a resale listing.
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition",
                  action === "cancel_release_refund"
                    ? "border-emerald-900 bg-emerald-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  !releaseAllowed && "cursor-not-allowed opacity-55"
                )}
                disabled={!releaseAllowed}
                onClick={() => {
                  setAction("cancel_release_refund");
                  setPreview(null);
                  setReceipt(null);
                }}
              >
                <span className="block text-xs opacity-75">I need help because</span>
                <span className="mt-1 block font-semibold">I want to give it back</span>
                <span className="mt-1 block text-xs opacity-80">
                  Concierge checks refund rules before closing the booking.
                </span>
              </button>
            </div>
            {action === "create_listing" ? (
              <>
                <label className="mt-4 grid gap-1 text-sm" htmlFor={askFieldId}>
                  <span className="font-medium text-slate-800">Price another customer would pay</span>
                  <input
                    id={askFieldId}
                    className={cn(
                      "min-h-[44px] w-32 rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
                      askInvalid ? "border-red-400 bg-red-50/40" : "border-slate-300"
                    )}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={ask}
                    aria-invalid={askInvalid}
                    onChange={(event) => setAsk(event.target.value)}
                  />
                </label>
                <p className="mt-2 text-xs text-slate-600">
                  You can keep the original price, lower it to recover some value, or raise it if demand is high.
                </p>
              </>
            ) : (
              <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">
                Concierge uses the original booking price. It only calls this complete after the testnet HBAR refund succeeds.
              </p>
            )}
            </div>
          )}

          {!proofOnlyMode ? (
            <WalletBudgetConnector actorLabel={personLabel(actor)} />
          ) : null}

          {!proofOnlyMode ? (
            <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              loading={loading === "preview"}
              loadingLabel={humanCopy.previewingLabel}
              disabled={
                !tokenReady ||
                !!blockingReason ||
                (action === "create_listing" && askInvalid) ||
                loading === "confirm"
              }
              onClick={() => void previewRecovery()}
            >
              {humanCopy.previewLabel}
            </Button>
            <Button
              type="button"
              variant="primarySuccess"
              loading={loading === "confirm"}
              loadingLabel={humanCopy.workingLabel}
              disabled={!canConfirm || loading === "preview"}
              onClick={() => setConfirmOpen(true)}
            >
              {humanCopy.approvalLabel}
            </Button>
            </div>
          ) : null}

          {!proofOnlyMode ? (
            <LiveFeedback
              success={success}
              successLink={successLink}
              error={error}
            />
          ) : null}
        </div>

        <aside className="max-w-3xl rounded-xl border border-white/80 bg-white/85 p-4 text-sm shadow-sm">
          <p className="font-semibold text-slate-950">
            {visibleProof || preview?.status === "recommended"
              ? "What Concierge checked"
              : "What Concierge will check"}
          </p>
          <ul className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
            {humanCopy.checks.map((check) => (
              <li key={check} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                {check}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">
                {action === "cancel_release_refund" ? "Refund" : "Ask"}
              </dt>
              <dd className="font-medium text-slate-950">
                {formatHbar(
                  action === "cancel_release_refund"
                    ? previewRefund?.refundHbar ?? defaultAskPriceHbar
                    : previewListing?.askPriceHbar ?? askNum
                )}
              </dd>
            </div>
            {action === "create_listing" ? (
              <>
              <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Provider share</dt>
              <dd className="font-medium text-slate-950">
                {formatHbar(displayRoyalty)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">You recover</dt>
              <dd className="font-medium text-slate-950">
                {formatHbar(displayNet)}
              </dd>
            </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">What changes</dt>
                  <dd className="font-medium text-slate-950">Pass closes</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Refund rail</dt>
                  <dd className="font-medium text-slate-950">Testnet HBAR</dd>
                </div>
              </>
            )}
          </dl>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            {visibleProof
              ? "This receipt keeps the approved recovery action, price math, approval, and Hedera proof visible for review."
              : preview?.status === "recommended"
              ? `${humanCopy.previewSuccess} ${humanCopy.proofPlainEnglish}`
              : preview?.status === "already_listed"
                ? preview.recommendation.reason
                : blockingReason ??
                  "Concierge checks live holder state and provider rules before approval."}
          </div>
          {visibleProof ? (
            <div className="mt-4 space-y-2">
              <RecoveryProofCard proof={visibleProof} compact />
              {visibleProof.scheduleProof ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={loading === "preview"}
                  loadingLabel="Inspecting…"
                  onClick={() => void inspectScheduleProof()}
                >
                  Inspect schedule proof
                </Button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={
          action === "cancel_release_refund"
            ? "Approve release and refund"
            : "Approve resale recovery"
        }
        description={
          action === "cancel_release_refund"
            ? "This approval returns the pass to the provider, closes it, and sends a real testnet HBAR refund to the current holder."
            : "This approval creates a resale listing for the current booking. Another customer can then buy it through the existing resale flow."
        }
        details={[
          { label: "Seller", value: personLabel(actor) },
          { label: "Booking", value: `${slotTitle} · Booking #${serial}` },
          ...(action === "cancel_release_refund"
            ? [
                {
                  label: "Refund",
                  value: formatHbar(previewRefund?.refundHbar ?? defaultAskPriceHbar),
                },
                { label: "Effect", value: "Return to provider and close pass" },
              ]
            : [
                { label: "Ask", value: formatHbar(previewListing?.askPriceHbar ?? askNum) },
                { label: "Provider share", value: formatHbar(displayRoyalty) },
                { label: "You recover", value: formatHbar(displayNet) },
              ]),
        ]}
        warning={
          action === "cancel_release_refund"
            ? humanCopy.approvalWarning
            : humanCopy.approvalWarning
        }
        confirmLabel={humanCopy.approvalLabel}
        loading={loading === "confirm"}
        loadingLabel={humanCopy.workingLabel}
        onClose={() => {
          if (loading == null) setConfirmOpen(false);
        }}
        onConfirm={() => {
          void confirmRecovery().then((ok) => {
            if (ok) setConfirmOpen(false);
          });
        }}
      />
    </section>
  );
}
