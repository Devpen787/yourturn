"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type XcStep =
  | "providerPolicy"
  | "providerBlocked"
  | "bobFind"
  | "bobEligibility"
  | "bobEligibilityFailed"
  | "bobTaken"
  | "paymentPending"
  | "paymentError"
  | "opportunityReady"
  | "reconciling"
  | "partialUnknown"
  | "bobSuccess"
  | "providerFinal";

type ProofKind = "provider" | "acquirer" | "handoff";

const booking = {
  title: "Friday Yoga",
  time: "18:00",
  date: "Friday, 11 September",
  venue: "Studio A",
  location: "Zürich",
  originalPrice: "52 CHF",
  recoveryPrice: "45 USDC",
  transferCutoff: "Friday · 17:30",
};

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-slate-950 text-white hover:bg-slate-800`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`;
const quietButton =
  "inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

function initialXcStep(view: string | null): XcStep {
  const map: Record<string, XcStep> = {
    "xc-provider-policy": "providerPolicy",
    "xc-provider-blocked": "providerBlocked",
    "xc-find": "bobFind",
    "xc-eligibility": "bobEligibility",
    "xc-eligibility-failed": "bobEligibilityFailed",
    "xc-taken": "bobTaken",
    "xc-payment-pending": "paymentPending",
    "xc-payment-error": "paymentError",
    "xc-opportunity": "opportunityReady",
    "xc-reconciling": "reconciling",
    "xc-partial": "partialUnknown",
    "xc-bob-success": "bobSuccess",
    "xc-provider-final": "providerFinal",
  };
  return view && map[view] ? map[view] : "bobFind";
}

function StatusPill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "rose" | "blue";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    rose: "bg-rose-50 text-rose-800 ring-rose-100",
    blue: "bg-sky-50 text-sky-800 ring-sky-100",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StepFrame({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl py-4 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{intro}</p> : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function BookingIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{booking.date}</p>
      <h2 className={compact ? "text-xl font-semibold text-slate-950" : "text-2xl font-semibold tracking-tight text-slate-950"}>
        {booking.title} · {booking.time}
      </h2>
      <p className="text-sm text-slate-600">{booking.venue} · {booking.location}</p>
    </div>
  );
}

function ProofDrawer({ kind }: { kind: ProofKind }) {
  const copy: Record<ProofKind, { title: string; body: string }> = {
    provider: {
      title: "Provider-rule integration seam",
      body:
        "This XC-01 provider state is product evidence. Integration must replace the fixture with Studio A's authoritative reusable recovery/transfer policy and revalidate it at the final transfer boundary.",
    },
    acquirer: {
      title: "Eligibility and payment integration seam",
      body:
        "Bob's eligibility and 45 USDC commitment are fixture states here. Integration must bind both to the same Friday Yoga booking and fail closed if either is stale, missing, or no longer valid.",
    },
    handoff: {
      title: "Cross-holder reconciliation seam",
      body:
        "Final Maya, Bob, and Studio A states remain fixture product evidence until the real booking transfer, 45 USDC settlement, and authoritative holder reads reconcile to one execution.",
    },
  };
  const item = copy[kind];

  return (
    <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900">
        View technical proof
      </summary>
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="amber">FIXTURE</StatusPill>
          <p className="text-sm font-semibold text-slate-950">{item.title}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          No LIVE sponsor execution is claimed by this Product Workbench state.
        </p>
      </div>
    </details>
  );
}

function ProviderRules({ blocked = false }: { blocked?: boolean }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BookingIdentity compact />
        <StatusPill tone={blocked ? "rose" : "green"}>{blocked ? "Recovery blocked" : "Recovery allowed"}</StatusPill>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Transfer / recovery</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-950">{blocked ? "Not allowed" : "Allowed"}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Transfer cutoff</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-950">{booking.transferCutoff}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Eligibility</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-950">Eligible Studio A customer · no duplicate session booking</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cancellation</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-950">Not allowed through recovery</dd>
        </div>
      </dl>
      <div className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950 ring-1 ring-sky-100">
        <strong>Staff approval:</strong> none for an individual handoff when the provider rules, holder recovery rules, and next-customer eligibility/payment all pass.
      </div>
    </div>
  );
}

