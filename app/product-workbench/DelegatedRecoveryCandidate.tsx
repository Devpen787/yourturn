"use client";

import { useMemo, useState } from "react";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

type Stage =
  | "landing"
  | "entry"
  | "bookings"
  | "detail"
  | "change"
  | "setup"
  | "authorization";

const stageOrder: Stage[] = [
  "landing",
  "entry",
  "bookings",
  "detail",
  "change",
  "setup",
  "authorization",
];

const stageLabels: Record<Stage, string> = {
  landing: "Understand",
  entry: "Enter",
  bookings: "My bookings",
  detail: "Booking",
  change: "Change plans",
  setup: "Recovery rules",
  authorization: "Approval handoff",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2";

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
      {children}
    </span>
  );
}

function BookingIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-start gap-4", compact && "gap-3")}>
      <div
        className={cn(
          "flex shrink-0 flex-col items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-950",
          compact ? "h-14 w-14" : "h-16 w-16"
        )}
        aria-hidden
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">
          Fri
        </span>
        <span className={cn("font-semibold", compact ? "text-xl" : "text-2xl")}>
          11
        </span>
      </div>
      <div className="min-w-0">
        <p className={cn("font-semibold tracking-tight text-slate-950", compact ? "text-lg" : "text-xl")}>
          Friday Yoga
        </p>
        <p className="mt-1 text-sm text-slate-600">18:00 · Studio A · Zürich</p>
        {!compact && <p className="mt-1 text-sm text-slate-500">60 min · Flow class</p>}
      </div>
    </div>
  );
}

function WorkbenchChrome({
  stage,
  children,
}: {
  stage: Stage;
  children: React.ReactNode;
}) {
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="space-y-4" data-workbench-stage={stage}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-950">
        <div>
          <span className="font-semibold">UX Workbench candidate</span>
          <span className="ml-2 text-amber-800">YT-01 → YT-04 · prototype state only</span>
        </div>
        <span className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 font-medium">
          Not live sponsor evidence
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <ol className="flex min-w-max items-center gap-2 text-xs text-slate-500" aria-label="Prototype journey progress">
          {stageOrder.map((item, index) => (
            <li key={item} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                  index < currentIndex && "border-emerald-200 bg-emerald-50 text-emerald-800",
                  index === currentIndex && "border-slate-900 bg-slate-900 text-white",
                  index > currentIndex && "border-slate-200 bg-slate-50 text-slate-400"
                )}
              >
                {index + 1}
              </span>
              <span className={cn(index === currentIndex && "font-semibold text-slate-900")}>
                {stageLabels[item]}
              </span>
              {index < stageOrder.length - 1 && <span className="mx-1 text-slate-300">→</span>}
            </li>
          ))}
        </ol>
      </div>

      {children}
    </div>
  );
}

