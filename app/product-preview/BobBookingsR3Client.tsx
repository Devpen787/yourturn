"use client";

import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { HOLDER_FIXTURE_EVENT, HOLDER_FIXTURE_KEY, continuationOf, readHolderFixture } from "./holder-fixture-state";

const SERVER_SNAPSHOT = () => undefined;
function snapshot(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage.getItem(HOLDER_FIXTURE_KEY); }
  catch { return "!booking-storage-unavailable!"; }
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === HOLDER_FIXTURE_KEY || event.key === null) listener(); };
  window.addEventListener(HOLDER_FIXTURE_EVENT, listener); window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(HOLDER_FIXTURE_EVENT, listener); window.removeEventListener("storage", onStorage); };
}
const buttonBase = "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-slate-950 text-white hover:bg-slate-800`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`;

export default function BobBookingsR3Client() {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, snapshot, SERVER_SNAPSHOT);
  const loaded = useMemo(() => {
    if (raw === undefined) return { state: null, error: null };
    try { return { state: readHolderFixture(raw), error: null }; }
    catch { return { state: null, error: "Bob's booking list could not restore the shared Friday Yoga lifecycle." }; }
  }, [raw]);
  if (loaded.error) return <section className="mx-auto max-w-4xl py-8"><h1 className="text-3xl font-semibold">My bookings</h1><p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-5 text-sm text-amber-950">{loaded.error}</p></section>;
  if (!loaded.state) return <section className="mx-auto max-w-4xl py-8"><h1 className="text-3xl font-semibold">My bookings</h1><p className="mt-4 text-slate-600">Restoring Bob&apos;s booking list…</p></section>;
  const state = loaded.state;
  const facts = continuationOf(state);
  const owned = state.holder === "bob" && state.settlementCount === 1 && facts.handoff === "complete";
  const status = facts.fulfilment === "fulfilled" ? "Fulfilled" : facts.attendance === "checked-in" ? "Checked in" : "Confirmed";
  return <section className="mx-auto w-full max-w-4xl py-4 sm:py-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bob · My bookings · FIXTURE</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">My bookings</h1>
    <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Only bookings Bob currently holds appear here. Browsing or opening this route cannot create ownership.</p>
    {owned ? <div className="mt-7 rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Friday, 11 September</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Friday Yoga · 18:00</h2><p className="mt-1 text-sm text-slate-600">Studio A · Zürich</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">{status}</span></div>{facts.fulfilment === "fulfilled" ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-100">Friday Yoga was fulfilled for Bob.</p> : facts.attendance === "checked-in" ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-100">You&apos;re checked in for Friday Yoga.</p> : null}<div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-400">Current holder</p><p className="mt-1 text-sm font-semibold text-slate-950">Bob</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-400">Handoff</p><p className="mt-1 text-sm font-semibold text-slate-950">Complete · {state.recoveredAmount} USDC</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-400">Check-in</p><p className="mt-1 text-sm font-semibold text-slate-950">{facts.attendance === "checked-in" ? "Checked in" : facts.checkinWindow === "open" ? "Open now" : facts.checkinWindow === "closed" ? "Closed" : "Opens 17:30"}</p></div></div><button type="button" onClick={() => router.push("/product-preview?view=xc2-bob-ready")} className={`${primaryButton} mt-6`}>Use booking</button></div> : <div className="mt-7 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-lg font-semibold text-slate-950">No Friday Yoga booking yet.</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">The same Friday Yoga lifecycle is still held by Maya. Bob&apos;s list stays empty until an authoritative handoff completes.</p></div>}
    <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => router.push("/product-preview?view=xc-find")} className={secondaryButton}>Browse available spots</button></div>
  </section>;
}