export default function Xc01Client() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<XcStep>(initialXcStep(searchParams.get("view")));
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="pb-16">
      {step === "providerPolicy" && (
        <StepFrame
          eyebrow="Studio A · Booking rules"
          title="Friday Yoga can recover without a staff approval queue."
          intro="Studio A sets the reusable rules before a recovery starts. YourTurn can only complete a handoff while every rule still passes."
        >
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <ProviderRules />
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">How it works</p>
              <h2 className="mt-3 text-xl font-semibold">Rules are checked again before the booking moves.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                If Studio A changes the transfer policy before completion, the recovery stops instead of using an old permission snapshot.
              </p>
            </aside>
          </div>
          <ProofDrawer kind="provider" />
        </StepFrame>
      )}

      {step === "providerBlocked" && (
        <StepFrame
          eyebrow="Studio A · Rule changed"
          title="Recovery stopped before the handoff."
          intro="Studio A changed Friday Yoga to no transfers before completion. The holder's recovery authorization cannot override that provider rule."
        >
          <ProviderRules blocked />
          <div className="mt-5 rounded-[1.75rem] border border-rose-100 bg-rose-50 p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Failed closed</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">No booking moved. Bob was not charged.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  A later policy change invalidated the handoff before transfer. The recovery can only resume after the current provider rules permit it again.
                </p>
              </div>
              <StatusPill tone="rose">Blocked</StatusPill>
            </div>
          </div>
          <button type="button" onClick={() => setStep("providerPolicy")} className={`${secondaryButton} mt-5`}>
            Back to Friday Yoga rules
          </button>
          <ProofDrawer kind="provider" />
        </StepFrame>
      )}

      {step === "bobFind" && (
        <StepFrame
          eyebrow="Find a spot"
          title="A spot opened for Friday Yoga."
          intro="A confirmed booking became available under Studio A's transfer rules. Review the session and your eligibility before committing."
        >
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setStep("bobEligibility");
            }}
            className="group w-full rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <BookingIdentity />
              <StatusPill tone="blue">Available</StatusPill>
            </div>
            <div className="mt-7 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Your commitment</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{booking.recoveryPrice}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Transfer closes</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">17:30</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Booking status</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">Confirmed after handoff</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-slate-500">Studio A conditions apply</span>
              <span className="text-sm font-semibold text-slate-950 group-hover:translate-x-0.5">View Friday Yoga →</span>
            </div>
          </button>
          {notice ? <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
        </StepFrame>
      )}

      {step === "bobTaken" && (
        <StepFrame
          eyebrow="Find a spot"
          title="This Friday Yoga spot is no longer available."
          intro="Another eligible customer completed the handoff first. You have not paid for this booking."
        >
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill>Already taken</StatusPill>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              Availability is checked again before any payment commitment can create a handoff opportunity.
            </p>
          </div>
          <button type="button" onClick={() => setStep("bobFind")} className={`${primaryButton} mt-5`}>
            Find another spot
          </button>
          <ProofDrawer kind="acquirer" />
        </StepFrame>
      )}

      {step === "bobEligibility" && (
        <StepFrame
          eyebrow="Friday Yoga"
          title="This booking is available to you."
          intro="You meet Studio A's customer conditions for this session. The booking only becomes yours after your 45 USDC commitment and the final handoff both complete."
        >
          <button type="button" onClick={() => setStep("bobFind")} className={quietButton}>← Back</button>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="green">Eligible</StatusPill>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Commitment</dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-950">45 USDC</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Transfer cutoff</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{booking.transferCutoff}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Customer condition</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Eligible Studio A account</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Duplicate booking</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">None for this session</dd>
                </div>
              </dl>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Before you commit</p>
              <h2 className="mt-3 text-xl font-semibold">45 USDC creates the recovery opportunity.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                YourTurn still rechecks availability, Studio A's rules, and the final holder state before showing Friday Yoga as yours.
              </p>
              <button type="button" onClick={() => setStep("paymentPending")} className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                Commit 45 USDC
              </button>
            </aside>
          </div>
          <ProofDrawer kind="acquirer" />
        </StepFrame>
      )}

      {step === "bobEligibilityFailed" && (
        <StepFrame
          eyebrow="Friday Yoga"
          title="This account is not eligible for the booking."
          intro="Studio A allows one active booking per customer for this session, and this account already has Friday Yoga at 18:00."
        >
          <div className="rounded-[1.75rem] border border-rose-100 bg-rose-50 p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill tone="rose">Not eligible</StatusPill>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-700">
              No payment commitment was created and the existing booking holder is unchanged.
            </p>
          </div>
          <button type="button" onClick={() => setStep("bobFind")} className={`${primaryButton} mt-5`}>
            Back to available spots
          </button>
          <ProofDrawer kind="acquirer" />
        </StepFrame>
      )}

      {step === "paymentPending" && (
        <StepFrame
          eyebrow="Confirming payment"
          title="Confirming your 45 USDC commitment."
          intro="Friday Yoga is not yours yet. YourTurn will not move the booking until your payment commitment and Studio A eligibility are both confirmed."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="amber">Payment pending</StatusPill>
              </div>
              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Commitment</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">45 USDC</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">No confirmed booking transfer is shown while this result is pending.</p>
              </div>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Waiting</p>
              <h2 className="mt-3 text-xl font-semibold">Nothing has moved yet.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Check the payment result before YourTurn creates an opportunity for the existing recovery.
              </p>
              <button type="button" onClick={() => setStep("opportunityReady")} className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                Check payment status
              </button>
            </aside>
          </div>
          <ProofDrawer kind="acquirer" />
        </StepFrame>
      )}

      {step === "paymentError" && (
        <StepFrame
          eyebrow="Payment not confirmed"
          title="We couldn't confirm the 45 USDC payment."
          intro="No booking moved and no payment was treated as complete. Friday Yoga remains with its current holder."
        >
          <div className="rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill tone="rose">Needs retry</StatusPill>
            </div>
            <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-sm leading-6 text-rose-950 ring-1 ring-rose-100">
              Your eligibility is unchanged. Only the payment commitment needs to be retried or reconciled.
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep("paymentPending")} className={primaryButton}>Try payment again</button>
            <button type="button" onClick={() => setStep("bobEligibility")} className={secondaryButton}>Back to Friday Yoga</button>
          </div>
          <ProofDrawer kind="acquirer" />
        </StepFrame>
      )}

      {step === "opportunityReady" && (
        <StepFrame
          eyebrow="Payment confirmed"
          title="Your 45 USDC commitment is ready."
          intro="Friday Yoga is still not yours yet. YourTurn is checking the active recovery and Studio A's current rules before any booking transfer."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="green">45 USDC committed</StatusPill>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-emerald-600">Payment</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Confirmed for handoff</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Booking holder</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Not changed yet</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                A payment commitment alone is not a completed recovery. Provider rules and final holder state still have to reconcile.
              </p>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ready for handoff</p>
              <h2 className="mt-3 text-xl font-semibold">YourTurn can evaluate this opportunity.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Bob only sees his own booking, eligibility, payment, and resulting holder state. The current holder's private authorization ceremony stays private.
              </p>
              <button type="button" onClick={() => setStep("reconciling")} className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                Check handoff status
              </button>
            </aside>
          </div>
          <ProofDrawer kind="handoff" />
        </StepFrame>
      )}

      {step === "reconciling" && (
        <StepFrame
          eyebrow="Handoff in progress"
          title="The handoff is being confirmed."
          intro="Your 45 USDC commitment meets the current recovery terms, and Studio A's rules still permit the transfer. YourTurn is reconciling payment and booking holder before showing success."
        >
          <div className="rounded-[1.75rem] border border-sky-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill tone="blue">Checking final state</StatusPill>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-emerald-600">Provider rules</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">Current and allowed</dd>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-emerald-600">45 USDC</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">Committed</dd>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-sky-600">Holder state</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">Reconciling</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              YourTurn does not show Friday Yoga as Bob's booking until payment and the authoritative holder change agree.
            </p>
          </div>
          <button type="button" onClick={() => setStep("bobSuccess")} className={`${primaryButton} mt-5`}>
            Refresh booking
          </button>
          <ProofDrawer kind="handoff" />
        </StepFrame>
      )}

      {step === "partialUnknown" && (
        <StepFrame
          eyebrow="Still checking"
          title="We're still confirming who holds Friday Yoga."
          intro="The payment result and booking-holder state have not fully reconciled, so YourTurn will not show a completed handoff yet."
        >
          <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill tone="amber">Needs reconciliation</StatusPill>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100">
                <dt className="text-xs uppercase tracking-[0.14em] text-amber-700">45 USDC</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">Payment result available</dd>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100">
                <dt className="text-xs uppercase tracking-[0.14em] text-amber-700">Booking holder</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">Still checking</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-slate-700">
              Bob should not attempt check-in yet. Maya's completion and Studio A's current-holder view must agree before this state can become successful.
            </p>
          </div>
          <button type="button" onClick={() => setStep("reconciling")} className={`${primaryButton} mt-5`}>Check again</button>
          <ProofDrawer kind="handoff" />
        </StepFrame>
      )}

      {step === "bobSuccess" && (
        <StepFrame
          eyebrow="My bookings"
          title="Friday Yoga is now yours."
          intro="The handoff is complete and Studio A recognizes Bob as the current holder. This is now a normal confirmed booking in your account."
        >
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity />
                <StatusPill tone="green">Confirmed</StatusPill>
              </div>
              <dl className="mt-7 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Booked for</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Bob</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Paid for handoff</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">45 USDC</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Check-in</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Opens 30 min before</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Provider</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Studio A</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => setNotice("Check-in opens 30 minutes before Friday Yoga. Your booking is confirmed and ready until then.")}
                className={`${primaryButton} mt-6`}
              >
                Use booking
              </button>
              {notice ? <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What changed</p>
              <h2 className="mt-3 text-xl font-semibold">One booking, new current holder.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The service, time, venue, and provider rules stayed the same. Only the valid current holder changed to Bob after the handoff reconciled.
              </p>
            </aside>
          </div>
          <ProofDrawer kind="handoff" />
        </StepFrame>
      )}

      {step === "providerFinal" && (
        <StepFrame
          eyebrow="Studio A · Friday Yoga"
          title="Bob is now the current holder."
          intro="The recovery satisfied Studio A's pre-defined rules, so the provider view updates to the new holder without an individual staff approval step."
        >
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="green">Confirmed</StatusPill>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Current holder</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950">Bob</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Previous holder</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Maya Keller</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Fulfilment</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">Check-in opens 17:30</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Staff action</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">No manual approval required</dd>
                </div>
              </dl>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Provider outcome</p>
              <h2 className="mt-3 text-xl font-semibold">Friday Yoga remains a valid booking.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Studio A can fulfil the same session for Bob under the rules it set before the recovery. No private holder authorization details are needed in the provider view.
              </p>
            </aside>
          </div>
          <ProofDrawer kind="handoff" />
        </StepFrame>
      )}
    </div>
  );
}
