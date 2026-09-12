export const R3_PROVIDER_KEY = "yourturn:product-preview:provider-config:v1";
export const R3_PROVIDER_EVENT = "yourturn:r3-provider-config-changed";

export type ProviderDraft = {
  sessionTitle: string;
  startTime: string;
  capacity: string;
  transferCutoff: string;
  eligibilityRule: string;
};

export type ProviderPublished = Omit<ProviderDraft, "capacity"> & { capacity: number };

export type R3ProviderState = {
  schemaVersion: 1;
  evidenceClass: "FIXTURE";
  booking: "friday-yoga";
  revision: number;
  draft: ProviderDraft;
  published: ProviderPublished;
  lastSave: "idle" | "saved" | "error";
  saveMode: "normal" | "fail-once";
  lastError: string | null;
};

export const R3_PROVIDER_INITIAL: Readonly<R3ProviderState> = Object.freeze({
  schemaVersion: 1,
  evidenceClass: "FIXTURE",
  booking: "friday-yoga",
  revision: 0,
  draft: {
    sessionTitle: "Friday Yoga",
    startTime: "18:00",
    capacity: "12",
    transferCutoff: "17:30",
    eligibilityRule: "Eligible Studio A customer · no duplicate session",
  },
  published: {
    sessionTitle: "Friday Yoga",
    startTime: "18:00",
    capacity: 12,
    transferCutoff: "17:30",
    eligibilityRule: "Eligible Studio A customer · no duplicate session",
  },
  lastSave: "idle",
  saveMode: "normal",
  lastError: null,
});

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const clean = (value: string) => value.trim().replace(/\s+/g, " ");

export function validateProviderDraft(draft: ProviderDraft): string[] {
  const errors: string[] = [];
  if (clean(draft.sessionTitle) !== "Friday Yoga") errors.push("Session identity must remain Friday Yoga.");
  if (!timePattern.test(draft.startTime)) errors.push("Start time must use HH:MM.");
  const capacity = Number(draft.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) errors.push("Capacity must be a whole number from 1 to 99.");
  if (!timePattern.test(draft.transferCutoff)) errors.push("Transfer cutoff must use HH:MM.");
  if (clean(draft.eligibilityRule).length < 8) errors.push("Eligibility rule is too short.");
  return errors;
}

export function providerDraftIsDirty(state: R3ProviderState): boolean {
  return clean(state.draft.sessionTitle) !== state.published.sessionTitle ||
    state.draft.startTime !== state.published.startTime ||
    Number(state.draft.capacity) !== state.published.capacity ||
    state.draft.transferCutoff !== state.published.transferCutoff ||
    clean(state.draft.eligibilityRule) !== state.published.eligibilityRule;
}

export function isR3ProviderState(value: unknown): value is R3ProviderState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as R3ProviderState;
  if (s.schemaVersion !== 1 || s.evidenceClass !== "FIXTURE" || s.booking !== "friday-yoga" ||
      !Number.isSafeInteger(s.revision) || s.revision < 0 || !s.draft || !s.published ||
      !["idle", "saved", "error"].includes(s.lastSave) || !["normal", "fail-once"].includes(s.saveMode) ||
      !(s.lastError === null || typeof s.lastError === "string")) return false;
  const draft = s.draft as ProviderDraft;
  const published = s.published as ProviderPublished;
  if (![draft.sessionTitle, draft.startTime, draft.capacity, draft.transferCutoff, draft.eligibilityRule].every(v => typeof v === "string")) return false;
  if (![published.sessionTitle, published.startTime, published.transferCutoff, published.eligibilityRule].every(v => typeof v === "string")) return false;
  if (!Number.isInteger(published.capacity) || published.capacity < 1 || published.capacity > 99) return false;
  return published.sessionTitle === "Friday Yoga" && timePattern.test(published.startTime) && timePattern.test(published.transferCutoff);
}

export function readR3ProviderState(raw: string | null): R3ProviderState {
  if (raw === null) return structuredClone(R3_PROVIDER_INITIAL);
  const parsed: unknown = JSON.parse(raw);
  if (!isR3ProviderState(parsed)) throw new Error("Stored provider fixture state is invalid");
  return parsed;
}

export type R3ProviderAction =
  | { type: "edit"; field: keyof ProviderDraft; value: string }
  | { type: "arm-save-failure" }
  | { type: "save" };

export function reduceR3ProviderState(state: R3ProviderState, action: R3ProviderAction): R3ProviderState {
  if (!isR3ProviderState(state)) throw new Error("Invalid provider fixture state");
  if (action.type === "edit") {
    const next = { ...state, draft: { ...state.draft, [action.field]: action.value }, lastSave: "idle" as const, lastError: null, revision: state.revision + 1 };
    if (!isR3ProviderState(next)) throw new Error("Invalid provider draft transition");
    return next;
  }
  if (action.type === "arm-save-failure") {
    return { ...state, saveMode: "fail-once", lastSave: "idle", lastError: null, revision: state.revision + 1 };
  }
  const errors = validateProviderDraft(state.draft);
  if (errors.length) return { ...state, lastSave: "error", lastError: errors.join(" "), revision: state.revision + 1 };
  if (state.saveMode === "fail-once") {
    return { ...state, saveMode: "normal", lastSave: "error", lastError: "Studio A changes could not be saved. Published rules are unchanged.", revision: state.revision + 1 };
  }
  const published: ProviderPublished = {
    sessionTitle: "Friday Yoga",
    startTime: state.draft.startTime,
    capacity: Number(state.draft.capacity),
    transferCutoff: state.draft.transferCutoff,
    eligibilityRule: clean(state.draft.eligibilityRule),
  };
  const next = { ...state, published, lastSave: "saved" as const, lastError: null, revision: state.revision + 1 };
  if (!isR3ProviderState(next)) throw new Error("Invalid published provider state");
  return next;
}
