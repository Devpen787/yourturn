"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Step =
  | "enter"
  | "bookings"
  | "detail"
  | "plans"
  | "setup"
  | "approval"
  | "ledgerNotReady"
  | "ledgerWaiting"
  | "ledgerRejected"
  | "ledgerCancelled"
  | "ledgerApproved"
  | "recoveryActive"
  | "offerBlocked"
  | "reauthorize"
  | "offerAllowed"
  | "recoverySuccess";

type ProofStage = "ledger" | "agent" | "blocked" | "success";

const booking = {
  title: "Friday Yoga",
  time: "18:00",
  date: "Friday, 11 September",
  venue: "Studio A",
  location: "Zürich",
  price: "52 CHF",
};

const secondaryBookings = [
  {
    title: "Reformer Pilates",
    time: "Tuesday · 07:30",
    venue: "Form Studio · Zürich",
    status: "Confirmed",
  },
  {
    title: "Focus Desk",
    time: "18 September · All day",
    venue: "Northspace · Zürich",
    status: "Confirmed",
  },
];

// UX-only integration fixtures. Sponsor-backed actions replace these state transitions later.
// The branch heads are recorded so the integration seams stay anchored to real workstream truth.
const fixtureEvidence = {
  ledger: {
    head: "1d50b01c",
    summary:
      "Ledger DMK EIP-712 Recovery Mandate: approval requires typed-data interaction, an exclusive Completed terminal state, and a signature; reject/cancel persist no signature.",
  },
  world: {
    head: "2ab04f44",
    summary:
      "World AgentKit / AgentBook seam: public human-backed-agent trust signal, exact delegated-agent match, and no raw human identifier in product output.",
  },
  hedera: {
    head: "12c591af",
    summary:
      "Hedera atomic-recovery seam: exact booking transfer plus exact HTS USDC settlement, with byte-level scope validation before signing.",
  },
} as const;

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-slate-950 text-white hover:bg-slate-800`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`;
const quietButton =
  "inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={quietButton}>
      ← Back
    </button>
  );
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
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function BookingIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {booking.date}
      </p>
      <h2
        className={
          compact
            ? "text-xl font-semibold text-slate-950"
            : "text-2xl font-semibold tracking-tight text-slate-950"
        }
      >
        {booking.title} · {booking.time}
      </h2>
      <p className="text-sm text-slate-600">
        {booking.venue} · {booking.location}
      </p>
    </div>
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      {intro ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{intro}</p>
      ) : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function MandateFacts({ minimum }: { minimum: number }) {
  return (
    <dl className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Minimum</dt>
        <dd className="mt-1 font-semibold text-slate-950">{minimum} USDC</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Expires</dt>
        <dd className="mt-1 font-semibold text-slate-950">Tomorrow · 17:00</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Cancellation</dt>
        <dd className="mt-1 font-semibold text-slate-950">Not allowed</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Scope</dt>
        <dd className="mt-1 font-semibold text-slate-950">Friday Yoga only</dd>
      </div>
    </dl>
  );
}

function ProofDrawer({ stage }: { stage: ProofStage }) {
  const stageCopy: Record<ProofStage, { title: string; body: string }> = {
    ledger: {
      title: "Ledger authorization seam",
      body: fixtureEvidence.ledger.summary,
    },
    agent: {
      title: "Delegated-agent verification seam",
      body: fixtureEvidence.world.summary,
    },
    blocked: {
      title: "Policy decision seam",
      body:
        "This candidate models 32 USDC as below the active minimum. Integration must prove no booking transfer and no settlement occurred for the blocked offer.",
    },
    success: {
      title: "Recovery settlement seam",
      body: fixtureEvidence.hedera.summary,
    },
  };

  const evidence = stageCopy[stage];
  return (
    <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900">
        View technical proof
      </summary>
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="amber">FIXTURE</StatusPill>
          <p className="text-sm font-semibold text-slate-950">{evidence.title}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{evidence.body}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          This workbench state is intentionally non-LIVE until the sponsor implementation is wired. It
          exists to lock the product contract and proof slot without inventing production evidence.
        </p>
      </div>
    </details>
  );
}

