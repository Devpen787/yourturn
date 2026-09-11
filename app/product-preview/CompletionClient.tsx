"use client";

import { useRouter, useSearchParams } from "next/navigation";

const booking = {
  title: "Friday Yoga",
  time: "18:00",
  date: "Friday, 11 September",
  venue: "Studio A",
  location: "Zürich",
  handoff: "45 USDC",
};

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-slate-950 text-white hover:bg-slate-800`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`;

function StatusPill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "rose" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    rose: "bg-rose-50 text-rose-800 ring-rose-100",
    blue: "bg-sky-50 text-sky-800 ring-sky-100",
  };
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tones[tone]}`}>{children}</span>;
}

function Frame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-4xl py-4 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{intro}</p> : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function BookingCard({ status, tone = "slate", children }: { status: string; tone?: "slate" | "green" | "amber" | "rose" | "blue"; children?: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{booking.date}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{booking.title} · {booking.time}</h2>
          <p className="mt-1 text-sm text-slate-600">{booking.venue} · {booking.location}</p>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      {children}
    </div>
  );
}

function ProofDrawer({ title, body }: { title: string; body: string }) {
  return (
    <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900">
        View technical proof
      </summary>
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="amber">FIXTURE</StatusPill>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">No LIVE sponsor execution is claimed by this Product Workbench state.</p>
      </div>
    </details>
  );
}

function FactGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Timeline({ items }: { items: Array<{ title: string; body: string; state?: string }> }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
            {item.state ? <StatusPill tone={item.state === "Complete" ? "green" : "slate"}>{item.state}</StatusPill> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function CompletionClient() {
  const router = useRouter();
  const view = useSearchParams().get("view") ?? "xc2-bob-ready";
  const go = (next: string) => router.replace(`/product-preview?view=${next}`);

  return (
    <div className="pb-16">
      {view === "xc2-bob-not-open" && (
        <Frame eyebrow="My bookings" title="Friday Yoga is ready for later." intro="You own this booking. Check-in opens 30 minutes before the session.">
          <BookingCard status="Confirmed" tone="green">
            <FactGrid items={[["Booked for", "Bob"], ["Check-in", "Opens at 17:30"], ["Handoff", booking.handoff], ["Provider", booking.venue]]} />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" disabled className={`${primaryButton} cursor-not-allowed opacity-40`}>Check in</button>
              <span className="text-sm text-slate-500">Available from 17:30</span>
            </div>
          </BookingCard>
        </Frame>
      )}

      {view === "xc2-bob-ready" && (
        <Frame eyebrow="My bookings" title="Check in for Friday Yoga." intro="Studio A recognizes you as the current holder. Check in when you arrive.">
          <BookingCard status="Check-in open" tone="blue">
            <FactGrid items={[["Booked for", "Bob"], ["Check-in", "Open now"], ["Session", "18:00"], ["Provider", booking.venue]]} />
            <button type="button" onClick={() => go("xc2-bob-checked-in")} className={`${primaryButton} mt-6`}>Check in</button>
          </BookingCard>
          <ProofDrawer title="Fulfilment eligibility seam" body="This check-in state is product evidence. Integration must confirm Bob is still the authoritative current holder and that Studio A's fulfilment window is open before attendance is recorded." />
        </Frame>
      )}

      {view === "xc2-bob-checkin-error" && (
        <Frame eyebrow="My bookings" title="Check-in did not complete." intro="Your booking is still confirmed. No attendance was recorded, so it is safe to try again.">
          <BookingCard status="Check-in issue" tone="rose">
            <p className="mt-5 text-sm leading-6 text-slate-600">Studio A did not confirm the check-in response. YourTurn has not marked you as attended.</p>
            <button type="button" onClick={() => go("xc2-bob-checked-in")} className={`${primaryButton} mt-6`}>Try check-in again</button>
          </BookingCard>
        </Frame>
      )}

      {view === "xc2-bob-stale-holder" && (
        <Frame eyebrow="My bookings" title="We need to confirm this booking before check-in." intro="The current-holder read is stale or unavailable, so YourTurn will not record attendance yet.">
          <BookingCard status="Needs confirmation" tone="amber">
            <p className="mt-5 text-sm leading-6 text-slate-600">No check-in was recorded. Refresh the booking after holder status is available again.</p>
            <button type="button" onClick={() => go("xc2-bob-ready")} className={`${secondaryButton} mt-6`}>Refresh booking</button>
          </BookingCard>
        </Frame>
      )}

      {view === "xc2-bob-checked-in" && (
        <Frame eyebrow="My bookings" title="You’re checked in." intro="Friday Yoga is ready to use. Studio A can now fulfil this booking under its normal attendance flow.">
          <BookingCard status="Checked in" tone="green">
            <FactGrid items={[["Booked for", "Bob"], ["Attendance", "Checked in"], ["Session", "18:00"], ["Provider", booking.venue]]} />
            <button type="button" onClick={() => go("xc2-bob-history")} className={`${secondaryButton} mt-6`}>View activity</button>
          </BookingCard>
          <ProofDrawer title="Check-in record seam" body="The checked-in state is a Product Workbench fixture. Real implementation must reconcile the provider attendance record with the same authoritative booking holder before this success is shown." />
        </Frame>
      )}

      {view === "xc2-provider-pending" && (
        <Frame eyebrow="Studio A · Today" title="Bob is the expected guest for Friday Yoga." intro="The recovered booking is valid and Bob is the current holder. Attendance has not been recorded yet.">
          <BookingCard status="Expected" tone="blue">
            <FactGrid items={[["Current holder", "Bob"], ["Previous holder", "Maya Keller"], ["Attendance", "Not checked in"], ["Recovery", "Completed handoff"]]} />
          </BookingCard>
        </Frame>
      )}

      {view === "xc2-provider-fulfilled" && (
        <Frame eyebrow="Studio A · Today" title="Friday Yoga was fulfilled for Bob." intro="Bob checked in as the authoritative holder. The session remains the same Studio A booking after recovery.">
          <BookingCard status="Fulfilled" tone="green">
            <FactGrid items={[["Current holder", "Bob"], ["Attendance", "Checked in"], ["Session state", "Fulfilled"], ["Recovery", "45 USDC handoff"]]} />
            <button type="button" onClick={() => go("xc2-provider-reconciled")} className={`${primaryButton} mt-6`}>Review reconciliation</button>
          </BookingCard>
        </Frame>
      )}

      {view === "xc2-provider-reconcile-issue" && (
        <Frame eyebrow="Studio A · Reconciliation" title="Attendance is recorded, but the recovery record is not fully reconciled." intro="Keep fulfilment and recovery history separate until the booking, attendance, and handoff records agree.">
          <BookingCard status="Needs reconciliation" tone="amber">
            <FactGrid items={[["Holder", "Bob"], ["Attendance", "Checked in"], ["Handoff record", "Still confirming"], ["Final history", "Not complete"]]} />
            <button type="button" onClick={() => go("xc2-provider-reconciled")} className={`${secondaryButton} mt-6`}>Refresh reconciliation</button>
          </BookingCard>
        </Frame>
      )}

      {view === "xc2-provider-reconciled" && (
        <Frame eyebrow="Studio A · Reconciliation" title="Friday Yoga is fully reconciled." intro="The holder change, attendance, and recovery handoff now describe the same completed booking lifecycle.">
          <BookingCard status="Reconciled" tone="green">
            <FactGrid items={[["Previous holder", "Maya Keller"], ["Current holder", "Bob"], ["Attendance", "Fulfilled"], ["Recovery handoff", booking.handoff]]} />
            <button type="button" onClick={() => go("xc2-provider-history")} className={`${secondaryButton} mt-6`}>View activity</button>
          </BookingCard>
          <ProofDrawer title="Provider reconciliation seam" body="This reconciled provider state is fixture product evidence. Real implementation must read booking ownership, attendance, and recovery settlement from their authoritative interfaces and show success only when they agree." />
        </Frame>
      )}

      {view === "xc2-history-partial" && (
        <Frame eyebrow="Activity" title="This recovery is still being finalized." intro="YourTurn will not publish a completed receipt until the final booking, attendance, and recovery records agree.">
          <Timeline items={[
            { title: "Friday Yoga transferred", body: "Bob is recorded as the current holder.", state: "Complete" },
            { title: "Attendance recorded", body: "Studio A recorded Bob’s check-in.", state: "Complete" },
            { title: "Recovery record", body: "Final reconciliation is still being confirmed.", state: "Pending" },
          ]} />
        </Frame>
      )}

      {view === "xc2-maya-history" && (
        <Frame eyebrow="Activity" title="Friday Yoga recovery complete." intro="A readable receipt of what happened to your booking.">
          <Timeline items={[
            { title: "You asked YourTurn to recover the booking", body: "Friday Yoga only, minimum 40 USDC, expiry Tomorrow · 17:00, cancellation forbidden.", state: "Complete" },
            { title: "YourTurn recovered 45 USDC", body: "The accepted handoff stayed inside your approved recovery rules.", state: "Complete" },
            { title: "Friday Yoga transferred", body: "The booking is no longer usable from your My bookings.", state: "Complete" },
            { title: "Booking fulfilled", body: "Studio A fulfilled the recovered booking for the next holder.", state: "Complete" },
          ]} />
          <ProofDrawer title="Recovery receipt seam" body="This human-readable receipt is Product Workbench evidence. Technical evidence from Ledger, World, Hedera, booking ownership, and provider fulfilment must be attached to the same execution before any LIVE proof is claimed." />
        </Frame>
      )}

      {view === "xc2-bob-history" && (
        <Frame eyebrow="Activity" title="Friday Yoga activity." intro="How this booking became yours and how it was used.">
          <Timeline items={[
            { title: "Friday Yoga became available", body: "Studio A’s transfer rules allowed the released booking to move.", state: "Complete" },
            { title: "You committed 45 USDC", body: "Your eligibility and payment commitment were confirmed before the handoff completed.", state: "Complete" },
            { title: "Booking transferred to you", body: "Friday Yoga appeared as a normal Confirmed booking in My bookings.", state: "Complete" },
            { title: "You checked in", body: "Studio A recognized you as the current holder and recorded attendance.", state: "Complete" },
          ]} />
          <ProofDrawer title="Acquirer receipt seam" body="This receipt is fixture product evidence. Real implementation must derive the receipt from the same eligibility, payment, holder, and provider-attendance execution rather than a separate demo log." />
        </Frame>
      )}

      {view === "xc2-provider-history" && (
        <Frame eyebrow="Studio A · Activity" title="Friday Yoga lifecycle complete." intro="The provider view keeps the service, holder transition, and fulfilment history together without exposing Maya’s private authorization details.">
          <Timeline items={[
            { title: "Recovery allowed by Studio A rules", body: "The reusable transfer, eligibility, cutoff, and no-cancellation rules permitted the handoff.", state: "Complete" },
            { title: "Holder changed", body: "Maya Keller → Bob for the same Friday Yoga booking.", state: "Complete" },
            { title: "Bob checked in", body: "Attendance was recorded for the authoritative current holder.", state: "Complete" },
            { title: "Booking reconciled", body: "Holder, attendance, and 45 USDC recovery handoff agree.", state: "Complete" },
          ]} />
          <ProofDrawer title="Provider history seam" body="This provider activity view is fixture product evidence. It must not expose the holder’s private Recovery Mandate; real proof should include only provider-relevant booking, holder, fulfilment, and settlement reconciliation." />
        </Frame>
      )}
    </div>
  );
}
