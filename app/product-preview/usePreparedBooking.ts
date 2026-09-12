"use client";
import { useMemo, useSyncExternalStore } from "react";
import { HOLDER_FIXTURE_EVENT, HOLDER_FIXTURE_KEY, readHolderFixture } from "./holder-fixture-state";

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === HOLDER_FIXTURE_KEY || event.key === null) listener(); };
  window.addEventListener(HOLDER_FIXTURE_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(HOLDER_FIXTURE_EVENT, listener); window.removeEventListener("storage", storage); };
}
const snapshot = () => { try { return window.localStorage.getItem(HOLDER_FIXTURE_KEY); } catch { return "!unavailable!"; } };
const server = () => undefined;
/** Read-only projection of the existing booking, never a provider-owned copy. */
export function usePreparedBooking() {
  const raw = useSyncExternalStore(subscribe, snapshot, server);
  return useMemo(() => {
    if (raw === undefined) return { state: null, error: null };
    try { return { state: readHolderFixture(raw), error: null }; }
    catch { return { state: null, error: "The current booking needs confirmation. No holder or attendance is assumed." }; }
  }, [raw]);
}
