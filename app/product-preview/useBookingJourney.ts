"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  HOLDER_FIXTURE_EVENT, HOLDER_FIXTURE_KEY, INITIAL_HOLDER_FIXTURE,
  continuationOf, readHolderFixture, reduceBookingFixture,
  resolveXcStep, resolveCompletionView, XC_VIEWS,
} from "./holder-fixture-state";
import type { BookingAction, HolderFixture, XcStep } from "./holder-fixture-state";

const SERVER_SNAPSHOT = () => undefined;
function snapshot(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage.getItem(HOLDER_FIXTURE_KEY); }
  catch { return "!booking-storage-unavailable!"; }
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === HOLDER_FIXTURE_KEY || event.key === null) listener();
  };
  window.addEventListener(HOLDER_FIXTURE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HOLDER_FIXTURE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
const announce = () => window.dispatchEvent(new Event(HOLDER_FIXTURE_EVENT));
const resolved = (view: string, state: HolderFixture) => view.startsWith("xc2-")
  ? resolveCompletionView(view, state) : XC_VIEWS[resolveXcStep(view, state)];

/** Same fixture key and event as the holder. No duplicated Bob/provider truth.
 * This adapter is browser-only and is not imported by any server/sponsor route.
 */
export function useBookingJourney() {
  const router = useRouter();
  const requested = useSearchParams().get("view") ?? "xc-find";
  const raw = useSyncExternalStore(subscribe, snapshot, SERVER_SNAPSHOT);
  const pendingView = useRef<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loaded = useMemo(() => {
    if (raw === undefined) return { state: null, error: null };
    try { return { state: readHolderFixture(raw), error: null }; }
    catch { return { state: null, error: "Your booking state could not be restored. No new action has been completed." }; }
  }, [raw]);
  const state = loaded.state ?? INITIAL_HOLDER_FIXTURE;
  const view = resolved(requested, state);
  const error = loaded.error ?? writeError;

  useEffect(() => {
    if (pendingView.current !== null) {
      if (requested === pendingView.current) pendingView.current = null;
      else return;
    }
    if (!loaded.state || error || requested === view) return;
    router.replace(`/product-preview?view=${view}`, { scroll: false });
  }, [requested, view, loaded.state, error, router]);

  function navigate(next: string, current: HolderFixture) {
    const destination = resolved(next, current);
    if (destination === requested) return;
    pendingView.current = destination;
    router.push(`/product-preview?view=${destination}`, { scroll: true });
  }

  function go(next: string) {
    if (!loaded.state || error) return;
    try { navigate(next, readHolderFixture(window.localStorage.getItem(HOLDER_FIXTURE_KEY))); }
    catch { setWriteError("Your booking state could not be restored. No new action has been completed."); }
  }

  function act(action: BookingAction, destination: string) {
    if (!loaded.state || error) return;
    let next: HolderFixture;
    try {
      const current = readHolderFixture(window.localStorage.getItem(HOLDER_FIXTURE_KEY));
      next = reduceBookingFixture(current, action);
    } catch {
      setWriteError("This action is not available for the current booking state. No new action has been completed. Reload the latest booking state before trying again.");
      return;
    }
    try {
      window.localStorage.setItem(HOLDER_FIXTURE_KEY, JSON.stringify(next));
    } catch {
      setWriteError("Your booking state could not be saved. No new action has been completed. Retry when browser storage is available.");
      return;
    }
    navigate(destination, next);
    announce();
  }

  function setStep(next: XcStep) {
    const actions: Partial<Record<XcStep, BookingAction>> = {
      bobEligibility: { type: "check-eligibility" },
      paymentPending: { type: "begin-payment" },
      opportunityReady: { type: "payment-result", result: "committed" },
      reconciling: { type: "begin-handoff" },
      bobSuccess: { type: "complete-handoff" },
    };
    const action = actions[next];
    if (action) act(action, XC_VIEWS[next]);
    else go(XC_VIEWS[next]);
  }

  return {
    state, facts: continuationOf(state), view, step: resolveXcStep(requested, state),
    ready: raw !== undefined && loaded.state !== null, error, notice, setNotice, go, act, setStep,
    retryState: () => { setWriteError(null); announce(); },
  };
}
