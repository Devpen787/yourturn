"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  R3_PROVIDER_EVENT,
  R3_PROVIDER_INITIAL,
  R3_PROVIDER_KEY,
  readR3ProviderState,
  reduceR3ProviderState,
} from "./r3-provider-state";
import type { ProviderDraft, R3ProviderAction, R3ProviderState } from "./r3-provider-state";

const SERVER_SNAPSHOT = () => undefined;
function snapshot(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage.getItem(R3_PROVIDER_KEY); }
  catch { return "!provider-storage-unavailable!"; }
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === R3_PROVIDER_KEY || event.key === null) listener(); };
  window.addEventListener(R3_PROVIDER_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(R3_PROVIDER_EVENT, listener); window.removeEventListener("storage", onStorage); };
}
const announce = () => window.dispatchEvent(new Event(R3_PROVIDER_EVENT));

export function useR3ProviderState() {
  const raw = useSyncExternalStore(subscribe, snapshot, SERVER_SNAPSHOT);
  const [writeError, setWriteError] = useState<string | null>(null);
  const loaded = useMemo(() => {
    if (raw === undefined) return { state: null, error: null };
    try { return { state: readR3ProviderState(raw), error: null }; }
    catch { return { state: null, error: "Provider settings could not be restored. Published rules were not changed." }; }
  }, [raw]);
  const state = loaded.state ?? R3_PROVIDER_INITIAL;
  const error = loaded.error ?? writeError;

  function commit(action: R3ProviderAction): R3ProviderState | null {
    if (!loaded.state || error) return null;
    let next: R3ProviderState;
    try { next = reduceR3ProviderState(readR3ProviderState(window.localStorage.getItem(R3_PROVIDER_KEY)), action); }
    catch { setWriteError("This provider change is not valid. Published rules were not changed."); return null; }
    try { window.localStorage.setItem(R3_PROVIDER_KEY, JSON.stringify(next)); }
    catch { setWriteError("Provider settings could not be saved. Published rules were not changed."); return null; }
    announce();
    return next;
  }

  return {
    state,
    ready: raw !== undefined && loaded.state !== null,
    error,
    edit: (field: keyof ProviderDraft, value: string) => commit({ type: "edit", field, value }),
    save: () => commit({ type: "save" }),
    retry: () => { setWriteError(null); announce(); },
  };
}
