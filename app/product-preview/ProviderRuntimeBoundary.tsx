"use client";

import { createContext, useContext } from "react";
import { useR3ProviderState } from "./useR3ProviderState";
import { R3_PROVIDER_INITIAL } from "./r3-provider-state";
import { clockLabel, minutes } from "./provider-runtime";

const Context = createContext(R3_PROVIDER_INITIAL.published);
export function usePublishedSession() {
  const p = useContext(Context);
  return { ...p, title: p.sessionTitle, time: p.startTime, cutoff: p.transferCutoff,
    transferCutoffLabel: `Friday · ${p.transferCutoff}`, checkinOpens: clockLabel(minutes(p.startTime) - 30) };
}
export default function ProviderRuntimeBoundary({ children }: { children: React.ReactNode }) {
  const { state, ready, error, retry } = useR3ProviderState();
  if (error) return <section className="mx-auto max-w-4xl py-8"><h1 className="text-3xl font-semibold">Provider rules need confirmation.</h1><p role="alert" className="mt-4">{error}</p><button className="mt-5 min-h-[44px] rounded-full border px-5" onClick={retry}>Retry provider settings</button></section>;
  if (!ready) return <p role="status" className="py-8">Loading published Studio A rules…</p>;
  return <Context.Provider value={state.published}>{children}</Context.Provider>;
}
