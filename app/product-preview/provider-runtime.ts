import { continuationOf } from "./holder-fixture-state";
import type { BookingAction, HolderFixture } from "./holder-fixture-state";
import { readR3ProviderState } from "./r3-provider-state";
import type { ProviderPublished } from "./r3-provider-state";

export const ELIGIBILITY_RULE = "Eligible Studio A customer · no duplicate session";
export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const clockLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

// Existing reviewer fixture phases anchor one fixed Friday clock. Publishing a
// different session time does not move that clock or rewrite the holder mandate.
export function scenarioMinute(state: HolderFixture): number {
  return { before: 17 * 60, open: 17 * 60 + 45, closed: 18 * 60 + 31 }[continuationOf(state).checkinWindow];
}
export function providerCheckinWindow(state: HolderFixture, p: ProviderPublished) {
  const now = scenarioMinute(state), start = minutes(p.startTime);
  return now < start - 30 ? "before" as const : now > start + 30 ? "closed" as const : "open" as const;
}
export function providerRecoveryAllowed(state: HolderFixture, p: ProviderPublished) {
  return continuationOf(state).providerPolicy === "allowed" &&
    p.eligibilityRule === ELIGIBILITY_RULE && scenarioMinute(state) < minutes(p.transferCutoff);
}
export function assertPublishedProviderAction(state: HolderFixture, raw: string | null, action: BookingAction) {
  const p = readR3ProviderState(raw).published;
  if (state.settlementCount === 0 && ["check-eligibility", "begin-payment", "payment-result", "begin-handoff", "complete-handoff", "recover"].includes(action.type) &&
      !providerRecoveryAllowed(state, p)) throw new Error("Published Studio A rules do not permit recovery at the current scenario time.");
  if (action.type === "check-in" && providerCheckinWindow(state, p) !== "open") throw new Error("The published session check-in window is not open.");
  return p;
}
