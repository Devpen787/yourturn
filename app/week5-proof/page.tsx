import Link from "next/link";
import { buildWeek5PolicyProof } from "@/lib/hedera-agent-kit/week5-proof";
import { cn } from "@/lib/cn";
import { getButtonClassName } from "@/components/ui/button-classes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Week 5 Policy Agent Proof",
  robots: {
    index: false,
    follow: false,
  },
};

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function statusClass(status: string) {
  if (status === "live") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function ProofStatus({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClass(status))}>
      {status}
    </span>
  );
}

function TxLink({ href, txId }: { href: string | null; txId?: string }) {
  if (!txId) return <span className="text-slate-500">Not configured</span>;
  if (!href) return <span>{txId}</span>;
  return (
    <a className="font-medium text-sky-700 underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
      {txId}
    </a>
  );
}

export default async function Week5ProofPage() {
  const proof = await buildWeek5PolicyProof(baseUrl());
  const cards = [
    {
      title: "HBAR x402 settlement",
      status: proof.proof.hbarX402Settlement.status,
      detail: "Paid recovery-policy quote settled through Hedera x402 exact.",
      txId: proof.proof.hbarX402Settlement.txId,
      href: proof.proof.hbarX402Settlement.hashscanUrl,
    },
    {
      title: "USDC x402 settlement",
      status: proof.proof.usdcX402Settlement.status,
      detail: `HTS USDC ${proof.proof.usdcX402Settlement.tokenId} settled through Hedera x402 exact.`,
      txId: proof.proof.usdcX402Settlement.txId,
      href: proof.proof.usdcX402Settlement.hashscanUrl,
    },
    {
      title: "Wallet-funded USDC allowance",
      status: proof.proof.usdcAllowance.status,
      detail: `${proof.proof.usdcAllowance.amountUsdc} USDC allowance from ${proof.proof.usdcAllowance.ownerAccountId} to ${proof.proof.usdcAllowance.spenderAccountId}.`,
      txId: proof.proof.usdcAllowance.txId,
      href: proof.proof.usdcAllowance.hashscanUrl,
    },
  ];

  return (
    <div className="max-w-5xl text-sm">
      <Link
        href="/"
        className={cn(getButtonClassName("textLink"), "inline-flex min-h-[44px] items-center")}
      >
        ← Back to home
      </Link>

      <div className="mt-4 border-b border-slate-200 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Hedera AI Bounty Week 5
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Policy Agent Proof
        </h1>
        <p className="mt-2 max-w-3xl leading-6 text-slate-600">
          This page is the no-terminal version of the verifier. It shows the
          Agent Kit policy hooks, bounded USDC allowance, and HBAR/USDC x402
          settlement proofs used by YourTurn Concierge.
        </p>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{card.title}</h2>
              <ProofStatus status={card.status} />
            </div>
            <p className="mt-2 min-h-[44px] leading-5 text-slate-600">{card.detail}</p>
            <p className="mt-4 break-words text-xs text-slate-700">
              <TxLink href={card.href} txId={card.txId} />
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">Runtime Policy Surface</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {proof.runtime.hakPolicies.map((policy) => (
            <div key={policy.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{policy.name}</p>
              <p className="mt-1 text-slate-600">{policy.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                Tools: {policy.relevantTools.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">What This Proves</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {proof.policyControls.map((control) => (
            <div key={control.label} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{control.label}</p>
              <p className="mt-1 leading-5 text-slate-600">{control.evidence}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">Agent Kit Tool Discovery</h2>
          <ProofStatus status={proof.runtime.hasYourTurnPlugin ? "live" : "missing"} />
        </div>
        <ul className="mt-3 grid gap-2 text-xs text-slate-700 md:grid-cols-2">
          {proof.runtime.toolMethods.map((method) => (
            <li key={method} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
              {method}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">Raw Proof API</h2>
        <p className="mt-2 text-slate-600">
          Reviewers can also inspect the machine-readable proof bundle.
        </p>
        <a
          href="/api/agent/week5-proof"
          className={cn(getButtonClassName("secondary"), "mt-3 inline-flex no-underline")}
        >
          Open JSON proof
        </a>
      </section>
    </div>
  );
}
