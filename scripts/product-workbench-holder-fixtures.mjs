// Test-only fixture preconditions. URLs select locations, never create authority.
// Isolated contexts keep direct-state evidence from mutating the clicked journey.
export async function rejectedHolderContext(browser, viewport, replacement = false) {
  const context = await browser.newContext({ viewport });
  const state = {
    schemaVersion: 1, evidenceClass: "FIXTURE", booking: "friday-yoga", revision: 1,
    holder: "maya", confirmedScope: true, activeMinimum: replacement ? 40 : null,
    approvalMinimum: replacement ? 30 : 40, approvalStatus: "rejected",
    offerAmount: 32, recoveredAmount: 0, settlementCount: 0, revoked: false,
  };
  await context.addInitScript((fixture) => {
    const key = "yourturn:product-preview:holder:v1";
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(fixture));
  }, state);
  return context;
}
