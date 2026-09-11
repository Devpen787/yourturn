import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { bookingFixture, bobFixture, seedPage } from "./product-workbench-booking-fixtures.mjs";

// #44 regression acceptance: assertions remain the correct product result.
// R1 may turn NAV failures green; B1-B4 remain RED until R2. Direct fixture
// preconditions are explicit and never counted as incoming-edge/shared-state proof.
const base = new URL(process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000");
assert(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Integrity checks require loopback");
const out = path.resolve("artifacts/product-workbench/integrity");
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const viewports = [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }];
const results = [];
const scrub = (value) => String(value).replace(/0x[0-9a-fA-F]{40,}/g, "[redacted-id]").replace(/\b0\.0\.\d+\b/g, "[redacted-id]").slice(0, 1600);
const matches = (actual, expected) => typeof expected === "string" ? actual.includes(expected) : expected.test(actual);

async function visible(page, expected, scope = page.locator("main")) {
  const until = Date.now() + 3500;
  let text = "";
  do {
    text = await scope.innerText();
    if (matches(text, expected)) return;
    await page.waitForTimeout(75);
  } while (Date.now() < until);
  throw new Error(`Expected visible ${String(expected)}; observed: ${scrub(text)}`);
}
async function action(page, name, role = "button", scope = page.locator("main")) {
  const control = scope.getByRole(role, { name, exact: typeof name === "string" }).first();
  await control.waitFor({ state: "visible", timeout: 3500 });
  await control.click();
}
async function nextAction(page, name) {
  const main = page.locator("main");
  const choices = main.getByRole("button", { name }).or(main.getByRole("link", { name }));
  for (let i = 0; i < await choices.count(); i += 1) {
    if (await choices.nth(i).isVisible()) { await choices.nth(i).click(); return; }
  }
  throw new Error(`Missing visible in-body continuation: ${String(name)}`);
}
async function entry(page, view = "") {
  await page.goto(`${base.origin}/product-preview${view ? `?view=${view}` : ""}`, { waitUntil: "networkidle" });
  await page.locator("main h1").waitFor({ state: "visible" });
}

async function mayaWaiting(page) {
  await page.goto(base.origin, { waitUntil: "networkidle" });
  await action(page, "Open my bookings", "link");
  await visible(page, "Maya Keller");
  await action(page, "Open my bookings");
  await page.getByText("View booking →", { exact: true }).click();
  await action(page, "Change plans");
  await action(page, /Let YourTurn handle it/);
  await page.getByRole("checkbox").check();
  await action(page, "Continue to secure approval");
  await action(page, "Approve on secure device");
  await action(page, "Connect Ledger");
  await visible(page, "Waiting for your Ledger.");
}
async function mayaActive(page) {
  await mayaWaiting(page);
  await action(page, "Check approval status");
  await visible(page, "Approved on your Ledger.");
  await action(page, "View active recovery");
  await visible(page, "Recovery active");
}
async function mayaSuccess(page) {
  await mayaActive(page);
  await action(page, "See latest offer");
  await visible(page, "32 USDC was not accepted.");
  await action(page, "Keep looking");
  await visible(page, "45 USDC is within your limits.");
  await action(page, "Refresh recovery status");
  await visible(page, "You recovered 45 USDC.");
}
async function bobPending(page) {
  await seedPage(page, bookingFixture());
  await entry(page, "xc-find");
  await action(page, /View Friday Yoga/);
  await visible(page, "This booking is available to you.");
  await action(page, "Commit 45 USDC");
  await visible(page, "Confirming your 45 USDC commitment.");
}
async function bobSuccess(page) {
  await bobPending(page);
  await action(page, "Check payment status");
  await visible(page, "Your 45 USDC commitment is ready.");
  await action(page, "Check handoff status");
  await visible(page, "The handoff is being confirmed.");
  await action(page, "Refresh booking");
  await visible(page, "Friday Yoga is now yours.");
}
async function stillRecovered(page) {
  await visible(page, /[Rr]ecovered 45 USDC/);
  const usable = page.getByText("View booking →", { exact: true });
  for (let i = 0; i < await usable.count(); i += 1) assert.equal(await usable.nth(i).isVisible(), false, "Recovered Friday Yoga became usable again");
}

const cases = [
  { id: "CONTROL-body-return", requirement: "R0", entry: "clicked holder journey", prepare: mayaSuccess,
    probe: async (p) => { await action(p, "Back to my bookings"); await stillRecovered(p); } },
  { id: "NAV-01-recovered-header", requirement: "F-01", entry: "clicked holder journey", prepare: mayaSuccess,
    probe: async (p) => { await action(p, "My bookings", "link", p.locator("header")); await stillRecovered(p); } },
  { id: "NAV-02-active-header", requirement: "GAP-7", entry: "clicked holder journey", prepare: mayaActive,
    probe: async (p) => { await action(p, "My bookings", "link", p.locator("header")); await visible(p, "Recovery active"); } },
  { id: "NAV-03-recovery-reload", requirement: "F-01/F-09", entry: "clicked holder journey", prepare: mayaSuccess,
    probe: async (p) => { await p.reload({ waitUntil: "networkidle" }); await stillRecovered(p); } },
  { id: "NAV-04-payment-reload", requirement: "GAP-6", entry: "clicked acquirer journey", prepare: bobPending,
    probe: async (p) => { await p.reload({ waitUntil: "networkidle" }); await visible(p, "Confirming your 45 USDC commitment."); } },
  { id: "NAV-05-authorization-back", requirement: "F-08", entry: "clicked holder journey", prepare: mayaWaiting,
    probe: async (p) => { await p.goBack({ waitUntil: "networkidle" }); assert.equal(new URL(p.url()).pathname, "/product-preview", "Back ejected the pending authorization to another product/page"); await p.goForward({ waitUntil: "networkidle" }); await visible(p, "Waiting for your Ledger."); } },
  { id: "NAV-06-payment-history", requirement: "F-02/F-08", entry: "clicked acquirer journey", prepare: bobPending,
    probe: async (p) => { await p.goBack({ waitUntil: "networkidle" }); assert.equal(new URL(p.url()).pathname, "/product-preview", "Back ejected the pending payment"); await p.goForward({ waitUntil: "networkidle" }); await visible(p, "Confirming your 45 USDC commitment."); } },
  { id: "NAV-07-checkin-header", requirement: "F-03", entry: "direct fixture: check-in-ready; then actual Check in", prepare: async (p) => {
      await seedPage(p, bobFixture({ checkinWindow: "open" })); await entry(p, "xc2-bob-ready"); await action(p, "Check in"); await visible(p, "You’re checked in.");
    }, probe: async (p) => { await action(p, "My bookings", "link", p.locator("header")); await visible(p, /[Cc]hecked in/); } },
  { id: "NAV-08-fulfilled-header", requirement: "F-03", entry: "direct fulfilled fixture; readback only, NOT fulfil-action proof", prepare: async (p) => {
      await seedPage(p, bobFixture({ checkinWindow: "open", attendance: "checked-in", attendanceCount: 1, fulfilment: "fulfilled" })); await entry(p, "xc2-provider-fulfilled"); await visible(p, "Friday Yoga was fulfilled for Bob.");
    }, probe: async (p) => { await action(p, "Today", "link", p.locator("header")); await visible(p, /[Ff]ulfilled/); } },
  { id: "IDENTITY-maya", requirement: "F-05", entry: "direct fixture: bookings; visible identity only", prepare: (p) => entry(p, "bookings"), probe: (p) => visible(p, "Maya Keller", p.locator("header")) },
  { id: "IDENTITY-bob", requirement: "F-05", entry: "direct fixture: xc-bob-success; visible identity only", prepare: async (p) => { await seedPage(p, bobFixture()); await entry(p, "xc-bob-success"); }, probe: (p) => visible(p, "Bob", p.locator("header")) },
  { id: "IDENTITY-provider", requirement: "F-05", entry: "direct fixture: xc-provider-policy; visible identity only", prepare: async (p) => { await seedPage(p, bookingFixture()); await entry(p, "xc-provider-policy"); }, probe: (p) => visible(p, "Studio A", p.locator("header")) },
  { id: "BRIDGE-01-use-checkin", requirement: "B1/F-06", entry: "clicked acquirer journey", prepare: bobSuccess,
    probe: async (p) => { await action(p, "Use booking"); await visible(p, /Check in for Friday Yoga|Friday Yoga is ready for later|You[’']re checked in/i, p.locator("main h1")); } },
  { id: "BRIDGE-02-recovery-receipt", requirement: "B2/F-07", entry: "clicked holder journey", prepare: mayaSuccess,
    probe: async (p) => { await nextAction(p, /view (activity|receipt)|recovery receipt|view recovery/i); await visible(p, "You recovered 45 USDC"); await visible(p, /activity|receipt|history/i); } },
  { id: "BRIDGE-03-provider-handoff", requirement: "B3", entry: "direct provider-final fixture; continuation only", prepare: async (p) => {
      await seedPage(p, bobFixture()); await entry(p, "xc-provider-final"); await visible(p, "Bob is now the current holder.");
    }, probe: async (p) => { await nextAction(p, /today|fulfil|manage booking|open booking/i); await visible(p, "Bob"); await visible(p, /attendance|check.in|fulfil/i); } },
  { id: "BRIDGE-04-provider-action", requirement: "B4/F-04", entry: "direct expected-guest fixture; missing-action probe only", prepare: async (p) => {
      await seedPage(p, bobFixture()); await entry(p, "xc2-provider-pending"); await visible(p, "Bob is the expected guest");
    }, probe: async (p) => { await nextAction(p, /record attendance|mark.*fulfilled|complete.*session|fulfil booking|confirm attendance|check in bob/i); await visible(p, /recording|pending|checked in|fulfilled|could not|did not/i); } },
];

assert.equal(new Set(cases.map((c) => c.id)).size, cases.length, "Duplicate integrity test ID");
await mkdir(out, { recursive: true });
const sourceDigests = {};
for (const file of ["app/product-preview/GoldenRecoveryClient.tsx", "app/product-preview/Xc01Client.tsx", "app/product-preview/CompletionClient.tsx", "app/product-preview/ProviderLifecycleClient.tsx", "components/SiteHeader.tsx"]) sourceDigests[file] = createHash("sha256").update(await readFile(file)).digest("hex");

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const test of cases) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.route("**/*", (route) => {
        const request = route.request(); const url = new URL(request.url());
        if (["data:", "blob:"].includes(url.protocol)) return route.continue();
        if (url.origin !== base.origin || !["GET", "HEAD"].includes(request.method())) return route.abort("blockedbyclient");
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(4000); page.setDefaultNavigationTimeout(20000);
      const prefix = `${viewport.name}-${test.id}`;
      const record = { id: test.id, requirement: test.requirement, viewport: viewport.name, entry: test.entry, evidenceClass: "FIXTURE", status: "SETUP_ERROR", screenshots: [], consoleErrors: [] };
      page.on("pageerror", (error) => record.consoleErrors.push(scrub(error.message)));
      page.on("console", (message) => { if (message.type() === "error") record.consoleErrors.push(scrub(message.text())); });
      let ready = false;
      const capture = async (suffix) => { const filename = `${prefix}-${suffix}.png`; await page.screenshot({ path: path.join(out, filename), fullPage: true }); record.screenshots.push(filename); };
      try {
        await test.prepare(page); await capture("before"); ready = true; await test.probe(page);
        record.status = record.consoleErrors.length ? "RUNTIME_ERROR" : "PASS";
      } catch (error) { record.status = ready ? "FAIL" : "SETUP_ERROR"; record.error = scrub(error.message); }
      finally {
        record.finalPath = page.url().startsWith(base.origin) ? page.url().slice(base.origin.length) : scrub(page.url());
        record.visibleHeader = scrub(await page.locator("header").innerText({ timeout: 500 }).catch(() => "[no header]"));
        await capture("after").catch((error) => { record.evidenceError = scrub(error.message); record.status = "EVIDENCE_ERROR"; });
        results.push(record); console.log(`${record.status} ${prefix} [${record.requirement}]`); await context.close();
      }
    }
  }
} finally { await browser.close(); }
const counts = results.reduce((all, row) => ({ ...all, [row.status]: (all[row.status] ?? 0) + 1 }), {});
const report = {
  schemaVersion: 1, candidateSha: sha, generatedAt: new Date().toISOString(),
  scope: "#44 navigation/bridge regression acceptance; R1 NAV cases may close while R2 B1-B4 deliberately remain required",
  wholeProductClearance: false, sourceDigests, counts, results,
  remainingEvidence: ["R2 complete bridges including fulfilment pending/error/result", "R3 editable provider/customer entry scope", "R4 single-seed cross-actor scenario and duplicate/race tests", "R5 independent exact-head PNG and interaction review; human approval"],
};
await writeFile(path.join(out, "results.json"), JSON.stringify(report, null, 2));
const summary = `# #44 UX integrity evidence\n\nExact head: \`${sha}\`\n\n${report.scope}. Passing R1 navigation does not waive B1-B4 or establish whole-product completion.\n\n| Case | Viewport | Result | Requirement |\n| --- | --- | --- | --- |\n${results.map((r) => `| ${r.id} | ${r.viewport} | ${r.status} | ${r.requirement} |`).join("\n")}\n\nSee results.json for explicitly labelled fixture entries and paired screenshots. Setup/runtime/evidence errors are not product-defect reproductions.\n`;
await writeFile(path.join(out, "summary.md"), summary);
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
console.log(JSON.stringify({ candidateSha: sha, counts, wholeProductClearance: false }));
if (results.length !== cases.length * viewports.length || results.some((r) => r.status !== "PASS")) process.exitCode = 1;
