/**
 * #44 R1a: persisted HOLDER UX fixture, never production authority.
 * No backend, wallet, signer, network or personal identifier belongs here.
 * Navigation is deliberately absent from the reducer: a URL cannot approve,
 * recover, revoke or restore ownership. Other actor clients are not wired yet.
 */
export const HOLDER_FIXTURE_KEY = "yourturn:product-preview:holder:v1";
export const HOLDER_FIXTURE_EVENT = "yourturn:holder-fixture-changed";
export type Minimum = 30 | 40;
export type Offer = 32 | 45;
export type ApprovalStatus = "idle" | "waiting" | "approved" | "rejected" | "cancelled";
export type Step = "enter" | "bookings" | "detail" | "plans" | "setup" | "approval" |
  "ledgerNotReady" | "ledgerWaiting" | "ledgerRejected" | "ledgerCancelled" |
  "ledgerApproved" | "recoveryActive" | "offerBlocked" | "reauthorize" |
  "offerAllowed" | "recoverySuccess";

export type HolderFixture = {
  schemaVersion: 1;
  evidenceClass: "FIXTURE";
  booking: "friday-yoga";
  revision: number;
  holder: "maya" | "bob";
  confirmedScope: boolean;
  activeMinimum: Minimum | null;
  approvalMinimum: Minimum;
  approvalStatus: ApprovalStatus;
  offerAmount: Offer;
  recoveredAmount: 0 | Offer;
  settlementCount: 0 | 1;
  revoked: boolean;
};

export const INITIAL_HOLDER_FIXTURE: Readonly<HolderFixture> = Object.freeze({
  schemaVersion: 1, evidenceClass: "FIXTURE", booking: "friday-yoga", revision: 0,
  holder: "maya", confirmedScope: false, activeMinimum: null, approvalMinimum: 40,
  approvalStatus: "idle", offerAmount: 32, recoveredAmount: 0, settlementCount: 0,
  revoked: false,
});

export type HolderAction =
  | { type: "acknowledge"; value: boolean }
  | { type: "select-minimum"; value: Minimum }
  | { type: "begin-approval" }
  | { type: "approval-result"; result: "approved" | "rejected" | "cancelled" }
  | { type: "offer"; amount: Offer }
  | { type: "recover" }
  | { type: "revoke" };

const isMinimum = (n: unknown): n is Minimum => n === 30 || n === 40;
const isOffer = (n: unknown): n is Offer => n === 32 || n === 45;

export function isHolderFixture(value: unknown): value is HolderFixture {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as HolderFixture;
  if (Object.keys(s).length !== Object.keys(INITIAL_HOLDER_FIXTURE).length) return false;
  if (s.schemaVersion !== 1 || s.evidenceClass !== "FIXTURE" || s.booking !== "friday-yoga" ||
      !Number.isSafeInteger(s.revision) || s.revision < 0 ||
      !["maya", "bob"].includes(s.holder) || typeof s.confirmedScope !== "boolean" ||
      !(s.activeMinimum === null || isMinimum(s.activeMinimum)) ||
      !isMinimum(s.approvalMinimum) || !isOffer(s.offerAmount) ||
      !["idle", "waiting", "approved", "rejected", "cancelled"].includes(s.approvalStatus) ||
      !(s.recoveredAmount === 0 || isOffer(s.recoveredAmount)) ||
      !(s.settlementCount === 0 || s.settlementCount === 1) || typeof s.revoked !== "boolean") return false;
  // Reject corrupt combinations instead of silently reinitializing ownership.
  if (s.holder === "bob") {
    return s.settlementCount === 1 && s.recoveredAmount > 0 &&
      s.activeMinimum === null && ["approved", "rejected", "cancelled"].includes(s.approvalStatus) && !s.revoked;
  }
  if (s.settlementCount !== 0 || s.recoveredAmount !== 0) return false;
  if (s.revoked && s.activeMinimum !== null) return false;
  if (s.activeMinimum !== null && !s.confirmedScope) return false;
  if (s.approvalStatus === "waiting" && !s.confirmedScope) return false;
  return true;
}

export function readHolderFixture(raw: string | null): HolderFixture {
  if (raw === null) return { ...INITIAL_HOLDER_FIXTURE };
  const value: unknown = JSON.parse(raw);
  if (!isHolderFixture(value)) throw new Error("Stored preview booking state is invalid");
  return value;
}

