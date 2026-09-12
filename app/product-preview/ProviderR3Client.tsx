"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { providerDraftIsDirty, validateProviderDraft } from "./r3-provider-state";
import { useR3ProviderState } from "./useR3ProviderState";

const buttonBase = "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-slate-950 text-white hover:bg-slate-800`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`;
const inputClass = "mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function Frame({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl py-4 sm:py-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Studio A · Inventory · FIXTURE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{intro}</p><div className="mt-7">{children}</div></section>;
}
function Panel({ children }: { children: React.ReactNode }) { return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">{children}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-950">{value}</p></div>; }

export default function ProviderR3Client() {
  const router = useRouter();
  const view = useSearchParams().get("view") ?? "xc3-provider-session-draft";
  const { state, ready, error, edit, save, retry } = useR3ProviderState();
  if (error) return <Frame title="Provider settings need attention." intro={error}><button type="button" onClick={retry} className={primaryButton}>Retry provider settings</button></Frame>;
  if (!ready) return <Frame title="Loading Studio A settings." intro="Restoring the latest provider draft and published rules."><p role="status">Loading provider fixture…</p></Frame>;

  if (view === "xc3-provider-session-published") {
    const p = state.published;
    return <Frame title="Friday Yoga is open for bookings." intro="Customers can receive a normal Studio A booking. The reusable recovery rules are attached before any individual recovery occurs.">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{p.sessionTitle} · {p.startTime}</p><p className="mt-1 text-sm text-slate-600">Studio A · Zürich</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">Published</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Fact label="Capacity" value={`${p.capacity} places`} /><Fact label="Transfer cutoff" value={`Friday · ${p.transferCutoff}`} /><Fact label="Eligibility" value={p.eligibilityRule} /><Fact label="Recovery" value="Allowed under published provider policy" /></div></Panel>
        <Panel><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Runtime truth</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Saved rules, not unsaved draft.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Provider rules remain independent from Maya&apos;s holder mandate and Bob&apos;s eligibility/payment. Saving provider settings never widens either customer boundary.</p></Panel>
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => router.push("/product-preview?view=xc3-provider-session-edit")} className={secondaryButton}>Edit session & rules</button><button type="button" onClick={() => router.push("/product-preview?view=xc3-provider-sale-pending")} className={primaryButton}>Open booking activity</button></div>
    </Frame>;
  }

  const errors = validateProviderDraft(state.draft);
  const dirty = providerDraftIsDirty(state);
  const publish = () => {
    const next = save();
    if (next?.lastSave === "saved") router.push("/product-preview?view=xc3-provider-session-published");
  };
  return <Frame title="Review Friday Yoga before publishing." intro="The session stays a draft until its customer-facing details and reusable booking rules are ready. Draft changes persist, but customers remain governed by the last saved provider rules until publishing succeeds.">
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Provider draft</p><p className="mt-1 text-sm text-slate-600">Friday Yoga identity is fixed; operational details and reusable rules can be edited.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${dirty ? "bg-amber-50 text-amber-800 ring-amber-100" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>{dirty ? "Unsaved draft" : "Matches published"}</span></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-800">Session name<input aria-label="Session name" className={inputClass} value={state.draft.sessionTitle} onChange={(e) => edit("sessionTitle", e.target.value)} /></label>
          <label className="text-sm font-medium text-slate-800">Start time<input aria-label="Start time" className={inputClass} value={state.draft.startTime} onChange={(e) => edit("startTime", e.target.value)} /></label>
          <label className="text-sm font-medium text-slate-800">Capacity<input aria-label="Capacity" inputMode="numeric" className={inputClass} value={state.draft.capacity} onChange={(e) => edit("capacity", e.target.value)} /></label>
          <label className="text-sm font-medium text-slate-800">Transfer cutoff<input aria-label="Transfer cutoff" className={inputClass} value={state.draft.transferCutoff} onChange={(e) => edit("transferCutoff", e.target.value)} /></label>
          <label className="text-sm font-medium text-slate-800 sm:col-span-2">Eligibility rule<input aria-label="Eligibility rule" className={inputClass} value={state.draft.eligibilityRule} onChange={(e) => edit("eligibilityRule", e.target.value)} /></label>
        </div>
        {state.lastSave === "error" ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-100">{state.lastError}</p> : null}
        {errors.length ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-100"><strong>Fix before publishing:</strong><ul className="mt-2 list-disc pl-5">{errors.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={publish} className={primaryButton}>Publish session</button><button type="button" onClick={() => router.push("/product-preview?view=xc3-provider-inventory")} className={secondaryButton}>Back to inventory</button></div>
      </Panel>
      <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Published/runtime truth</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Reusable booking rules</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">Recovery allowed</span></div><div className="mt-5 grid gap-3"><Fact label="Session" value={`${state.published.sessionTitle} · ${state.published.startTime}`} /><Fact label="Capacity" value={`${state.published.capacity} places`} /><Fact label="Transfer cutoff" value={`Friday · ${state.published.transferCutoff}`} /><Fact label="Eligibility" value={state.published.eligibilityRule} /><Fact label="Cancellation" value="Not allowed through recovery" /></div><p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950 ring-1 ring-sky-100"><strong>Automatic when compliant:</strong> Studio A does not approve each individual recovery after these rules are published.</p><p className="mt-4 text-sm leading-6 text-slate-600">Invalid input or a failed save leaves every published value above unchanged.</p></Panel>
    </div>
  </Frame>;
}
