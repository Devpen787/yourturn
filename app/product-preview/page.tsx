"use client";

import { useMemo, useState } from "react";

type Step = "enter" | "bookings" | "detail" | "plans" | "setup" | "approval";

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

function BookingIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {booking.date}
      </p>
      <h2 className={compact ? "text-xl font-semibold text-slate-950" : "text-2xl font-semibold tracking-tight text-slate-950"}>
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{intro}</p> : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export default function ProductPreviewPage() {
  const [step, setStep] = useState<Step>("enter");
  const [confirmedScope, setConfirmedScope] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const progress = useMemo(() => {
    const order: Step[] = ["enter", "bookings", "detail", "plans", "setup", "approval"];
    return order.indexOf(step) + 1;
  }, [step]);

  function chooseUnavailable(label: string) {
    setNotice(`${label} is a valid change-plans path. This first journey is testing assisted recovery.`);
  }

  return (
    <div className="pb-16">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Product journey preview</span>
        <span aria-label={`Step ${progress} of 6`}>{progress} / 6</span>
      </div>

      {step === "enter" && (
        <StepFrame
          eyebrow="YourTurn"
          title="Your bookings should stay useful when plans change."
          intro="Keep every reservation in one place, use it normally, or recover value when you can no longer make it."
        >
          <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-slate-950 p-7 text-white sm:p-9">
              <p className="text-sm font-medium text-slate-300">A booking that still works for you.</p>
              <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">This Friday</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Welcome back</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Open your bookings</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                For this product preview, continue with a prepared customer account and booking.
              </p>
              <button type="button" onClick={() => setStep("bookings")} className={`${primaryButton} mt-7 w-full`}>
                Continue as Maya
              </button>
              <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700" htmlFor="preview-email">Email</label>
                <input
                  id="preview-email"
                  type="email"
                  placeholder="you@example.com"
                  className="min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
                <button type="button" onClick={() => setStep("bookings")} className={`${secondaryButton} w-full`}>
                  Continue with email
                </button>
              </div>
              <p className="mt-6 text-xs leading-5 text-slate-500">No recovery action is submitted by this preview.</p>
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
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <button
              type="button"
              onClick={() => setStep("detail")}
              className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <BookingIdentity />
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">Confirmed</span>
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <span className="text-sm text-slate-500">Your next booking</span>
                <span className="text-sm font-semibold text-slate-950 group-hover:translate-x-0.5">View booking →</span>
              </div>
            </button>

            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plans changed?</p>
              <h2 className="mt-3 text-xl font-semibold">Keep the booking useful.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Open a booking to see the options available for that specific spot.
              </p>
            </aside>
          </div>

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
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.status}</span>
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
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">Confirmed</span>
                </div>
                <dl className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Booked for</dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">Maya Keller</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Original price</dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">{booking.price}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Check-in</dt>
                    <dd className="mt-1.5 text-sm font-medium text-slate-900">Opens 30 min before</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Changes</dt>
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
                  <button type="button" onClick={() => setNotice("Your booking stays confirmed and ready for check-in.")} className={`${secondaryButton} w-full`}>
                    Use booking
                  </button>
                  <button type="button" onClick={() => { setNotice(null); setStep("plans"); }} className={`${primaryButton} w-full`}>
                    Change plans
                  </button>
                </div>
              </div>
            </div>
          </div>
          {notice ? <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
        </StepFrame>
      )}

      {step === "plans" && (
        <StepFrame
          eyebrow="Change plans"
          title="What would help most?"
          intro="These options apply only to Friday Yoga. Nothing else in your account changes."
        >
          <BackButton onClick={() => { setNotice(null); setStep("detail"); }} />
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
              onClick={() => { setNotice(null); setStep("setup"); }}
              className="rounded-[1.5rem] border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Let YourTurn handle it</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Set your limits once. YourTurn can look for a recovery that stays inside them and come back to you if anything needs more permission.
                  </p>
                </div>
                <span className="text-xl" aria-hidden="true">→</span>
              </div>
            </button>
          </div>
          {notice ? <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Only this booking</p>
              <div className="mt-4">
                <p className="text-2xl font-semibold">{booking.title} · {booking.time}</p>
                <p className="mt-2 text-sm text-slate-300">{booking.date}</p>
                <p className="mt-1 text-sm text-slate-300">{booking.venue} · {booking.location}</p>
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
                  <label className="text-sm font-semibold text-slate-900" htmlFor="minimum">Minimum recovery</label>
                  <div className="mt-2 flex min-h-[52px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                    <input id="minimum" value="40" readOnly className="w-full bg-transparent text-xl font-semibold text-slate-950 outline-none" />
                    <span className="text-sm font-semibold text-slate-500">USDC</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Offers below 40 are rejected automatically.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Expires</p>
                  <div className="mt-2 flex min-h-[52px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950">
                    Tomorrow · 17:00
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">After that, YourTurn must ask you again.</p>
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6">
                <h2 className="text-sm font-semibold text-slate-950">YourTurn may</h2>
                <ul className="mt-3 space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3"><span className="mt-0.5 text-emerald-600">✓</span><span>Accept an eligible offer of 40 USDC or more.</span></li>
                  <li className="flex gap-3"><span className="mt-0.5 text-emerald-600">✓</span><span>Transfer this Friday Yoga booking after the recovery is secured.</span></li>
                  <li className="flex gap-3"><span className="mt-0.5 text-emerald-600">✓</span><span>Keep you updated as the recovery progresses.</span></li>
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
                onClick={() => setStep("approval")}
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
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">Not authorized yet</span>
              </div>
              <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Minimum</dt>
                  <dd className="mt-1 font-semibold text-slate-950">40 USDC</dd>
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
            </div>

            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl" aria-hidden="true">✓</div>
              <h2 className="mt-5 text-xl font-semibold">Approval handoff is ready.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The product journey now has a clear boundary for device-backed authorization without exposing technical details to the customer.
              </p>
              <button type="button" disabled className="mt-6 inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold text-white/70">
                Approve on secure device
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                This UX candidate stops here. No authorization or recovery action has been submitted.
              </p>
            </aside>
          </div>
        </StepFrame>
      )}
    </div>
  );
}