export function reduceHolderFixture(state: HolderFixture, action: HolderAction): HolderFixture {
  if (!isHolderFixture(state)) throw new Error("Invalid preview booking state");
  let change: Partial<HolderFixture> = {};
  switch (action.type) {
    case "acknowledge":
      if (state.activeMinimum !== null || state.approvalStatus === "waiting" || state.holder !== "maya") return state;
      change = { confirmedScope: action.value };
      break;
    case "select-minimum":
      if (!isMinimum(action.value) || state.holder !== "maya") throw new Error("Invalid recovery minimum");
      if (state.approvalStatus === "waiting") return state;
      if (action.value === 30 && state.activeMinimum === null) throw new Error("A replacement requires an active mandate");
      change = { approvalMinimum: action.value };
      break;
    case "begin-approval":
      if (state.holder !== "maya" || !state.confirmedScope) throw new Error("Acknowledge the booking scope first");
      if (state.approvalStatus === "waiting") return state;
      if (state.activeMinimum === state.approvalMinimum) return state;
      change = { approvalStatus: "waiting" };
      break;
    case "approval-result":
      if (state.approvalStatus !== "waiting" || state.holder !== "maya") return state;
      change = action.result === "approved"
        ? { approvalStatus: "approved", activeMinimum: state.approvalMinimum, revoked: false }
        : { approvalStatus: action.result };
      break;
    case "offer":
      if (!isOffer(action.amount) || state.activeMinimum === null || state.holder !== "maya" || state.revoked) {
        throw new Error("No active recovery can evaluate this offer");
      }
      change = { offerAmount: action.amount };
      break;
    case "recover":
      if (state.settlementCount === 1) return state;
      if (state.holder !== "maya" || state.activeMinimum === null || state.revoked ||
          state.offerAmount < state.activeMinimum) {
        throw new Error("Recovery is outside the current preview mandate");
      }
      change = { holder: "bob", activeMinimum: null, recoveredAmount: state.offerAmount,
        settlementCount: 1, approvalStatus: state.approvalStatus === "waiting" ? "cancelled" : state.approvalStatus };
      break;
    case "revoke":
      if (state.holder !== "maya" || state.activeMinimum === null) return state;
      change = { activeMinimum: null, revoked: true,
        approvalStatus: state.approvalStatus === "waiting" ? "cancelled" : state.approvalStatus };
      break;
    default:
      throw new Error("Unknown preview action");
  }
  const unchanged = Object.entries(change).every(([key, value]) => state[key as keyof HolderFixture] === value);
  if (unchanged) return state;
  const next = { ...state, ...change, revision: state.revision + 1 };
  if (!isHolderFixture(next)) throw new Error("Invalid preview transition");
  return next;
}

const STEP_VIEWS: Record<Step, string> = {
  enter: "", bookings: "bookings", detail: "booking-detail", plans: "change-plans",
  setup: "recovery-setup", approval: "approval", ledgerNotReady: "ledger-not-ready",
  ledgerWaiting: "ledger-waiting", ledgerRejected: "ledger-rejected", ledgerCancelled: "ledger-cancelled",
  ledgerApproved: "ledger-approved", recoveryActive: "recovery-active", offerBlocked: "offer-blocked",
  reauthorize: "reauthorize", offerAllowed: "offer-allowed", recoverySuccess: "recovery-success",
};

export function holderView(step: Step, state: HolderFixture): string {
  if ((step === "ledgerRejected" || step === "ledgerCancelled") &&
      state.activeMinimum !== null && state.approvalMinimum !== state.activeMinimum) {
    return `replacement-${STEP_VIEWS[step]}`;
  }
  return STEP_VIEWS[step];
}

export function requestedHolderStep(view: string | null): Step {
  if (view === "replacement-ledger-rejected") return "ledgerRejected";
  if (view === "replacement-ledger-cancelled") return "ledgerCancelled";
  return (Object.keys(STEP_VIEWS) as Step[]).find((step) => STEP_VIEWS[step] === (view ?? "")) ?? "enter";
}

/** Read-only projection. Calling this with a forged/stale URL never mutates facts. */
export function resolveHolderStep(view: string | null, state: HolderFixture): Step {
  const requested = requestedHolderStep(view);
  if (state.holder !== "maya") return requested === "recoverySuccess" ? requested : "bookings";
  if (requested === "recoverySuccess") return "bookings";
  if (requested === "ledgerWaiting") return state.approvalStatus === "waiting" ? requested :
    state.approvalStatus === "rejected" ? "ledgerRejected" :
    state.approvalStatus === "cancelled" ? "ledgerCancelled" :
    state.activeMinimum !== null ? "recoveryActive" : "approval";
  if (requested === "ledgerApproved" && (state.approvalStatus !== "approved" || state.activeMinimum === null)) return "bookings";
  if (requested === "ledgerRejected" && state.approvalStatus !== "rejected") return "bookings";
  if (requested === "ledgerCancelled" && state.approvalStatus !== "cancelled") return "bookings";
  if (["recoveryActive", "offerBlocked", "offerAllowed", "reauthorize"].includes(requested)) {
    if (state.activeMinimum === null || state.revoked) return "bookings";
    if (requested === "offerAllowed" && state.offerAmount < state.activeMinimum) return "offerBlocked";
  }
  if ((requested === "approval" || requested === "ledgerNotReady") && state.approvalStatus !== "waiting" &&
      state.activeMinimum !== null && state.approvalMinimum === state.activeMinimum) return "recoveryActive";
  return requested;
}