export function DelegatedRecoveryCandidate() {
  const [stage, setStage] = useState<Stage>("landing");
  const [minimum, setMinimum] = useState(40);
  const [findBuyer, setFindBuyer] = useState(true);
  const [transferBooking, setTransferBooking] = useState(true);

  const minimumIsValid = Number.isFinite(minimum) && minimum > 0;
  const ruleSummary = useMemo(
    () => `${minimumIsValid ? minimum : 40} USDC minimum · until tomorrow 17:00 · no cancellation`,
    [minimum, minimumIsValid]
  );

  function reset() {
    setMinimum(40);
    setFindBuyer(true);
    setTransferBooking(true);
    setStage("landing");
  }

  return (
    <WorkbenchChrome stage={stage}>
      {stage === "landing" && (
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-950 px-6 py-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.18)] md:px-10 md:py-14">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(232,121,249,0.16),transparent_30%)]"
            aria-hidden
          />
          <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] md:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                YourTurn
              </p>
              <h1 className="mt-4 max-w-[12ch] text-4xl font-semibold tracking-tight md:text-5xl">
                Book the spot. Keep your options.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
                Plans change. YourTurn keeps a booking useful by showing the options your provider allows — including letting YourTurn recover value for you inside limits you choose.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStage("entry")}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-100",
                    focusRing
                  )}
                >
                  Try it with a booking
                </button>
                <button
                  type="button"
                  onClick={() => setStage("bookings")}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/10",
                    focusRing
                  )}
                >
                  Open my bookings
                </button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-white/10 p-5 shadow-[0_24px_50px_-24px_rgba(15,23,42,0.65)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">My booking</p>
              <p className="mt-3 text-2xl font-semibold">Friday Yoga</p>
              <p className="mt-2 text-sm text-slate-300">Tomorrow · 18:00 · Studio A</p>
              <div className="mt-5 h-px bg-white/10" />
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Can’t make it? Keep control of what happens next instead of losing the session.
              </p>
              <div className="mt-5 inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-900">
                Confirmed
              </div>
            </div>
          </div>
        </section>
      )}

      {stage === "entry" && (
        <section className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Demo customer</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Continue as Alice</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            For this workbench test, Alice already has two upcoming bookings. We start inside her normal customer account — no wallet setup required in this journey.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-950">Alice</p>
            <p className="mt-1 text-sm text-slate-600">2 upcoming bookings · 1 needs a change of plans</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setStage("bookings")} className={getButtonClassName("primary")}>
              Continue
            </button>
            <button type="button" onClick={() => setStage("landing")} className={getButtonClassName("secondary")}>
              Back
            </button>
          </div>
        </section>
      )}

      {stage === "bookings" && (
        <section className="space-y-5">
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/70 p-5 shadow-sm ring-1 ring-slate-900/[0.025] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">My bookings</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Your upcoming plans</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Everything you currently hold, with the next useful action in one place.
                </p>
              </div>
              <span className="text-sm text-slate-500">Alice · 2 upcoming</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02]">
              <div className="flex items-start justify-between gap-4">
                <BookingIdentity />
                <StatusPill>Confirmed</StatusPill>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                You still own this booking. Use it as planned, or change what happens if you can’t go.
              </p>
              <button
                type="button"
                onClick={() => setStage("detail")}
                className={cn(getButtonClassName("primary"), "mt-5 w-full sm:w-auto")}
              >
                Open booking
              </button>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">Sports Massage</p>
                  <p className="mt-1 text-sm text-slate-600">Tue 15 Sep · 12:30</p>
                  <p className="mt-1 text-sm text-slate-500">Recovery Room · Zürich</p>
                </div>
                <StatusPill>Confirmed</StatusPill>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">No action needed. This booking is still going ahead as planned.</p>
              <button type="button" disabled className={cn(getButtonClassName("secondary"), "mt-5 opacity-60")}>
                Keep as planned
              </button>
            </article>
          </div>
        </section>
      )}

      {stage === "detail" && (
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <button
            type="button"
            onClick={() => setStage("bookings")}
            className={cn("text-sm font-medium text-slate-600 hover:text-slate-950", focusRing)}
          >
            ← My bookings
          </button>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <BookingIdentity />
            <StatusPill>Confirmed</StatusPill>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Booking</p>
              <p className="mt-1 font-medium text-slate-950">1 yoga spot</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Provider rules</p>
              <p className="mt-1 font-medium text-slate-950">Transfer allowed</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Current holder</p>
              <p className="mt-1 font-medium text-slate-950">You</p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-sm font-medium text-slate-950">What do you want to do?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className={getButtonClassName("secondary")}>Use booking</button>
              <button type="button" onClick={() => setStage("change")} className={getButtonClassName("primary")}>
                Change plans
              </button>
            </div>
          </div>
        </section>
      )}

      {stage === "change" && (
        <section className="mx-auto max-w-3xl space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <button
              type="button"
              onClick={() => setStage("detail")}
              className={cn("text-sm font-medium text-slate-600 hover:text-slate-950", focusRing)}
            >
              ← Friday Yoga
            </button>
            <div className="mt-5">
              <BookingIdentity compact />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Change plans</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">I can’t go. What can I do?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">YourTurn only shows options this booking’s provider allows.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" className={cn("rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50", focusRing)}>
                <span className="font-medium text-slate-950">Find someone to take it</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">List the spot yourself and choose what to accept.</span>
              </button>
              <button type="button" className={cn("rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50", focusRing)}>
                <span className="font-medium text-slate-950">Swap for another time</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">See whether the provider has an eligible replacement.</span>
              </button>
              <button type="button" className={cn("rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50", focusRing)}>
                <span className="font-medium text-slate-950">Get whatever refund is available</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">Check the provider’s refund path first.</span>
              </button>
              <button
                type="button"
                onClick={() => setStage("setup")}
                className={cn("rounded-2xl border border-violet-300 bg-violet-50 p-4 text-left transition hover:border-violet-400 hover:bg-violet-100/70", focusRing)}
              >
                <span className="flex items-center justify-between gap-3 font-semibold text-violet-950">
                  Let YourTurn handle it
                  <span className="rounded-full bg-violet-200/70 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-violet-900">New</span>
                </span>
                <span className="mt-1 block text-sm leading-5 text-violet-900/80">Set your limits once. YourTurn can recover the booking inside them and come back to you if anything needs more authority.</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {stage === "setup" && (
        <section className="mx-auto max-w-3xl space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <button
              type="button"
              onClick={() => setStage("change")}
              className={cn("text-sm font-medium text-slate-600 hover:text-slate-950", focusRing)}
            >
              ← Change plans
            </button>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <BookingIdentity compact />
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-900">Only this booking</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">Let YourTurn handle it</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Choose the rules YourTurn must stay inside.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              YourTurn can act without interrupting you only when every action stays inside these limits. Anything else comes back to you first.
            </p>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-900">Minimum I want back</span>
                <div className="mt-2 flex rounded-xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-brand-focus focus-within:ring-offset-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={minimum}
                    onChange={(event) => setMinimum(Number(event.target.value))}
                    className="min-w-0 flex-1 rounded-l-xl border-0 bg-transparent px-3 py-2.5 text-base text-slate-950 outline-none"
                    aria-label="Minimum recovery amount"
                  />
                  <span className="flex items-center border-l border-slate-200 px-3 text-sm font-medium text-slate-600">USDC</span>
                </div>
                {!minimumIsValid && <span className="mt-1 block text-xs text-red-700">Enter an amount above 0.</span>}
              </label>

              <div>
                <span className="text-sm font-medium text-slate-900">Stop trying</span>
                <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-base font-medium text-slate-950">
                  Tomorrow · 17:00
                </div>
                <p className="mt-1 text-xs text-slate-500">One hour before class.</p>
              </div>
            </div>

            <fieldset className="mt-7">
              <legend className="text-sm font-medium text-slate-900">What YourTurn may do for this booking</legend>
              <div className="mt-3 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={findBuyer}
                    onChange={(event) => setFindBuyer(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-medium text-slate-950">Find an eligible buyer</span>
                    <span className="mt-1 block text-sm text-slate-600">YourTurn can consider offers that respect the provider’s rules and your minimum.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={transferBooking}
                    onChange={(event) => setTransferBooking(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-medium text-slate-950">Transfer after an acceptable offer</span>
                    <span className="mt-1 block text-sm text-slate-600">If the offer meets every rule, YourTurn may complete the handoff.</span>
                  </span>
                </label>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                  <input type="checkbox" disabled checked={false} className="mt-1 h-4 w-4" aria-label="Cancellation is not allowed" />
                  <span>
                    <span className="block font-medium text-slate-700">Cancel the booking</span>
                    <span className="mt-1 block text-sm">Not allowed. YourTurn cannot cancel this booking under this approval.</span>
                  </span>
                </div>
              </div>
            </fieldset>

            <div className="mt-7 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
              <p className="font-semibold">Scope: Friday Yoga only</p>
              <p className="mt-1 leading-6 text-violet-900/80">
                These rules do not give YourTurn control over your other bookings, your whole account, or permission to lower the minimum later.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-600">{ruleSummary}</p>
              <button
                type="button"
                onClick={() => setStage("authorization")}
                disabled={!minimumIsValid || !findBuyer || !transferBooking}
                className={getButtonClassName("primary")}
              >
                Continue to approval
              </button>
            </div>
          </div>
        </section>
      )}

      {stage === "authorization" && (
        <section className="mx-auto max-w-3xl space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-900" aria-hidden>
              ✓
            </div>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">YT-04 complete</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Ready for your approval.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              You’ve chosen exactly what YourTurn may do with Friday Yoga. The next journey asks you to approve these limits securely before the recovery agent receives any authority.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <BookingIdentity compact />
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Minimum recovery</dt>
                  <dd className="mt-1 font-medium text-slate-950">{minimum} USDC</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Expires</dt>
                  <dd className="mt-1 font-medium text-slate-950">Tomorrow · 17:00</dd>
                </div>
                <div>
                  <dt className="text-slate-500">May do</dt>
                  <dd className="mt-1 font-medium text-slate-950">Find buyer + transfer</dd>
                </div>
                <div>
                  <dt className="text-slate-500">May not do</dt>
                  <dd className="mt-1 font-medium text-slate-950">Cancel or lower your minimum</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Prototype boundary</p>
              <p className="mt-1 leading-6 text-amber-900/80">
                The hardware approval itself belongs to YT-05 and is intentionally not simulated as live on this UX-only branch. This is the handoff point for the real Ledger integration.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => setStage("setup")} className={getButtonClassName("primary")}>
                Review my rules
              </button>
              <button type="button" onClick={reset} className={getButtonClassName("secondary")}>
                Restart journey
              </button>
            </div>
          </div>
        </section>
      )}
    </WorkbenchChrome>
  );
}
