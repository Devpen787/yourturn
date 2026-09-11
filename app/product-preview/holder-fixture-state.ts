/**
 * #44: one persisted booking UX fixture, never production authority.
 * No backend, wallet, signer, network or personal identifier belongs here.
 * Navigation is absent from the reducers: a URL cannot approve, recover,
 * revoke, record attendance or restore ownership. The optional continuation
 * extends the R1a record in place; it is NOT a second actor-specific store.
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

export type Continuation = {
  version: 1;
  eligibility: "unchecked" | "eligible" | "ineligible";
  availability: "available" | "taken";
  payment: "idle" | "pending" | "committed" | "error";
  paymentAttempts: number;
  handoff: "idle" | "checking" | "unknown" | "complete";
  providerPolicy: "allowed" | "blocked";
  holderRead: "current" | "stale";
  attendance: "none" | "checked-in" | "error";
  attendanceCount: 0 | 1;
  fulfilment: "none" | "fulfilled";
  reconciliation: "pending" | "issue" | "complete";
  checkinWindow: "before" | "open" | "closed";
};

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
  continuation?: Continuation;
};

export const INITIAL_HOLDER_FIXTURE: Readonly<HolderFixture> = Object.freeze({
  schemaVersion: 1, evidenceClass: "FIXTURE", booking: "friday-yoga", revision: 0,
  holder: "maya", confirmedScope: false, activeMinimum: null, approvalMinimum: 40,
  approvalStatus: "idle", offerAmount: 32, recoveredAmount: 0, settlementCount: 0,
  revoked: false,
});

const INITIAL_CONTINUATION: Readonly<Continuation> = Object.freeze({
  version: 1, eligibility: "unchecked", availability: "available", payment: "idle",
  paymentAttempts: 0, handoff: "idle", providerPolicy: "allowed", holderRead: "current",
  attendance: "none", attendanceCount: 0, fulfilment: "none", reconciliation: "pending",
  checkinWindow: "before",
});

export function continuationOf(state: HolderFixture): Continuation {
  if (state.continuation) return state.continuation;
  return state.holder === "bob"
    ? { ...INITIAL_CONTINUATION, eligibility: "eligible", payment: "committed", handoff: "complete" }
    : { ...INITIAL_CONTINUATION };
}

export type HolderAction =
  | { type: "acknowledge"; value: boolean }
  | { type: "select-minimum"; value: Minimum }
  | { type: "begin-approval" }
  | { type: "approval-result"; result: "approved" | "rejected" | "cancelled" }
  | { type: "offer"; amount: Offer }
  | { type: "recover" }
  | { type: "revoke" };

export type BookingAction = HolderAction |
  { type: "check-eligibility" } |
  { type: "begin-payment" } |
  { type: "payment-result"; result: "committed" | "error" } |
  { type: "begin-handoff" } |
  { type: "complete-handoff" } |
  { type: "check-in" } |
  { type: "reconcile" };

const isMinimum = (n: unknown): n is Minimum => n === 30 || n === 40;
const isOffer = (n: unknown): n is Offer => n === 32 || n === 45;
const oneOf = (value: unknown, values: readonly unknown[]) => values.includes(value);

function isContinuation(value: unknown, state: HolderFixture): value is Continuation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Continuation;
  if (Object.keys(c).length !== Object.keys(INITIAL_CONTINUATION).length ||
      c.version !== 1 || !oneOf(c.eligibility, ["unchecked", "eligible", "ineligible"]) ||
      !oneOf(c.availability, ["available", "taken"]) || !oneOf(c.payment, ["idle", "pending", "committed", "error"]) ||
      !Number.isSafeInteger(c.paymentAttempts) || c.paymentAttempts < 0 ||
      !oneOf(c.handoff, ["idle", "checking", "unknown", "complete"]) ||
      !oneOf(c.providerPolicy, ["allowed", "blocked"]) || !oneOf(c.holderRead, ["current", "stale"]) ||
      !oneOf(c.attendance, ["none", "checked-in", "error"]) || !oneOf(c.attendanceCount, [0, 1]) ||
      !oneOf(c.fulfilment, ["none", "fulfilled"]) || !oneOf(c.reconciliation, ["pending", "issue", "complete"]) ||
      !oneOf(c.checkinWindow, ["before", "open", "closed"])) return false;
  if ((c.attendance === "checked-in") !== (c.attendanceCount === 1)) return false;
  if (c.payment === "pending" && (c.paymentAttempts < 1 || c.eligibility !== "eligible")) return false;
  if ((c.handoff === "checking" || c.handoff === "unknown") && c.payment !== "committed") return false;
  if (state.holder === "bob" && (c.payment !== "committed" || c.handoff !== "complete")) return false;
  if (state.holder === "maya" && (c.handoff === "complete" || c.attendanceCount !== 0 || c.fulfilment !== "none")) return false;
  if (c.fulfilment === "fulfilled" && c.attendanceCount !== 1) return false;
  if (c.reconciliation === "complete" && (state.settlementCount !== 1 || c.fulfilment !== "fulfilled")) return false;
  return true;
}

export function isHolderFixture(value: unknown): value is HolderFixture {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as HolderFixture;
  const allowedKeys = [...Object.keys(INITIAL_HOLDER_FIXTURE), "continuation"];
  if (Object.keys(s).some((key) => !allowedKeys.includes(key))) return false;
  if (Object.keys(s).length !== Object.keys(INITIAL_HOLDER_FIXTURE).length + ("continuation" in s ? 1 : 0)) return false;
  if (s.schemaVersion !== 1 || s.evidenceClass !== "FIXTURE" || s.booking !== "friday-yoga" ||
      !Number.isSafeInteger(s.revision) || s.revision < 0 ||
      !["maya", "bob"].includes(s.holder) || typeof s.confirmedScope !== "boolean" ||
      !(s.activeMinimum === null || isMinimum(s.activeMinimum)) ||
      !isMinimum(s.approvalMinimum) || !isOffer(s.offerAmount) ||
      !["idle", "waiting", "approved", "rejected", "cancelled"].includes(s.approvalStatus) ||
      !(s.recoveredAmount === 0 || isOffer(s.recoveredAmount)) ||
      !(s.settlementCount === 0 || s.settlementCount === 1) || typeof s.revoked !== "boolean") return false;
  if ("continuation" in s && !isContinuation(s.continuation, s)) return false;
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
      if (state.holder !== "maya" || state.activeMinimum === null || state.revoked || state.offerAmount < state.activeMinimum) {
        throw new Error("Recovery is outside the current preview mandate");
      }
      change = { holder: "bob", activeMinimum: null, recoveredAmount: state.offerAmount,
        settlementCount: 1, approvalStatus: state.approvalStatus === "waiting" ? "cancelled" : state.approvalStatus };
      if (state.continuation) {
        const c = state.continuation;
        if (c.payment !== "committed" || c.eligibility !== "eligible" ||
            c.availability !== "available" || c.providerPolicy !== "allowed" || c.holderRead !== "current") {
          throw new Error("The same booking's payment, eligibility and provider rules must agree");
        }
        change.continuation = { ...c, handoff: "complete" };
      }
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

function updateContinuation(state: HolderFixture, change: Partial<Continuation>): HolderFixture {
  const c = continuationOf(state);
  if (Object.entries(change).every(([key, value]) => c[key as keyof Continuation] === value)) return state;
  const next = { ...state, continuation: { ...c, ...change }, revision: state.revision + 1 };
  if (!isHolderFixture(next)) throw new Error("Invalid booking continuation");
  return next;
}

export function reduceBookingFixture(state: HolderFixture, action: BookingAction): HolderFixture {
  if (!isHolderFixture(state)) throw new Error("Invalid preview booking state");
  const c = continuationOf(state);
  switch (action.type) {
    case "check-eligibility":
      if (state.holder === "bob") return state;
      return updateContinuation(state, { eligibility: c.eligibility === "ineligible" ? "ineligible" : "eligible" });
    case "begin-payment":
      if (state.holder === "bob" || c.payment === "committed" || c.payment === "pending") return state;
      if (c.eligibility !== "eligible" || c.availability !== "available" ||
          c.providerPolicy !== "allowed" || c.holderRead !== "current") throw new Error("Booking is not available for a payment commitment");
      return updateContinuation(state, { payment: "pending", paymentAttempts: c.paymentAttempts + 1 });
    case "payment-result":
      if (c.payment !== "pending" || state.holder !== "maya") return state;
      return updateContinuation(state, { payment: action.result });
    case "begin-handoff":
      if (state.holder === "bob") return state;
      if (c.payment !== "committed") throw new Error("Payment commitment is not confirmed");
      return updateContinuation(state, { handoff: c.holderRead === "stale" ? "unknown" : "checking" });
    case "complete-handoff": {
      if (state.settlementCount === 1) return state;
      if (c.payment !== "committed" || !["checking", "unknown"].includes(c.handoff)) throw new Error("Handoff is not ready");
      if (c.holderRead !== "current") return updateContinuation(state, { handoff: "unknown" });
      return reduceHolderFixture(reduceHolderFixture(state, { type: "offer", amount: 45 }), { type: "recover" });
    }
    case "check-in":
      if (state.holder !== "bob" || state.settlementCount !== 1 || c.holderRead !== "current" || c.checkinWindow !== "open") {
        throw new Error("The current holder and check-in window must be confirmed");
      }
      if (c.attendanceCount === 1) return state;
      return updateContinuation(state, { attendance: "checked-in", attendanceCount: 1 });
    case "reconcile":
      if (state.settlementCount !== 1 || c.holderRead !== "current" || c.attendanceCount !== 1 || c.fulfilment !== "fulfilled") {
        throw new Error("Fulfilment and recovery are not both confirmed");
      }
      return updateContinuation(state, { reconciliation: "complete" });
    default:
      return reduceHolderFixture(state, action);
  }
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

export type XcStep = "providerPolicy" | "providerBlocked" | "bobFind" | "bobEligibility" |
  "bobEligibilityFailed" | "bobTaken" | "paymentPending" | "paymentError" |
  "opportunityReady" | "reconciling" | "partialUnknown" | "bobSuccess" | "providerFinal";
export const XC_VIEWS: Record<XcStep, string> = {
  providerPolicy: "xc-provider-policy", providerBlocked: "xc-provider-blocked", bobFind: "xc-find",
  bobEligibility: "xc-eligibility", bobEligibilityFailed: "xc-eligibility-failed", bobTaken: "xc-taken",
  paymentPending: "xc-payment-pending", paymentError: "xc-payment-error", opportunityReady: "xc-opportunity",
  reconciling: "xc-reconciling", partialUnknown: "xc-partial", bobSuccess: "xc-bob-success", providerFinal: "xc-provider-final",
};

export function resolveXcStep(view: string | null, state: HolderFixture): XcStep {
  const c = continuationOf(state);
  if (view?.startsWith("xc-provider")) {
    if (view === "xc-provider-final" && state.holder === "bob") return "providerFinal";
    return c.providerPolicy === "blocked" && view !== "xc-provider-policy" ? "providerBlocked" : "providerPolicy";
  }
  if (state.holder === "bob") return "bobSuccess";
  if (c.payment === "pending") return "paymentPending";
  if (c.payment === "error") return "paymentError";
  if (c.payment === "committed") {
    if (c.handoff === "unknown" || c.holderRead === "stale") return "partialUnknown";
    if (c.handoff === "checking") return "reconciling";
    return "opportunityReady";
  }
  if (c.availability === "taken") return "bobTaken";
  if (c.eligibility === "ineligible") return "bobEligibilityFailed";
  if (view === "xc-eligibility" && c.eligibility === "eligible") return "bobEligibility";
  return "bobFind";
}

export function resolveCompletionView(view: string | null, state: HolderFixture): string {
  const c = continuationOf(state);
  if (view?.startsWith("xc2-provider")) {
    if (state.holder !== "bob") return "xc2-provider-unavailable";
    if (c.holderRead === "stale") return "xc2-provider-reconcile-issue";
    if (view === "xc2-provider-history" && c.reconciliation === "complete") return view;
    if (view?.startsWith("xc2-provider-reconcile")) {
      if (c.reconciliation === "complete") return "xc2-provider-reconciled";
      if (c.reconciliation === "issue") return "xc2-provider-reconcile-issue";
    }
    return c.fulfilment === "fulfilled" ? "xc2-provider-fulfilled" : "xc2-provider-pending";
  }
  if (view?.startsWith("xc2-maya") || view === "xc2-history-partial") {
    if (state.settlementCount !== 1) return "xc2-maya-unavailable";
    if (view === "xc2-history-partial" && c.reconciliation !== "complete") return view;
    return "xc2-maya-history";
  }
  if (state.holder !== "bob") return "xc2-bob-unavailable";
  if (c.holderRead === "stale") return "xc2-bob-stale-holder";
  if (c.attendance === "checked-in") return view === "xc2-bob-history" ? view : "xc2-bob-checked-in";
  if (c.attendance === "error") return "xc2-bob-checkin-error";
  return c.checkinWindow === "open" ? "xc2-bob-ready" : "xc2-bob-not-open";
}
