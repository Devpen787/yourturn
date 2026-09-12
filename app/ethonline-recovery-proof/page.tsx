import Link from "next/link";
import { cn } from "@/lib/cn";
import { getButtonClassName } from "@/components/ui/button-classes";
import { ETHONLINE_HEDERA_RECOVERY_PROOF } from "@/lib/hedera-agent-kit/ethonline-recovery-proof";

export const metadata = {
  title: "YourTurn Hedera Delegated Recovery Proof",
  robots: { index: false, follow: false },
};

function Badge({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "amber" | "blue" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-blue-50 text-blue-800 ring-blue-200";
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", toneClass)}>{children}</span>;
}

function ExternalProofLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="font-medium text-brand-link underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function EthOnlineRecoveryProofPage() {
  const proof = ETHONLINE_HEDERA_RECOVERY_PROOF;

  return (
    <div className="max-w-5xl text-sm">
      <Link href="/" className={cn(getButtonClassName("textLink"), "inline-flex min-h-[44px] items-center")}>
        ← Back to home
      </Link>

      <header className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Canonical proof: {proof.evidenceLevel}</Badge>
          <Badge tone="amber">New surface: {proof.additiveSurfaceEvidenceLevel}</Badge>
          <Badge tone="blue">Hedera Testnet</Badge>
          <Badge tone="amber">Continuity: ETHOnline-new</Badge>
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reviewer cockpit</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">YourTurn Delegated Recovery</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
          Delegate one booking — not your wallet. The agent evaluates recovery offers under the holder and provider mandate, prepares unsigned Hedera transaction bytes, and only a compliant recovery can reach settlement.
        </p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">1 · Authority</p>
          <h2 className="mt-2 font-semibold text-slate-950">One exact serial</h2>
          <p className="mt-2 leading-5 text-slate-600">BOOKED {proof.delegation.tokenId} · #{proof.delegation.serial}</p>
          <p className="mt-2 text-xs text-slate-500">Owner key never lives in the agent/backend.</p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">2 · Policy</p>
          <h2 className="mt-2 font-semibold text-slate-950">32 USDC blocked</h2>
          <p className="mt-2 leading-5 text-slate-700">Below the holder’s 40 USDC minimum.</p>
          <p className="mt-2 text-xs font-medium text-rose-800">No nonce · no RETURN_BYTES · no network mutation</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">3 · Decision</p>
          <h2 className="mt-2 font-semibold text-slate-950">45 USDC allowed</h2>
          <p className="mt-2 leading-5 text-slate-700">The same load-bearing BookingRightDelegationPolicy returns ALLOW.</p>
        </article>
        <article className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">4 · Settlement</p>
          <h2 className="mt-2 font-semibold text-slate-950">NFT + USDC together</h2>
          <p className="mt-2 leading-5 text-slate-700">One successful Hedera transaction contains both settlement legs.</p>
        </article>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Canonical public proof</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Transaction {proof.settlement.transactionId}</h2>
          </div>
          <Badge>SUCCESS</Badge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Booking movement</p>
            <p className="mt-1 tabular-nums text-slate-900">#{proof.settlement.bookingSerial} → {proof.finalState.ownerAccountId}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Customer recovery</p>
            <p className="mt-1 tabular-nums text-slate-900">45.00 USDC · token {proof.settlement.usdcTokenId}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Evidence</p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <ExternalProofLink href={proof.settlement.hashscan}>HashScan</ExternalProofLink>
              <ExternalProofLink href={proof.settlement.mirror}>Mirror</ExternalProofLink>
              <ExternalProofLink href={proof.security.qualificationUrl}>Security review</ExternalProofLink>
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
          <span className="font-semibold">Qualified claim:</span> {proof.claimBoundary.allowed}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-950">Reusable HAK recovery plugin</h2>
            <Badge tone="blue">6 tools</Badge>
          </div>
          <p className="mt-2 leading-5 text-slate-600">
            The existing four non-custodial authority/settlement tools are reused unchanged. Two additive read-only tools let an agent inspect one booking and independently verify one settlement from public Mirror state.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-slate-700">
            {[...proof.hakSurface.existingExecutionTools, ...proof.hakSurface.additiveReviewerTools].map((method) => (
              <li key={method} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono break-all">{method}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-950">Agent interoperability</h2>
            <Badge tone="amber">Safe staged activation</Badge>
          </div>
          <p className="mt-2 leading-5 text-slate-600">
            The MCP adapter follows Hedera Agent Kit’s non-custodial RETURN_BYTES architecture: per-caller account context, no server signing key and no transaction submission.
          </p>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            <span className="font-semibold">Official MCP runtime not installed yet.</span> {proof.hakSurface.mcp.reason}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
            <span className="font-semibold">Fee preview:</span> {proof.hakSurface.feePreview.reason}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">What ETHOnline added</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            {proof.continuity.ethOnlineNew.map((item) => <li key={item}>✓ {item}</li>)}
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Week-5 baseline — not claimed as new</h2>
          <ul className="mt-3 space-y-2 text-slate-600">
            {proof.continuity.preEventBaselineNotNew.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </article>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Claim boundary</h2>
        <p className="mt-2 text-slate-600">This cockpit deliberately keeps the strongest statement narrow. It does not claim:</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {proof.claimBoundary.notAllowed.map((item) => (
            <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Not proven: {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-950">Machine-readable proof</h2>
            <p className="mt-1 text-slate-600">The reviewer cockpit and JSON endpoint use the same immutable evidence bundle.</p>
          </div>
          <a href="/api/agent/ethonline-recovery-proof" className={cn(getButtonClassName("secondary"), "inline-flex no-underline")}>Open JSON proof</a>
        </div>
      </section>
    </div>
  );
}
