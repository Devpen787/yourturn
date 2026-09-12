import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { bobFixture, seededContext, storedFixture } from "./product-workbench-booking-fixtures.mjs";

const base = new URL(process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000");
assert(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Loopback only");
const key = "yourturn:product-preview:holder:v1";
const out = path.resolve("artifacts/product-workbench/r2-bridges");
const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const results = [];
const browser = await chromium.launch({ headless: true });

async function visible(p, wanted) {
  await p.waitForFunction(w => document.querySelector("main")?.textContent?.includes(w), wanted, { timeout: 7000 });
  assert((await p.locator("main").innerText()).includes(wanted), "Missing visible " + wanted);
}
async function click(p, name, role = "button") {
  await p.locator("main").getByRole(role, { name, exact: true }).click();
}
async function view(p, expected, identity, label) {
  await p.waitForURL(url => url.searchParams.get("view") === expected, { timeout: 7000 });
  const h = await p.locator("header").innerText();
  assert(h.includes(identity) && h.includes(label), "Header and route disagree: " + h);
  const b = await p.locator("header nav a").first().boundingBox();
  assert(b && b.height >= 44, "Header target under 44px");
}
async function entry(p, location) {
  await p.goto(base.origin + "/product-preview?view=" + location, { waitUntil: "networkidle" });
}
async function retained(p, previous) {
  const s = await storedFixture(p);
  if (previous) assert.deepEqual(s, previous, "Navigation changed persisted facts");
  assert.equal(s.booking, "friday-yoga"); assert.equal(s.holder, "bob");
  assert.equal(s.recoveredAmount, 45); assert.equal(s.settlementCount, 1);
  return s;
}
async function history(p, expected, identity, label) {
  const s = await retained(p);
  const length = await p.evaluate(() => history.length);
  await p.goBack({ waitUntil: "networkidle" });
  await view(p, expected, identity, label); await retained(p, s);
  await p.goForward({ waitUntil: "networkidle" });
  await view(p, expected, identity, label); await retained(p, s);
  await p.reload({ waitUntil: "networkidle" });
  await view(p, expected, identity, label); await retained(p, s);
  assert.equal(await p.evaluate(() => history.length), length, "History trap");
}
const checked = (response = "confirmed") => bobFixture({
  version: 2, checkinWindow: "open", attendance: "checked-in", attendanceCount: 1,
  fulfilmentAttempts: 0, fulfilmentCount: 0, fulfilmentResponse: response,
});
async function provider(p) {
  await entry(p, "xc-provider-final");
  await visible(p, "Bob is now the current holder.");
  const before = await retained(p);
  await click(p, "Open today’s bookings");
  await view(p, "xc2-provider-pending", "Studio A", "Today");
  await retained(p, before);
}
const cases = [];
for (const window of ["before", "closed"]) cases.push([
  "B1-" + window, bobFixture({ checkinWindow: window }), async (p, snap) => {
    await entry(p, "xc-bob-success");
    const before = await retained(p);
    const use = p.getByRole("button", { name: "Use booking", exact: true });
    await use.focus(); await p.keyboard.press("Enter");
    await view(p, "xc2-bob-not-open", "Bob", "My bookings");
    await visible(p, window === "before" ? "Opens at 17:30" : "Check-in is closed");
    assert(await p.getByRole("button", { name: "Check in", exact: true }).isDisabled());
    await retained(p, before); await snap(window);
    await p.reload({ waitUntil: "networkidle" }); await retained(p, before);
    await click(p, "Back to my bookings");
    await view(p, "xc-bob-success", "Bob", "My bookings"); await retained(p, before);
  }
]);
cases.push(["B1-open-checkin-return", bobFixture({ checkinWindow: "open" }), async (p, snap) => {
  await entry(p, "xc-bob-success");
  const owned = await retained(p);
  await click(p, "Use booking"); await view(p, "xc2-bob-ready", "Bob", "My bookings");
  await retained(p, owned); await snap("open");
  await click(p, "Check in"); await view(p, "xc2-bob-checked-in", "Bob", "My bookings");
  const used = await retained(p); assert.equal(used.continuation.attendanceCount, 1);
  assert.equal(used.continuation.fulfilment, "none");
  await history(p, "xc2-bob-checked-in", "Bob", "My bookings"); await snap("checked-in");
  await click(p, "Back to my bookings"); await view(p, "xc-bob-success", "Bob", "My bookings");
  await click(p, "Use booking"); await view(p, "xc2-bob-checked-in", "Bob", "My bookings");
  await retained(p, used); assert.equal(await p.getByRole("button", { name: "Check in", exact: true }).count(), 0);
}]);
cases.push(["B1-stale", bobFixture({ checkinWindow: "open", holderRead: "stale" }), async (p, snap) => {
  await entry(p, "xc-bob-success"); await visible(p, "needs confirmation");
  const before = await retained(p);
  await click(p, "Open booking status"); await view(p, "xc2-bob-stale-holder", "Bob", "My bookings");
  await retained(p, before); assert.equal(await p.getByRole("button", { name: "Check in", exact: true }).count(), 0);
  await snap("stale");
}]);
cases.push(["B2-success-and-recovered-item", null, async (p, snap) => {
  // One fresh Maya fixture. All recovery steps are actual controls, including the blocked 32 offer.
  await p.goto(base.origin + "/product-preview", { waitUntil: "networkidle" });
  await click(p, "Open my bookings");
  await p.getByText("View booking →", { exact: true }).click();
  await click(p, "Change plans");
  await p.getByRole("button", { name: /Let YourTurn handle it/ }).click();
  await p.getByRole("checkbox").check();
  for (const name of ["Continue to secure approval", "Approve on secure device", "Connect Ledger", "Check approval status", "View active recovery", "See latest offer"]) await click(p, name);
  await visible(p, "32 USDC was not accepted.");
  await click(p, "Keep looking"); await visible(p, "45 USDC is within your limits.");
  await click(p, "Refresh recovery status"); await visible(p, "You recovered 45 USDC.");
  const recovered = await retained(p);
  await click(p, "View recovery receipt", "link");
  await view(p, "xc2-maya-history", "Maya Keller", "Activity");
  await visible(p, "You recovered 45 USDC"); await visible(p, "Booking fulfilment pending");
  await retained(p, recovered); await snap("receipt-before-attendance");
  await p.goBack({ waitUntil: "networkidle" }); await visible(p, "You recovered 45 USDC.");
  await retained(p, recovered);
  await p.goForward({ waitUntil: "networkidle" }); await view(p, "xc2-maya-history", "Maya Keller", "Activity");
  await p.reload({ waitUntil: "networkidle" }); await retained(p, recovered);
  await click(p, "Back to my bookings", "link"); await view(p, "bookings", "Maya Keller", "My bookings");
  await visible(p, "Recently recovered"); await retained(p, recovered); await snap("recovered-item");
  await click(p, "View recovery receipt", "link"); await view(p, "xc2-maya-history", "Maya Keller", "Activity");
  await visible(p, "You recovered 45 USDC"); await retained(p, recovered);
}]);
const failedService = checked("fail-once");
failedService.continuation.fulfilment = "error";
failedService.continuation.fulfilmentAttempts = 1;
cases.push(["B2-receipt-service-error", failedService, async (p, snap) => {
  // Isolated R2 receipt projection with an explicit failed-service precondition.
  // The actual error/retry controls are separately exercised below.
  await entry(p, "bookings");
  const before = await retained(p);
  await click(p, "View recovery receipt", "link"); await view(p, "xc2-maya-history", "Maya Keller", "Activity");
  await visible(p, "You recovered 45 USDC"); await visible(p, "Booking fulfilment pending"); await retained(p, before); await snap("receipt-service-error");
}]);
cases.push(["B3-expected-attendance-restriction", bobFixture(), async (p, snap) => {
  await provider(p); await visible(p, "Bob is the expected guest");
  const before = await retained(p); await snap("expected");
  await click(p, "Record attendance"); await view(p, "xc2-provider-attendance", "Studio A", "Today");
  await visible(p, "Opens at 17:30");
  assert(await p.getByRole("button", { name: "Record Bob’s arrival", exact: true }).isDisabled());
  await retained(p, before); await snap("attendance-restricted");
  await click(p, "Back to Today"); await view(p, "xc2-provider-pending", "Studio A", "Today");
  await retained(p, before);
}]);
cases.push(["B3-stale-holder", bobFixture({ holderRead: "stale" }), async (p, snap) => {
  await entry(p, "xc-provider-final"); await visible(p, "needs confirmation");
  const before = await retained(p);
  assert(!(await p.locator("main").innerText()).includes("Bob is now the current holder."));
  await click(p, "Open booking status"); await view(p, "xc2-provider-reconcile-issue", "Studio A", "Reconciliation");
  await visible(p, "Completed handoff"); await retained(p, before); await snap("provider-stale");
}]);
cases.push(["B4-attendance-then-fulfilment", bobFixture({ checkinWindow: "open" }), async (p, snap) => {
  await provider(p); await click(p, "Record attendance");
  await view(p, "xc2-provider-attendance", "Studio A", "Today");
  await click(p, "Record Bob’s arrival"); await view(p, "xc2-provider-pending", "Studio A", "Today");
  const attended = await retained(p); assert.equal(attended.continuation.attendanceCount, 1);
  assert.equal(attended.continuation.fulfilment, "none"); await snap("attended-not-fulfilled");
  await click(p, "Fulfil booking"); await view(p, "xc2-provider-fulfilment-pending", "Studio A", "Today");
  const pending = await retained(p); assert.equal(pending.continuation.fulfilmentCount, 0);
  assert.equal(pending.continuation.fulfilmentAttempts, 1); await snap("fulfilment-pending");
  await history(p, "xc2-provider-fulfilment-pending", "Studio A", "Today");
  await click(p, "Refresh fulfilment"); await view(p, "xc2-provider-fulfilled", "Studio A", "Today");
  const fulfilled = await retained(p); assert.equal(fulfilled.continuation.fulfilmentCount, 1);
  await snap("fulfilment-result"); await history(p, "xc2-provider-fulfilled", "Studio A", "Today");
  await click(p, "Back to Today"); await view(p, "xc2-provider-fulfilled", "Studio A", "Today");
  await retained(p, fulfilled); assert.equal(await p.getByRole("button", { name: "Fulfil booking", exact: true }).count(), 0);
  await click(p, "Review reconciliation"); await view(p, "xc2-provider-reconciled", "Studio A", "Reconciliation");
  await click(p, "View activity"); await view(p, "xc2-provider-history", "Studio A", "Activity");
  const complete = await retained(p); assert.equal(complete.continuation.reconciliation, "complete"); await snap("history");
  await click(p, "Back to Today"); await view(p, "xc2-provider-fulfilled", "Studio A", "Today"); await retained(p, complete);
}]);
cases.push(["B4-error-retry", checked("fail-once"), async (p, snap) => {
  await provider(p);
  await click(p, "Fulfil booking"); await view(p, "xc2-provider-fulfilment-pending", "Studio A", "Today");
  await click(p, "Refresh fulfilment"); await view(p, "xc2-provider-fulfilment-error", "Studio A", "Today");
  await visible(p, "Fulfilment did not complete."); const failed = await retained(p);
  assert.equal(failed.continuation.fulfilmentCount, 0); await snap("fulfilment-error");
  await history(p, "xc2-provider-fulfilment-error", "Studio A", "Today"); await retained(p, failed);
  await click(p, "Retry fulfilment"); await view(p, "xc2-provider-fulfilment-pending", "Studio A", "Today");
  assert.equal((await retained(p)).continuation.fulfilmentAttempts, 2); await snap("retry-pending");
  await click(p, "Refresh fulfilment"); await view(p, "xc2-provider-fulfilled", "Studio A", "Today");
  assert.equal((await retained(p)).continuation.fulfilmentCount, 1); await snap("retry-result");
}]);
cases.push(["B4-unknown-refresh", checked("unknown"), async (p, snap) => {
  await provider(p); await click(p, "Fulfil booking");
  await view(p, "xc2-provider-fulfilment-pending", "Studio A", "Today");
  const before = await retained(p);
  await click(p, "Refresh fulfilment"); await retained(p, before);
  await click(p, "Refresh fulfilment"); await retained(p, before);
  await p.reload({ waitUntil: "networkidle" }); await view(p, "xc2-provider-fulfilment-pending", "Studio A", "Today");
  await retained(p, before); await snap("unknown-keeps-one-attempt");
}]);
for (const phase of ["begin", "result"]) cases.push(["B4-storage-" + phase, checked(), async (p, snap) => {
  await provider(p);
  if (phase === "result") { await click(p, "Fulfil booking"); await view(p, "xc2-provider-fulfilment-pending", "Studio A", "Today"); }
  const before = await retained(p);
  await p.evaluate(k => {
    const original = Storage.prototype.setItem;
    window.restoreR2Storage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(key, value) {
      if (key === k) throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  }, key);
  await click(p, phase === "begin" ? "Fulfil booking" : "Refresh fulfilment");
  await visible(p, "Your booking state could not be saved.");
  await retained(p, before); await snap("storage-" + phase);
  await p.evaluate(() => window.restoreR2Storage()); await click(p, "Retry loading booking state");
  await click(p, phase === "begin" ? "Fulfil booking" : "Refresh fulfilment");
  await view(p, phase === "begin" ? "xc2-provider-fulfilment-pending" : "xc2-provider-fulfilled", "Studio A", "Today");
  assert.equal((await retained(p)).continuation.fulfilmentAttempts, 1);
}]);

await mkdir(out, { recursive: true });
try {
  for (const [viewportName, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    for (const [name, fixture, run] of cases) {
      const context = fixture ? await seededContext(browser, viewport, fixture) : await browser.newContext({ viewport });
      await context.route("**/*", route => {
        const r = route.request(), url = new URL(r.url());
        return url.origin === base.origin && ["GET", "HEAD"].includes(r.method()) ? route.continue() : route.abort();
      });
      const p = await context.newPage(); p.setDefaultTimeout(7000);
      const record = { name, viewport: viewportName, entry: fixture ? "One explicit isolated R2 precondition; no destination reseeding" : "Actual Maya recovery controls from fresh fixture", status: "FAIL", screenshots: [], checkpoints: [], consoleErrors: [] };
      p.on("pageerror", e => record.consoleErrors.push(e.message));
      p.on("console", m => { if (m.type() === "error") record.consoleErrors.push(m.text()); });
      const snap = async label => {
        const filename = viewportName + "-" + name + "-" + label + ".png";
        await p.screenshot({ path: path.join(out, filename), fullPage: true }); record.screenshots.push(filename);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, "Horizontal overflow");
        const body = await p.locator("main").innerText();
        assert(!/0x[0-9a-fA-F]{40,}|\\b0\\.0\\.\\d+\\b/.test(body), "Raw identifiers");
        record.checkpoints.push({ label, path: new URL(p.url()).pathname + new URL(p.url()).search, header: await p.locator("header").innerText(), facts: await storedFixture(p) });
      };
      try { await run(p, snap); assert.equal(record.consoleErrors.length, 0, record.consoleErrors.join(" | ")); record.status = "PASS"; }
      catch (e) { record.error = String(e.message).slice(0, 1600); await snap("failure").catch(() => {}); }
      results.push(record); console.log(record.status + " " + viewportName + " " + name + (record.error ? ": " + record.error : ""));
      await context.close();
    }
  }
} finally { await browser.close(); }
const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
await writeFile(path.join(out, "results.json"), JSON.stringify({ candidateSha, evidenceClass: "FIXTURE", scope: "R2 B1-B4 only; isolated preconditions are not R4 connected proof", counts, results }, null, 2));
console.log(JSON.stringify({ candidateSha, counts }));
if (results.length !== cases.length * 2 || results.some(r => r.status !== "PASS")) process.exitCode = 1;
