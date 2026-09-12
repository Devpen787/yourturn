"use client";

import { usePublishedSession } from "./ProviderRuntimeBoundary";

import { usePreparedBooking } from "./usePreparedBooking";
import { continuationOf } from "./holder-fixture-state";
import { clockLabel, scenarioMinute, providerRecoveryAllowed } from "./provider-runtime";
import { useRouter, useSearchParams } from "next/navigation";

const bookingDefaults = {
  title: "Friday Yoga",
  date: "Friday, 11 September",
  time: "18:00",
  venue: "Studio A",
  location: "Zürich",
  price: "52 CHF",
  cutoff: "17:30",
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
    <section className="mx-auto w-full max-w-5xl py-4 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{intro}</p> : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7 ${className}`}>{children}</div>;
}

function FactGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RulesCard() {
  const published = usePublishedSession();
  const booking = { ...bookingDefaults, ...published, transferCutoff: published.transferCutoffLabel };
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reusable booking rules</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Friday Yoga</h2>
        </div>
        <StatusPill tone="green">Recovery allowed</StatusPill>
      </div>
      <div className="mt-5">
        <FactGrid items={[["Transfer / recovery", "Allowed"], ["Transfer cutoff", `Friday · ${booking.cutoff}`], ["Eligibility", "Eligible Studio A customer · no duplicate session"], ["Cancellation", "Not allowed through recovery"]]} />
      </div>
      <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950 ring-1 ring-sky-100"><strong>Automatic when compliant:</strong> Studio A does not approve each individual recovery after these rules are published.</p>
    </Panel>
  );
}

function ProofDrawer({ title, body }: { title: string; body: string }) {
  return (
    <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900">View technical proof</summary>
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2"><StatusPill tone="amber">FIXTURE</StatusPill><p className="text-sm font-semibold text-slate-950">{title}</p></div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">No LIVE sponsor execution is claimed by this Product Workbench state.</p>
      </div>
    </details>
  );
}