function AgentCard({ minimum }: { minimum: number }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Recovery agent
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Exact delegated agent verified</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            YourTurn verified that the agent working on this recovery is the exact one covered by your
            authorization and is backed by a verified human.
          </p>
        </div>
        <StatusPill tone="green">Human-backed</StatusPill>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">May accept</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{minimum} USDC or more</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">May touch</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">Friday Yoga only</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Cannot</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">Cancel or widen limits</p>
        </div>
      </div>
    </div>
  );
}

function initialStep(view: string | null): Step {
  const map: Record<string, Step> = {
    bookings: "bookings",
    "ledger-not-ready": "ledgerNotReady",
    "ledger-waiting": "ledgerWaiting",
    "ledger-rejected": "ledgerRejected",
    "ledger-cancelled": "ledgerCancelled",
    "ledger-approved": "ledgerApproved",
    "recovery-active": "recoveryActive",
    "offer-blocked": "offerBlocked",
    reauthorize: "reauthorize",
    "offer-allowed": "offerAllowed",
    "recovery-success": "recoverySuccess",
  };
  return view && map[view] ? map[view] : "enter";
}

export default function ProductPreviewPage() {
  const searchParams = useSearchParams();
  const startingStep = initialStep(searchParams.get("view"));
  const [step, setStep] = useState<Step>(startingStep);
  const [confirmedScope, setConfirmedScope] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeMinimum, setActiveMinimum] = useState(40);
  const [approvalMinimum, setApprovalMinimum] = useState(
    searchParams.get("view") === "reauthorize" ? 30 : 40
  );
  const [offerAmount, setOfferAmount] = useState(
    searchParams.get("view") === "offer-allowed" ||
      searchParams.get("view") === "recovery-success"
      ? 45
      : 32
  );
  const [recovered, setRecovered] = useState(startingStep === "recoverySuccess");
  const [recoveredAmount, setRecoveredAmount] = useState(
    startingStep === "recoverySuccess" ? 45 : 0
  );

  function chooseUnavailable(label: string) {
    setNotice(`${label} isn’t available for Friday Yoga right now.`);
  }

  function showLatestOffer() {
    setOfferAmount(32);
    setStep(activeMinimum <= 32 ? "offerAllowed" : "offerBlocked");
  }

  function approveCurrentMandate() {
    setActiveMinimum(approvalMinimum);
    setStep("ledgerApproved");
  }

  function completeRecovery() {
    setRecovered(true);
    setRecoveredAmount(offerAmount);
    setStep("recoverySuccess");
  }

  return (
    <div className="pb-16">
      {step === "enter" && (
        <StepFrame
          eyebrow="YourTurn"
          title="Your bookings should stay useful when plans change."
          intro="Keep every reservation in one place, use it normally, or recover value when you can no longer make it."
        >
          <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-slate-950 p-7 text-white sm:p-9">
              <p className="text-sm font-medium text-slate-300">Your next booking</p>
              <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  This Friday
                </p>
                <p className="mt-3 text-2xl font-semibold">Friday Yoga · 18:00</p>
                <p className="mt-2 text-sm text-slate-300">Studio A · Zürich</p>
                <div className="mt-5 inline-flex rounded-full bg-emerald-300/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-200/20">
                  Confirmed
                </div>
              </div>
              <p className="mt-6 max-w-md text-sm leading-6 text-slate-300">
                If you cannot go, YourTurn can help find a valid next outcome without giving it open-ended control over your account.
              </p>
            </div>

            <div className="p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Welcome back
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Maya Keller
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Continue with the prepared customer account to manage Friday Yoga.
              </p>
              <button
                type="button"
                onClick={() => setStep("bookings")}
                className={`${primaryButton} mt-7 w-full`}
              >
                Open my bookings
              </button>
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Demo account · no recovery action starts until you approve its limits.
              </p>
            </div>
          </div>
        </StepFrame>
      )}

      {step === "bookings" && (
        <StepFrame
          eyebrow="My bookings"
          title="Good evening, Maya."
          intro="Everything you have coming up — ready to use, change, or pass on when the rules allow it."
        >
          {!recovered ? (
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <button
                type="button"
                onClick={() => setStep("detail")}
                className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <BookingIdentity />
                  <StatusPill tone="green">Confirmed</StatusPill>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="text-sm text-slate-500">Your next booking</span>
                  <span className="text-sm font-semibold text-slate-950 group-hover:translate-x-0.5">
                    View booking →
                  </span>
                </div>
              </button>

              <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Plans changed?
                </p>
                <h2 className="mt-3 text-xl font-semibold">Keep the booking useful.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Open a booking to see the options available for that specific spot.
                </p>
              </aside>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Recently recovered
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">Friday Yoga</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      This booking has been transferred and is no longer available for your check-in.
                    </p>
                  </div>
                  <StatusPill tone="green">Recovered {recoveredAmount || 45} USDC</StatusPill>
                </div>
              </div>
              <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Recovery complete
                </p>
                <h2 className="mt-3 text-xl font-semibold">The booking moved on.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Your other bookings are unchanged.
                </p>
              </aside>
            </div>
          )}

          <div className="mt-7">
            <h2 className="text-sm font-semibold text-slate-900">Later</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {secondaryBookings.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.time}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.venue}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </StepFrame>
      )}

      {step === "detail" && (
        <StepFrame eyebrow="Booking" title="Friday Yoga">
          <BackButton onClick={() => setStep("bookings")} />
          <div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-7 sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <BookingIdentity />
                  <StatusPill tone="green">Confirmed</StatusPill>
                </div>
                <dl className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Booked for
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">Maya Keller</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Original price
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">{booking.price}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Check-in
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">Opens 30 min before</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Changes
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">Allowed under studio rules</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col justify-between bg-slate-50 p-7 sm:p-9">
                <div>
                  <p className="text-sm font-semibold text-slate-950">What do you want to do?</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your booking stays confirmed unless you choose a change-plans option.
                  </p>
                </div>
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNotice("Your booking stays confirmed and ready for check-in.")
                    }
                    className={`${secondaryButton} w-full`}
                  >
                    Use booking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      setStep("plans");
                    }}
                    className={`${primaryButton} w-full`}
                  >
                    Change plans
                  </button>
                </div>
              </div>
            </div>
          </div>
          {notice ? (
            <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p>
          ) : null}
        </StepFrame>
      )}

      {step === "plans" && (
        <StepFrame
          eyebrow="Change plans"
          title="What would help most?"
          intro="These options apply only to Friday Yoga. Nothing else in your account changes."
        >
          <BackButton
            onClick={() => {
              setNotice(null);
              setStep("detail");
            }}
          />
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <BookingIdentity compact />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Find someone to take it", "Offer the spot to another eligible customer."],
              ["Swap for another time", "Look for another session that fits your schedule."],
              ["Get whatever refund is available", "Check the studio's current refund rules."],
            ].map(([label, description]) => (
              <button
                key={label}
                type="button"
                onClick={() => chooseUnavailable(label)}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                <h2 className="font-semibold text-slate-950">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setStep("setup");
              }}
              className="rounded-[1.5rem] border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Let YourTurn handle it</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Set your limits once. YourTurn can look for a recovery that stays inside them and come back to you if anything needs more permission.
                  </p>
                </div>
                <span className="text-xl" aria-hidden="true">
                  →
                </span>
              </div>
            </button>
          </div>
          {notice ? (
            <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p>
          ) : null}
        </StepFrame>
      )}

      {step === "setup" && (
        <StepFrame
          eyebrow="Assisted recovery"
          title="Set the limits. YourTurn stays inside them."
          intro="You are authorizing recovery for this booking only. Anything outside these limits has to come back to you."
        >
          <BackButton onClick={() => setStep("plans")} />
          <div className="mt-4 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Only this booking
              </p>
              <div className="mt-4">
                <p className="text-2xl font-semibold">{booking.title} · {booking.time}</p>
                <p className="mt-2 text-sm text-slate-300">{booking.date}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {booking.venue} · {booking.location}
                </p>
              </div>
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">No account-wide permission</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Your other bookings, profile, and payment settings are outside this authorization.
                </p>
              </div>
            </aside>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-900" htmlFor="minimum">
                    Minimum recovery
                  </label>
                  <div className="mt-2 flex min-h-[52px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                    <input
                      id="minimum"
                      value="40"
                      readOnly
                      className="w-full bg-transparent text-xl font-semibold text-slate-950 outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-500">USDC</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Offers below 40 are rejected automatically.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Expires</p>
                  <div className="mt-2 flex min-h-[52px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950">
                    Tomorrow · 17:00
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    After that, YourTurn must ask you again.
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6">
                <h2 className="text-sm font-semibold text-slate-950">YourTurn may</h2>
                <ul className="mt-3 space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>Accept an eligible offer of 40 USDC or more.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>Transfer this Friday Yoga booking after the recovery is secured.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>Keep you updated as the recovery progresses.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
                <h2 className="text-sm font-semibold text-rose-950">YourTurn may not</h2>
                <ul className="mt-2 space-y-2 text-sm text-rose-900/80">
                  <li>Cancel this booking.</li>
                  <li>Accept less than 40 USDC.</li>
                  <li>Change these limits or touch another booking.</li>
                </ul>
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={confirmedScope}
                  onChange={(event) => setConfirmedScope(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm leading-6 text-slate-700">
                  I understand these limits apply only to Friday Yoga and that anything outside them needs my approval again.
                </span>
              </label>

              <button
                type="button"
                disabled={!confirmedScope}
                onClick={() => {
                  setApprovalMinimum(40);
                  setStep("approval");
                }}
                className={`${primaryButton} mt-6 w-full disabled:cursor-not-allowed disabled:bg-slate-300`}
              >
                Continue to secure approval
              </button>
            </div>
          </div>
        </StepFrame>
      )}

      {step === "approval" && (
        <StepFrame
          eyebrow="Ready to authorize"
          title="One last check before YourTurn can act."
          intro="Approve exactly these limits on your secure device. Until you do, Friday Yoga remains confirmed and nothing can be recovered or transferred."
        >
          <BackButton onClick={() => setStep("setup")} />
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="amber">Not authorized yet</StatusPill>
              </div>
              <div className="mt-6">
                <MandateFacts minimum={40} />
              </div>
            </div>

            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl"
                aria-hidden="true"
              >
                ✓
              </div>
              <h2 className="mt-5 text-xl font-semibold">Confirm on your secure device.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Only the limits shown here can be authorized. Your booking remains confirmed until approval succeeds.
              </p>
              <button
                type="button"
                onClick={() => {
                  setApprovalMinimum(40);
                  setStep("ledgerNotReady");
                }}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Approve on secure device
              </button>
            </aside>
          </div>
        </StepFrame>
      )}

      {step === "ledgerNotReady" && (
        <StepFrame
          eyebrow="Secure approval"
          title="Connect your Ledger to authorize recovery."
          intro={`YourTurn will ask the device to approve only the ${approvalMinimum} USDC minimum Recovery Mandate shown here. No recovery authority exists yet.`}
        >
          <BackButton
            onClick={() => setStep(approvalMinimum === activeMinimum ? "approval" : "reauthorize")}
          />
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="amber">Needs your approval</StatusPill>
              </div>
              <div className="mt-6">
                <MandateFacts minimum={approvalMinimum} />
              </div>
              {approvalMinimum !== activeMinimum ? (
                <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
                  Your current {activeMinimum} USDC authority stays active unless this replacement is approved.
                </p>
              ) : null}
            </div>

            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl">
                ◇
              </div>
              <h2 className="mt-5 text-xl font-semibold">Ledger not connected.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Connect your secure device, unlock it, and keep it with you while you review the mandate.
              </p>
              <button
                type="button"
                onClick={() => setStep("ledgerWaiting")}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Connect Ledger
              </button>
              {approvalMinimum !== activeMinimum ? (
                <button
                  type="button"
                  onClick={() => {
                    setApprovalMinimum(activeMinimum);
                    setStep("offerBlocked");
                  }}
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Keep current {activeMinimum} USDC rule
                </button>
              ) : null}
            </aside>
          </div>
          <ProofDrawer stage="ledger" />
        </StepFrame>
      )}

      {step === "ledgerWaiting" && (
        <StepFrame
          eyebrow="Secure approval"
          title="Check the mandate on your Ledger."
          intro="YourTurn is waiting for the secure-device result. Approving creates only the booking-scoped mandate below; rejecting or cancelling creates no authority."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="amber">Waiting for Ledger</StatusPill>
              </div>
              <div className="mt-6">
                <MandateFacts minimum={approvalMinimum} />
              </div>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl">
                …
              </div>
              <h2 className="mt-5 text-xl font-semibold">Waiting for your Ledger.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Review the Recovery Mandate on the device. YourTurn cannot treat silence, rejection, or cancellation as approval.
              </p>
              <button
                type="button"
                onClick={approveCurrentMandate}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Check approval status
              </button>
              <button
                type="button"
                onClick={() => setStep("ledgerCancelled")}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel approval
              </button>
            </aside>
          </div>
          <ProofDrawer stage="ledger" />
        </StepFrame>
      )}

      {step === "ledgerRejected" && (
        <StepFrame
          eyebrow="Secure approval"
          title="Approval was rejected on your Ledger."
          intro="Nothing changed. Friday Yoga is still yours, no recovery authority was created, and YourTurn cannot start working."
        >
          <div className="rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill tone="rose">Not authorized</StatusPill>
            </div>
            <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-900 ring-1 ring-rose-100">
              Device rejection means no mandate signature and no recovery authority. Your booking remains confirmed.
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setStep("ledgerNotReady")} className={primaryButton}>
                Try again
              </button>
              <button type="button" onClick={() => setStep("detail")} className={secondaryButton}>
                Back to booking
              </button>
            </div>
          </div>
          <ProofDrawer stage="ledger" />
        </StepFrame>
      )}

      {step === "ledgerCancelled" && (
        <StepFrame
          eyebrow="Secure approval"
          title="Approval cancelled."
          intro="No mandate was created. Friday Yoga is still confirmed and YourTurn has no recovery authority."
        >
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <BookingIdentity compact />
              <StatusPill>Not authorized</StatusPill>
            </div>
            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Cancelling the device ceremony is terminal for this attempt. It does not silently approve or preserve a partial mandate.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setStep("ledgerNotReady")} className={primaryButton}>
                Try again
              </button>
              <button type="button" onClick={() => setStep("detail")} className={secondaryButton}>
                Back to booking
              </button>
            </div>
          </div>
          <ProofDrawer stage="ledger" />
        </StepFrame>
      )}

      {step === "ledgerApproved" && (
        <StepFrame
          eyebrow="Recovery authorized"
          title="Approved on your Ledger."
          intro={`YourTurn can now work on Friday Yoga inside the ${activeMinimum} USDC minimum, expiry, and no-cancellation rules you approved.`}
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="green">Authorized</StatusPill>
              </div>
              <div className="mt-6">
                <MandateFacts minimum={activeMinimum} />
              </div>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-300/15 text-xl text-emerald-100">
                ✓
              </div>
              <h2 className="mt-5 text-xl font-semibold">The mandate is ready.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                YourTurn still cannot cancel this booking, lower your minimum, or touch another booking.
              </p>
              <button
                type="button"
                onClick={() => setStep("recoveryActive")}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                View active recovery
              </button>
            </aside>
          </div>
          <ProofDrawer stage="ledger" />
        </StepFrame>
      )}

      {step === "recoveryActive" && (
        <StepFrame
          eyebrow="Recovery active"
          title="YourTurn is looking for the right recovery."
          intro={`It can accept an eligible offer of ${activeMinimum} USDC or more. Anything below your active rule is rejected automatically.`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <BookingIdentity compact />
            <StatusPill tone="blue">Recovery active</StatusPill>
          </div>
          <div className="mt-5">
            <AgentCard minimum={activeMinimum} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={showLatestOffer} className={primaryButton}>
              See latest offer
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice("Recovery stopped. Friday Yoga remains yours and no further offers will be accepted.");
                setStep("detail");
              }}
              className={secondaryButton}
            >
              Stop recovery
            </button>
          </div>
          <ProofDrawer stage="agent" />
        </StepFrame>
      )}

      {step === "offerBlocked" && (
        <StepFrame
          eyebrow="Offer blocked"
          title="32 USDC was not accepted."
          intro={`It is below your ${activeMinimum} USDC minimum, so YourTurn kept the booking and continued recovery without interrupting you.`}
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="rose">Offer blocked</StatusPill>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Offer</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">32 USDC</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Your minimum</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{activeMinimum} USDC</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-rose-500">Result</p>
                  <p className="mt-1 text-sm font-semibold text-rose-900">Not accepted</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Friday Yoga stays yours. No booking transfer. No settlement. No new approval needed just because a bad offer appeared.
              </p>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Your rule held
              </p>
              <h2 className="mt-3 text-xl font-semibold">YourTurn keeps looking.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                You only need to come back if you want to change the authority itself.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOfferAmount(45);
                  setStep("offerAllowed");
                }}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Keep looking
              </button>
              <button
                type="button"
                onClick={() => setStep("reauthorize")}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Lower my minimum
              </button>
            </aside>
          </div>
          <ProofDrawer stage="blocked" />
        </StepFrame>
      )}

      {step === "reauthorize" && (
        <StepFrame
          eyebrow="Needs your approval"
          title="Lowering your minimum needs a new authorization."
          intro={`Your current ${activeMinimum} USDC authority stays unchanged unless you approve a replacement on your Ledger.`}
        >
          <BackButton onClick={() => setStep("offerBlocked")} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Current authority
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{activeMinimum} USDC</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Still active. Nothing has been widened or overwritten.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Proposed replacement
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">30 USDC</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Needs a new secure-device approval before it can take effect.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setApprovalMinimum(30);
                setStep("ledgerNotReady");
              }}
              className={primaryButton}
            >
              Review 30 USDC authorization
            </button>
            <button type="button" onClick={() => setStep("offerBlocked")} className={secondaryButton}>
              Keep 40 USDC minimum
            </button>
          </div>
        </StepFrame>
      )}

      {step === "offerAllowed" && (
        <StepFrame
          eyebrow="Offer in scope"
          title={`${offerAmount} USDC is within your limits.`}
          intro={`The offer meets your ${activeMinimum} USDC minimum. YourTurn can complete this recovery without asking you again because it is inside the mandate you approved.`}
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill tone="green">Within your limits</StatusPill>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-emerald-600">Offer</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{offerAmount} USDC</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Minimum</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{activeMinimum} USDC</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Approval</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">No new prompt</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                YourTurn is completing the booking transfer and settlement as one bounded recovery outcome.
              </p>
            </div>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Completing recovery
              </p>
              <h2 className="mt-3 text-xl font-semibold">No extra permission needed.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The offer is already inside the authority you approved. You can simply check the result.
              </p>
              <button
                type="button"
                onClick={completeRecovery}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Refresh recovery status
              </button>
            </aside>
          </div>
          <ProofDrawer stage="success" />
        </StepFrame>
      )}

      {step === "recoverySuccess" && (
        <StepFrame
          eyebrow="Recovery complete"
          title={`You recovered ${recoveredAmount || offerAmount || 45} USDC.`}
          intro="Friday Yoga has been transferred and the recovery is complete. It is no longer available as one of your usable bookings."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Recovered value
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {recoveredAmount || offerAmount || 45} USDC
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The accepted recovery was inside your approved minimum and completed without another permission request.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <BookingIdentity compact />
                <StatusPill>Transferred</StatusPill>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Friday Yoga moved to an eligible new holder. It cannot be checked in or changed from Maya’s account anymore.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setStep("bookings")} className={`${primaryButton} mt-5`}>
            Back to my bookings
          </button>
          <ProofDrawer stage="success" />
        </StepFrame>
      )}
    </div>
  );
}
