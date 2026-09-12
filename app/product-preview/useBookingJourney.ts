"use client";

import { R3_PROVIDER_KEY } from "./r3-provider-state";
import { assertPublishedProviderAction, providerCheckinWindow } from "./provider-runtime";
import { usePublishedSession } from "./ProviderRuntimeBoundary";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  HOLDER_FIXTURE_EVENT, HOLDER_FIXTURE_KEY, INITIAL_HOLDER_FIXTURE,
  continuationOf, readHolderFixture, reduceBookingFixture,
  resolveXcStep, resolveCompletionView, XC_VIEWS,
} from "./holder-fixture-state";
import type { BookingAction, HolderFixture, XcStep } from "./holder-fixture-state";

const SERVER_SNAPSHOT = () => undefined;
const PENDING_NAVIGATION_GRACE_MS = 250;
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

type PendingView = {
  destination: string;
  from: string;
  fallbackArmed: boolean;
};

/** Same fixture key and event as the holder. No duplicated Bob/provider truth.
 * This adapter is browser-only and is not imported by any server/sponsor route.
 */
export function useBookingJourney() {
  const router = useRouter();
  const published = usePublishedSession();
  const requested = useSearchParams().get("view") ?? "xc-find";
  const raw = useSyncExternalStore(subscribe, snapshot, SERVER_SNAPSHOT);
  // Tracks an in-flight push and gives it one short grace window to land. If
  // the browser is still stuck on `from` after that bounded window, retry the
  // originally resolved destination against the latest persisted facts.
  const pendingView = useRef<PendingView | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [convergeTick, setConvergeTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const loaded = useMemo(() => {
    if (raw === undefined) return { state: null, error: null };
    try { return { state: readHolderFixture(raw), error: null }; }
    catch { return { state: null, error: "Your booking state could not be restored. No new action has been completed." }; }
  }, [raw]);
  const state = loaded.state ?? INITIAL_HOLDER_FIXTURE;
  const resolveRuntime = (target: string, current: HolderFixture) => resolved(target, { ...current, continuation: { ...continuationOf(current), checkinWindow: providerCheckinWindow(current, published) } });
  const displayState = { ...state, continuation: { ...continuationOf(state), checkinWindow: providerCheckinWindow(state, published) } };
  const view = resolved(requested, displayState);
  const error = loaded.error ?? writeError;

  useEffect(() => {
    const pending = pendingView.current;
    if (pending !== null) {
      if (requested === pending.destination) {
        pendingView.current = null; // push landed
      } else if (requested === pending.from) {
        if (!pending.fallbackArmed) {
          // Give the original push a bounded chance to land. A timeout rather
          // than an immediate replace avoids fighting an in-flight Next/RSC
          // navigation, while guaranteeing a cancelled push gets another pass.
          pending.fallbackArmed = true;
          const timer = window.setTimeout(
            () => setConvergeTick((tick) => tick + 1),
            PENDING_NAVIGATION_GRACE_MS,
          );
          return () => window.clearTimeout(timer);
        }
        // The push did not land within the grace window. Resolve the intended
        // destination again from the latest facts so route-only navigation also
        // converges and a stale target can never manufacture authority.
        pendingView.current = null;
        if (!loaded.state || error) return;
        const fallbackDestination = resolveRuntime(pending.destination, loaded.state);
        if (fallbackDestination !== requested) {
          router.replace(`/product-preview?view=${fallbackDestination}`, { scroll: false });
        }
        return;
      } else {
        // Back/Forward/reload moved somewhere else before the push landed.
        // Drop the stale marker, then defer one pass so an in-flight reload can
        // finish before canonical fact-driven convergence (avoids RSC aborts).
        pendingView.current = null;
        setConvergeTick((tick) => tick + 1);
        return;
      }
    }
    if (!loaded.state || error || requested === view) return;
    router.replace(`/product-preview?view=${view}`, { scroll: false });
  }, [requested, view, loaded.state, error, router, convergeTick]);

  function navigate(next: string, current: HolderFixture) {
    const destination = resolveRuntime(next, current);
    if (destination === requested) return;
    pendingView.current = { destination, from: requested, fallbackArmed: false };
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
      const p = assertPublishedProviderAction(current, window.localStorage.getItem(R3_PROVIDER_KEY), action);
      if (action.type === "check-in") {
        const original = continuationOf(current);
        next = reduceBookingFixture({ ...current, continuation: { ...original, checkinWindow: providerCheckinWindow(current, p) } }, action);
        next = { ...next, continuation: { ...continuationOf(next), checkinWindow: original.checkinWindow } };
      } else next = reduceBookingFixture(current, action);
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
    state, facts: continuationOf(displayState), view, step: resolveXcStep(requested, state),
    ready: raw !== undefined && loaded.state !== null, error, notice, setNotice, go, act, setStep,
    retryState: () => { setWriteError(null); announce(); },
  };
}
