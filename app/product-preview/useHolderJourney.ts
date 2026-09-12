"use client";

import { R3_PROVIDER_KEY } from "./r3-provider-state";
import { assertPublishedProviderAction } from "./provider-runtime";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  HOLDER_FIXTURE_EVENT, HOLDER_FIXTURE_KEY, INITIAL_HOLDER_FIXTURE,
  holderView, readHolderFixture, reduceHolderFixture, requestedHolderStep, resolveHolderStep,
} from "./holder-fixture-state";
import type { HolderAction, HolderFixture, Minimum, Offer, Step } from "./holder-fixture-state";

const UNAVAILABLE = "!holder-fixture-storage-unavailable!";
const SERVER_SNAPSHOT = () => undefined;

function snapshot(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage.getItem(HOLDER_FIXTURE_KEY); }
  catch { return UNAVAILABLE; }
}

function subscribe(listener: () => void) {
  const storageListener = (event: StorageEvent) => {
    if (event.key === HOLDER_FIXTURE_KEY || event.key === null) listener();
  };
  window.addEventListener(HOLDER_FIXTURE_EVENT, listener);
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(HOLDER_FIXTURE_EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}

function announce() { window.dispatchEvent(new Event(HOLDER_FIXTURE_EVENT)); }

/** Browser-only fixture adapter. No route, server handler or sponsor may use this as authority. */
export function useHolderJourney() {
  const router = useRouter();
  const view = useSearchParams().get("view");
  const raw = useSyncExternalStore(subscribe, snapshot, SERVER_SNAPSHOT);
  const [notice, setNotice] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const pendingView = useRef<string | null>(null);
  const loaded = useMemo(() => {
    if (raw === undefined) return { state: null, error: null };
    try { return { state: readHolderFixture(raw), error: null }; }
    catch { return { state: null, error: "Your booking state could not be restored. No new action has been completed." }; }
  }, [raw]);
  const state = loaded.state ?? INITIAL_HOLDER_FIXTURE;
  const step = resolveHolderStep(view, state);
  const error = loaded.error ?? writeError;

  useEffect(() => {
    if (pendingView.current !== null) {
      if ((view ?? "") === pendingView.current) pendingView.current = null;
      else return;
    }
    if (!loaded.state || error || requestedHolderStep(view) === step) return;
    const canonical = holderView(step, loaded.state);
    router.replace(`/product-preview${canonical ? `?view=${canonical}` : ""}`, { scroll: false });
  }, [view, step, loaded.state, error, router]);

  function navigate(next: Step, current: HolderFixture = state as HolderFixture) {
    const requested = holderView(next, current);
    const safe = resolveHolderStep(requested, current);
    const destination = holderView(safe, current);
    if ((view ?? "") === destination) return;
    pendingView.current = destination;
    router.push(`/product-preview${destination ? `?view=${destination}` : ""}`, { scroll: true });
  }

  function dispatch(action: HolderAction, destination?: Step): HolderFixture | null {
    if (!loaded.state || error) return null;
    try {
      // Read immediately before every action so stale callbacks/double clicks cannot
      // overwrite the last committed result. Save BEFORE showing the next state.
      const current = readHolderFixture(window.localStorage.getItem(HOLDER_FIXTURE_KEY));
      assertPublishedProviderAction(current, window.localStorage.getItem(R3_PROVIDER_KEY), action);
      const next = reduceHolderFixture(current, action);
      window.localStorage.setItem(HOLDER_FIXTURE_KEY, JSON.stringify(next));
      if (destination) navigate(destination, next);
      announce();
      return next;
    } catch {
      setWriteError("Your booking state could not be saved. No new action has been completed. Retry when browser storage is available.");
      return null;
    }
  }

  function setStep(next: Step) {
    if (!loaded.state || error) return;
    try { navigate(next, readHolderFixture(window.localStorage.getItem(HOLDER_FIXTURE_KEY))); }
    catch { setWriteError("Your booking state could not be restored. No new action has been completed."); }
  }

  const activeMinimum: Minimum = state.activeMinimum ?? 40;
  return {
    fixtureState: state,
    ready: raw !== undefined && loaded.state !== null,
    error,
    retryState: () => { setWriteError(null); announce(); },
    step, setStep, notice, setNotice,
    confirmedScope: state.confirmedScope,
    setConfirmedScope: (value: boolean) => { dispatch({ type: "acknowledge", value }); },
    activeMinimum,
    recoveryIsActive: state.activeMinimum !== null,
    approvalPending: state.approvalStatus === "waiting",
    recoveryStopped: state.revoked,
    approvalMinimum: state.approvalMinimum,
    setApprovalMinimum: (value: Minimum) => { dispatch({ type: "select-minimum", value }); },
    offerAmount: state.offerAmount,
    setOfferAmount: (amount: Offer) => { dispatch({ type: "offer", amount }); },
    recovered: state.holder !== "maya",
    recoveredAmount: state.recoveredAmount,
    isReplacementApproval: state.activeMinimum !== null && state.approvalMinimum !== state.activeMinimum,
    startApproval: () => { dispatch({ type: "begin-approval" }, "ledgerWaiting"); },
    cancelApproval: () => { dispatch({ type: "approval-result", result: "cancelled" }, "ledgerCancelled"); },
    approveCurrentMandate: () => { dispatch({ type: "approval-result", result: "approved" }, "ledgerApproved"); },
    completeRecovery: () => { dispatch({ type: "recover" }, "recoverySuccess"); },
    showLatestOffer: () => {
      const next = dispatch({ type: "offer", amount: 32 });
      if (next) navigate(next.activeMinimum !== null && next.activeMinimum <= 32 ? "offerAllowed" : "offerBlocked", next);
    },
    returnToActiveRecovery: () => {
      const next = dispatch({ type: "select-minimum", value: activeMinimum });
      if (next) navigate("recoveryActive", next);
    },
    stopRecovery: () => {
      const next = dispatch({ type: "revoke" }, "detail");
      if (next) setNotice("Recovery stopped. Friday Yoga remains yours and no further offers will be accepted.");
    },
  };
}