export default function ProviderLifecycleClient() {
  const published = usePublishedSession();
  const booking = { ...bookingDefaults, ...published, transferCutoff: published.transferCutoffLabel };
  const router = useRouter();
  const shared = usePreparedBooking();
  const view = useSearchParams().get("view") ?? "xc3-provider-join";
  const go = (next: string) => router.push(`/product-preview?view=${next}`);

  if (shared.error) return <Frame eyebrow="Studio A" title="Booking needs confirmation." intro={shared.error}><p role="alert">Holder-sensitive actions are unavailable.</p></Frame>;
  if (!shared.state) return <p role="status">Loading the shared booking…</p>;
  const facts = continuationOf(shared.state);
  const holder = facts.holderRead === "current" ? shared.state.holder === "bob" ? "Bob" : "Maya Keller" : "Needs confirmation";
  return (
    <div className="pb-16">
      {view === "xc3-provider-join" && (
        <Frame eyebrow="Studio A · Setup" title="Bring Studio A onto YourTurn." intro="Set up the business once, then connect the sessions customers can book and recover when plans change.">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel>
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Business profile</p><p className="mt-1 text-sm text-slate-600">Studio A · Zürich</p></div><StatusPill tone="amber">Needs review</StatusPill></div>
              <div className="mt-5"><FactGrid items={[["Business", "Studio A"], ["Location", "Zürich"], ["Service type", "Fitness studio"], ["Customer bookings", "Enabled after setup"]]} /></div>
              <button type="button" onClick={() => go("xc3-provider-profile")} className={`${primaryButton} mt-6`}>Continue setup</button>
            </Panel>
            <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Provider promise</p><h2 className="mt-3 text-xl font-semibold">Keep control without approving every recovery.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Studio A defines reusable inventory, eligibility, transfer and cancellation rules. YourTurn works inside them.</p></aside>
          </div>
        </Frame>
      )}

      {view === "xc3-provider-profile" && (
        <Frame eyebrow="Studio A · Setup" title="Studio A is ready to add sessions." intro="The business profile is complete. Connect the source of truth for the sessions YourTurn should manage.">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Studio A</p><p className="mt-1 text-sm text-slate-600">Fitness studio · Zürich</p></div><StatusPill tone="green">Profile complete</StatusPill></div>
            <button type="button" onClick={() => go("xc3-provider-inventory-empty")} className={`${primaryButton} mt-6`}>Connect inventory</button>
          </Panel>
        </Frame>
      )}

      {view === "xc3-provider-inventory-empty" && (
        <Frame eyebrow="Studio A · Inventory" title="No sessions are connected yet." intro="Connect a schedule or create the first session so customers can receive normal usable bookings.">
          <Panel>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-base font-semibold text-slate-950">Your inventory is empty</p><p className="mt-2 text-sm text-slate-600">Nothing is available to book yet.</p></div>
            <button type="button" onClick={() => go("xc3-provider-inventory-loading")} className={`${primaryButton} mt-6`}>Connect schedule</button>
          </Panel>
        </Frame>
      )}

      {view === "xc3-provider-inventory-loading" && (
        <Frame eyebrow="Studio A · Inventory" title="Connecting your schedule." intro="YourTurn is reading the available session structure. Nothing is published to customers until the connection is confirmed.">
          <Panel><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950">Studio schedule</p><p className="mt-1 text-sm text-slate-600">Checking sessions and availability…</p></div><StatusPill tone="blue">Connecting</StatusPill></div><button type="button" onClick={() => go("xc3-provider-inventory")} className={`${secondaryButton} mt-6`}>Check connection</button></Panel>
        </Frame>
      )}

      {view === "xc3-provider-inventory-error" && (
        <Frame eyebrow="Studio A · Inventory" title="We could not connect the schedule." intro="No customer inventory was created. Retry without losing the Studio A setup.">
          <Panel><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950">Studio schedule</p><p className="mt-1 text-sm text-slate-600">Connection unavailable. Existing provider setup is unchanged.</p></div><StatusPill tone="rose">Connection issue</StatusPill></div><button type="button" onClick={() => go("xc3-provider-inventory-loading")} className={`${primaryButton} mt-6`}>Try again</button></Panel>
        </Frame>
      )}

      {view === "xc3-provider-inventory" && (
        <Frame eyebrow="Studio A · Inventory" title="Your schedule is connected." intro="Studio A can now create and publish booking inventory without exposing technical integration details to staff.">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Studio schedule</p><p className="mt-1 text-sm text-slate-600">1 upcoming session ready to configure</p></div><StatusPill tone="green">Connected</StatusPill></div>
            <button type="button" onClick={() => go("xc3-provider-session-draft")} className={`${primaryButton} mt-6`}>Configure Friday Yoga</button>
          </Panel>
          <ProofDrawer title="Inventory connection seam" body="This connected-inventory state is fixture product evidence. Real implementation must preserve provider-owned session identity and availability when replacing the fixture with an authoritative schedule/inventory interface." />
        </Frame>
      )}

      {view === "xc3-provider-session-draft" && (
        <Frame eyebrow="Studio A · Inventory" title="Review Friday Yoga before publishing." intro="The session stays a draft until its customer-facing details and reusable booking rules are ready.">
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{booking.date}</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{booking.title} · {booking.time}</h2><p className="mt-1 text-sm text-slate-600">{booking.venue} · {booking.location}</p></div><StatusPill>Draft</StatusPill></div><div className="mt-5"><FactGrid items={[["Customer price", booking.price], ["Capacity", `${published.capacity} places`], ["Bookings", "Not open yet"], ["Recovery", "Configured before publish"]]} /></div></Panel>
            <RulesCard />
          </div>
          <button type="button" onClick={() => go("xc3-provider-session-published")} className={`${primaryButton} mt-6`}>Publish session</button>
        </Frame>
      )}

      {view === "xc3-provider-session-published" && (
        <Frame eyebrow="Studio A · Inventory" title="Friday Yoga is open for bookings." intro="Customers can receive a normal Studio A booking. The reusable recovery rules are already attached before any individual recovery occurs.">
          <div className="grid gap-5 lg:grid-cols-2"><Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{booking.date}</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{booking.title} · {booking.time}</h2><p className="mt-1 text-sm text-slate-600">{published.capacity} places · {booking.price}</p></div><StatusPill tone="green">Published</StatusPill></div></Panel><RulesCard /></div>
          <button type="button" onClick={() => go("xc3-provider-sale-pending")} className={`${primaryButton} mt-6`}>Open booking activity</button>
        </Frame>
      )}

      {view === "xc3-provider-sale-pending" && (
        <Frame eyebrow="Studio A · Bookings" title="A Friday Yoga booking is being confirmed." intro="Do not count a customer as the holder until the booking and payment state are both confirmed.">
          <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Friday Yoga · Maya Keller</p><p className="mt-1 text-sm text-slate-600">{booking.price} · confirmation in progress</p></div><StatusPill tone="blue">Pending</StatusPill></div><p className="mt-5 text-sm leading-6 text-slate-600">Capacity remains reserved while the booking is being confirmed, but the final holder state is not shown as complete yet.</p><button type="button" onClick={() => go("xc3-provider-sale-success")} className={`${secondaryButton} mt-6`}>Check booking status</button></Panel>
        </Frame>
      )}

      {view === "xc3-provider-sale-error" && (
        <Frame eyebrow="Studio A · Bookings" title="The booking did not complete." intro="Maya is not shown as the holder and the place returns to available inventory.">
          <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Friday Yoga</p><p className="mt-1 text-sm text-slate-600">No completed booking · place available again</p></div><StatusPill tone="rose">Not completed</StatusPill></div><button type="button" onClick={() => go("xc3-provider-sale-pending")} className={`${primaryButton} mt-6`}>Retry booking</button></Panel>
        </Frame>
      )}

      {view === "xc3-provider-sale-success" && (
        <Frame eyebrow="Studio A · Bookings" title="Maya has a confirmed Friday Yoga booking." intro="The booking is now a normal usable item for Maya and the starting holder state for the later recovery journey.">
          <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Friday Yoga · {booking.time}</p><p className="mt-1 text-sm text-slate-600">{booking.date} · {booking.venue}</p></div><StatusPill tone="green">Confirmed</StatusPill></div><div className="mt-5"><FactGrid items={[["Current holder", "Maya Keller"], ["Customer price", booking.price], ["Attendance", "Not checked in"], ["Recovery rules", "Active for this booking type"]]} /></div><button type="button" onClick={() => go("xc3-provider-today")} className={`${primaryButton} mt-6`}>Open today’s bookings</button></Panel>
        </Frame>
      )}

      {view === "xc3-provider-today-empty" && (
        <Frame eyebrow="Studio A · Today" title="No bookings need attention right now." intro="Today stays quiet when there are no upcoming customers or operational exceptions.">
          <Panel><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-base font-semibold text-slate-950">Nothing due now</p><p className="mt-2 text-sm text-slate-600">Upcoming sessions will appear here with their current holder and attendance state.</p></div></Panel>
        </Frame>
      )}

      {view === "xc3-provider-today" && (
        <Frame eyebrow="Studio A · Today" title="Friday Yoga is ready to operate." intro="Staff see the service and current holder first. Recovery mechanics stay in the background unless an exception matters.">
          <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{booking.date}</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{booking.title} · {booking.time}</h2><p className="mt-1 text-sm text-slate-600">{published.capacity} places · Studio A</p></div><StatusPill tone="green">On schedule</StatusPill></div><div className="mt-5"><FactGrid items={[["Current holder", holder], ["Attendance", facts.holderRead !== "current" ? "Needs confirmation" : facts.attendanceCount === 1 ? "Checked in" : "Not checked in"], ["Booking", "Confirmed"], ["Recovery", providerRecoveryAllowed(shared.state, published) ? "Allowed under published rules" : "Blocked under published rules"], ["Transfer cutoff", published.transferCutoffLabel], ["Eligibility", published.eligibilityRule]]} /></div></Panel>
          <p className="mt-5 text-sm text-slate-600">Prepared booking · Friday fixture clock {clockLabel(scenarioMinute(shared.state))}. Maya held this booking before the scenario; no initial purchase or payment is demonstrated.</p>
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={secondaryButton} onClick={() => go("xc3-provider-session-edit")}>Edit session &amp; rules</button><button type="button" className={secondaryButton} onClick={() => go("xc-provider-policy")}>View current recovery rules</button>{shared.state.holder === "bob" && facts.holderRead === "current" ? <button type="button" className={primaryButton} onClick={() => go("xc2-provider-pending")}>Open booking fulfilment</button> : null}</div>
          <ProofDrawer title="Provider operations seam" body="This Today view is fixture product evidence. Real implementation must derive holder, booking status, availability, and attendance from authoritative provider/booking reads and fail closed on stale holder state." />
        </Frame>
      )}

      {view === "xc3-provider-stale-holder" && (
        <Frame eyebrow="Studio A · Today" title="Current holder needs confirmation." intro="YourTurn will not show an outdated customer as authoritative while the holder read is stale.">
          <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Friday Yoga · {booking.time}</p><p className="mt-1 text-sm text-slate-600">Holder status is temporarily unavailable.</p></div><StatusPill tone="amber">Needs confirmation</StatusPill></div><p className="mt-5 text-sm leading-6 text-slate-600">Attendance and holder-sensitive actions stay blocked until the current booking state is refreshed.</p><button type="button" onClick={() => go("xc3-provider-today")} className={`${secondaryButton} mt-6`}>Refresh booking state</button></Panel>
        </Frame>
      )}
    </div>
  );
}
