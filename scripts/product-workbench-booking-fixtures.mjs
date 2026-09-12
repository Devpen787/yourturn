// #44 test-only preconditions for the one persisted Friday Yoga lifecycle.
// These helpers seed facts before navigation; URLs never create payment,
// ownership, attendance or fulfilment outcomes. A seed is installed only when
// storage is empty so reload/history can prove committed facts survive.
const key = "yourturn:product-preview:holder:v1";

const base = {
  schemaVersion: 1,
  evidenceClass: "FIXTURE",
  booking: "friday-yoga",
  revision: 20,
  holder: "maya",
  confirmedScope: true,
  activeMinimum: 40,
  approvalMinimum: 40,
  approvalStatus: "approved",
  offerAmount: 32,
  recoveredAmount: 0,
  settlementCount: 0,
  revoked: false,
};

const continuation = {
  version: 1,
  eligibility: "unchecked",
  availability: "available",
  payment: "idle",
  paymentAttempts: 0,
  handoff: "idle",
  providerPolicy: "allowed",
  holderRead: "current",
  attendance: "none",
  attendanceCount: 0,
  fulfilment: "none",
  reconciliation: "pending",
  checkinWindow: "before",
};

export function bookingFixture(overrides = {}, continuationOverrides = {}) {
  const state = { ...base, ...overrides };
  state.continuation = { ...continuation, ...continuationOverrides };
  return state;
}

export function pendingPaymentFixture() {
  return bookingFixture({}, { eligibility: "eligible", payment: "pending", paymentAttempts: 1 });
}

export function paymentErrorFixture() {
  return bookingFixture({}, { eligibility: "eligible", payment: "error", paymentAttempts: 1 });
}

export function committedPaymentFixture(handoff = "idle") {
  return bookingFixture({}, { eligibility: "eligible", payment: "committed", paymentAttempts: 1, handoff });
}

export function bobFixture(continuationOverrides = {}) {
  return bookingFixture(
    {
      holder: "bob",
      activeMinimum: null,
      offerAmount: 45,
      recoveredAmount: 45,
      settlementCount: 1,
    },
    {
      eligibility: "eligible",
      payment: "committed",
      paymentAttempts: 1,
      handoff: "complete",
      ...continuationOverrides,
    },
  );
}

export async function seededContext(browser, viewport, fixture) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ storageKey, state }) => {
    if (localStorage.getItem(storageKey) === null) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, { storageKey: key, state: fixture });
  return context;
}

export async function seedPage(page, fixture) {
  await page.addInitScript(({ storageKey, state }) => {
    if (localStorage.getItem(storageKey) === null) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, { storageKey: key, state: fixture });
}

export async function storedFixture(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key);
}
