import type { ReactNode } from "react";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import { cn } from "@/lib/cn";
import type { RecoveryProofDetails } from "@/lib/types/recovery-proof";

export type LifecycleProofRow = {
  id: string;
  label: string;
  occurredAt: string;
  eventType: string;
  txId?: string;
  technicalDetails?: ReactNode;
};

function formatHbar(value: number): string {
  return `${value.toFixed(2)} ℏ`;
}

function txHref(txId?: string, hashscanUrl?: string): string | null {
  if (hashscanUrl) return hashscanUrl;
  if (txId) return getHashscanTxUrl(txId);
  return null;
}

export function RecoveryProofCard({
  proof,
  compact = false,
  className,
}: {
  proof: RecoveryProofDetails;
  compact?: boolean;
  className?: string;
}) {
  const href = txHref(proof.auditTxId ?? proof.txId, proof.hashscanUrl);
  return (
    <section
      className={cn(
        "rounded-2xl border border-emerald-200 bg-white p-4 text-sm shadow-sm ring-1 ring-emerald-900/[0.04]",
        compact && "rounded-xl p-3 text-xs",
        className
      )}
      aria-label="Verified recovery proof"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Verified receipt
          </p>
          <h2
            className={cn(
              "mt-1 font-semibold text-slate-950",
              compact ? "text-sm" : "text-lg"
            )}
          >
            {proof.title}
          </h2>
          <p className="mt-1 text-slate-600">{proof.currentState}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-950 ring-1 ring-emerald-200">
          {proof.statusLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <ProofFact label="Action" value={proof.actionLabel} />
        <ProofFact label="Ref" value={`#${proof.serial}`} />
        {proof.actorLabel ? <ProofFact label="Actor" value={proof.actorLabel} /> : null}
        {proof.counterpartyLabel ? (
          <ProofFact label="Counterparty" value={proof.counterpartyLabel} />
        ) : null}
        {proof.askPriceHbar != null ? (
          <ProofFact label="Ask" value={formatHbar(proof.askPriceHbar)} />
        ) : null}
        {proof.refundHbar != null ? (
          <ProofFact label="Refund" value={formatHbar(proof.refundHbar)} />
        ) : null}
        {proof.royaltyHbar != null ? (
          <ProofFact label="Owner royalty" value={formatHbar(proof.royaltyHbar)} />
        ) : null}
        {proof.sellerNetHbar != null ? (
          <ProofFact label="Seller net" value={formatHbar(proof.sellerNetHbar)} />
        ) : null}
        {proof.policyBasis ? (
          <ProofFact label="Policy basis" value={proof.policyBasis} />
        ) : null}
        {proof.policySnapshot ? (
          <ProofFact
            label="Booked policy"
            value={`${proof.policySnapshot.resaleAllowed ? "Resale allowed" : "No resale"} · ${proof.policySnapshot.ownerRoyaltyPercent}% owner royalty`}
          />
        ) : null}
        {proof.policySnapshot ? (
          <ProofFact
            label="Policy snapshot"
            value={proof.policySnapshot.snapshotId}
            mono
          />
        ) : null}
        {proof.approvalId ? (
          <ProofFact label="Approval" value={proof.approvalId} mono />
        ) : null}
        {proof.auditTxId ? (
          <ProofFact label="Audit tx" value={proof.auditTxId} mono />
        ) : proof.txId ? (
          <ProofFact label="Transfer tx" value={proof.txId} mono />
        ) : null}
        {proof.releaseTxId ? (
          <ProofFact label="Release/refund tx" value={proof.releaseTxId} mono />
        ) : null}
        {proof.burnTxId ? (
          <ProofFact label="Close tx" value={proof.burnTxId} mono />
        ) : null}
        {proof.scheduleProof ? (
          <ProofFact
            label="Schedule id"
            value={proof.scheduleProof.scheduleId}
            mono
          />
        ) : null}
        {proof.scheduleProof ? (
          <ProofFact
            label="Scheduled payment"
            value={`${formatHbar(proof.scheduleProof.amountHbar)} · ${proof.scheduleProof.status}`}
          />
        ) : null}
        {proof.scheduleProof?.executedAt ? (
          <ProofFact label="Executed at" value={proof.scheduleProof.executedAt} mono />
        ) : null}
        {proof.scheduleProof?.executionTxId ? (
          <ProofFact
            label="Execution tx"
            value={proof.scheduleProof.executionTxId}
            mono
          />
        ) : null}
        {proof.agentTrace ? (
          <ProofFact
            label="Agent tool"
            value={proof.agentTrace.selectedTool}
            mono
          />
        ) : null}
      </dl>

      {href ? (
        <a
          className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-950 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          Verify on HashScan
        </a>
      ) : null}
      {proof.scheduleProof ? (
        <a
          className="ml-0 mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-950 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:ml-4"
          href={proof.scheduleProof.scheduleHashscanUrl}
          target="_blank"
          rel="noreferrer"
        >
          Verify schedule on HashScan
        </a>
      ) : null}
      {proof.scheduleProof?.executionHashscanUrl ? (
        <a
          className="ml-0 mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-950 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:ml-4"
          href={proof.scheduleProof.executionHashscanUrl}
          target="_blank"
          rel="noreferrer"
        >
          Verify scheduled execution
        </a>
      ) : null}
      {proof.releaseHashscanUrl ? (
        <a
          className="ml-0 mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-950 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:ml-4"
          href={proof.releaseHashscanUrl}
          target="_blank"
          rel="noreferrer"
        >
          Verify release and refund
        </a>
      ) : null}
      {proof.burnHashscanUrl ? (
        <a
          className="ml-0 mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-950 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:ml-4"
          href={proof.burnHashscanUrl}
          target="_blank"
          rel="noreferrer"
        >
          Verify closed pass
        </a>
      ) : null}
      {proof.agentTrace ? (
        <details className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950">
          <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2">
            Concierge agent trace
          </summary>
          <ol className="mt-2 space-y-2">
            {proof.agentTrace.steps.map((step) => (
              <li key={`${step.label}-${step.status}`}>
                <span className="font-semibold">{step.label}:</span>{" "}
                {step.detail}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2">
          Technical proof fields
        </summary>
        <pre className="mt-2 overflow-x-auto text-[11px] leading-5">
          {JSON.stringify(proof, null, 2)}
        </pre>
      </details>
    </section>
  );
}

export function VerifiedLifecycleTimeline({
  rows,
  className,
}: {
  rows: LifecycleProofRow[];
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}
      aria-label="Verified lifecycle"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Verified lifecycle
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            What happened to this pass
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            This trail is reconstructed from lifecycle audit messages and current
            Mirror-derived holder state.
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {rows.map((row) => {
            const href = txHref(row.txId);
            return (
              <li
                key={row.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{row.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.occurredAt}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    {row.eventType}
                  </span>
                </div>
                {href ? (
                  <a
                    className="mt-2 inline-flex text-xs font-semibold text-slate-900 underline decoration-slate-500/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Verify transaction
                  </a>
                ) : null}
                {row.technicalDetails ? (
                  <details className="mt-2 text-xs text-slate-600">
                    <summary className="cursor-pointer rounded-md font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2">
                      Raw event details
                    </summary>
                    <div className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px] text-slate-700">
                      {row.technicalDetails}
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          No lifecycle audit messages are available for this pass yet.
        </p>
      )}
    </section>
  );
}

function ProofFact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-words font-medium text-slate-950",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
