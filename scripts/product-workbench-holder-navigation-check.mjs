import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = new URL(process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000");
assert(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Loopback only");
const key = "yourturn:product-preview:holder:v1";
const out = path.resolve("artifacts/product-workbench/holder-navigation");
const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const results = [];
const browser = await chromium.launch({ headless: true });
const click = (p, name, role = "button", scope = p.locator("main")) => scope.getByRole(role, { name, exact: true }).click();
async function text(p, wanted, scope = p.locator("main")) {
  await p.waitForFunction(({ selector, wanted }) => document.querySelector(selector)?.textContent?.includes(wanted),
    { selector: "main", wanted }, { timeout: 5000 });
  assert((await scope.innerText()).includes(wanted), `Missing visible ${wanted}`);
}
async function fixture(p) { return p.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key); }
async function waiting(p) {
  await p.goto(`${base.origin}/product-preview`, { waitUntil: "networkidle" });
  await click(p, "Open my bookings");
  await p.getByText("View booking →", { exact: true }).click();
  await click(p, "Change plans");
  await p.getByRole("button", { name: /Let YourTurn handle it/ }).click();
  await p.getByRole("checkbox").check();
  await click(p, "Continue to secure approval");
  await click(p, "Approve on secure device");
  await click(p, "Connect Ledger");
  await text(p, "Waiting for your Ledger.");
}
async function active(p) {
  await waiting(p);
  await click(p, "Check approval status");
  await click(p, "View active recovery");
  await text(p, "Recovery active");
}
async function success(p) {
  await active(p);
  await click(p, "See latest offer");
  await click(p, "Keep looking");
  await click(p, "Refresh recovery status");
  await text(p, "You recovered 45 USDC.");
}

const cases = [
  ["recovery-return-reload-history", async (p, snap) => {
    await success(p); const before = await fixture(p);
    await click(p, "My bookings", "link", p.locator("header"));
    await text(p, "Recovered 45 USDC");
    await p.reload({ waitUntil: "networkidle" });
    await text(p, "Recovered 45 USDC");
    await p.goBack({ waitUntil: "networkidle" });
    await text(p, "You recovered 45 USDC.");
    await p.goForward({ waitUntil: "networkidle" });
    await text(p, "Recovered 45 USDC");
    assert.deepEqual(await fixture(p), before, "Navigation must not mutate recovered facts");
    assert.equal(await p.getByText("View booking →", { exact: true }).count(), 0);
    await snap("recovered-after-return");
  }],
  ["pending-resume-does-not-reapprove", async (p, snap) => {
    await waiting(p); const before = await fixture(p);
    await click(p, "My bookings", "link", p.locator("header"));
    await text(p, "Approval pending");
    await p.reload({ waitUntil: "networkidle" });
    await text(p, "Approval pending");
    await click(p, "Resume approval");
    await text(p, "Waiting for your Ledger.");
    assert.deepEqual(await fixture(p), before, "Resume must not authorize or duplicate the attempt");
    await p.goBack({ waitUntil: "networkidle" });
    assert.equal(new URL(p.url()).pathname, "/product-preview");
    await p.goForward({ waitUntil: "networkidle" });
    await text(p, "Waiting for your Ledger.");
    await snap("pending-resumed");
  }],
  ["replacement-cancel-return-reload", async (p, snap) => {
    await active(p);
    await click(p, "See latest offer");
    await click(p, "Lower my minimum");
    await click(p, "Review 30 USDC authorization");
    await click(p, "Connect Ledger");
    await click(p, "Cancel approval");
    await text(p, "Your 40 USDC recovery stays active.");
    await click(p, "My bookings", "link", p.locator("header"));
    await p.reload({ waitUntil: "networkidle" });
    await text(p, "Recovery active");
    assert.equal((await fixture(p)).activeMinimum, 40);
    assert.equal((await fixture(p)).approvalStatus, "cancelled");
    await snap("replacement-retains-authority");
  }],
  ["stale-success-and-authority-urls", async (p, snap) => {
    for (const view of ["recovery-success", "ledger-approved", "recovery-active"]) {
      await p.goto(`${base.origin}/product-preview?view=${view}`, { waitUntil: "networkidle" });
      await text(p, "Good evening, Maya.");
      const body = await p.locator("main").innerText();
      assert(!body.includes("You recovered 45 USDC"));
      assert(!body.includes("Approved on your Ledger"));
      const stored = await fixture(p);
      assert(stored === null || (stored.activeMinimum === null && stored.settlementCount === 0));
    }
    await snap("stale-url-does-not-create-facts");
  }],
  ["corrupt-state-fails-closed", async (p, snap) => {
    await p.addInitScript((storageKey) => localStorage.setItem(storageKey, "{bad-json"), key);
    await p.goto(`${base.origin}/product-preview?view=bookings`, { waitUntil: "networkidle" });
    await text(p, "Your booking state could not be restored.");
    assert.equal(await p.getByText("View booking →", { exact: true }).count(), 0);
    await snap("corrupt-storage");
  }],
  ["write-failure-does-not-claim-success", async (p, snap) => {
    await waiting(p);
    const before = await fixture(p);
    await p.evaluate((storageKey) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, value) {
        if (k === storageKey) throw new DOMException("Quota exceeded", "QuotaExceededError");
        return original.call(this, k, value);
      };
    }, key);
    await click(p, "Check approval status");
    await text(p, "Your booking state could not be saved.");
    assert.deepEqual(await fixture(p), before);
    assert(!(await p.locator("main").innerText()).includes("Approved on your Ledger."));
    await snap("save-error");
  }],
];

await mkdir(out, { recursive: true });
try {
  for (const [viewportName, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    for (const [name, run] of cases) {
      const context = await browser.newContext({ viewport });
      await context.route("**/*", (route) => {
        const request = route.request(); const url = new URL(request.url());
        if (url.origin !== base.origin || !["GET", "HEAD"].includes(request.method())) return route.abort();
        return route.continue();
      });
      const p = await context.newPage();
      p.setDefaultTimeout(7000);
      const consoleErrors = [];
      p.on("pageerror", (e) => consoleErrors.push(e.message));
      p.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      const record = { name, viewport: viewportName, status: "FAIL", screenshots: [], consoleErrors };
      const snap = async (label) => {
        const filename = `${viewportName}-${label}.png`;
        await p.screenshot({ path: path.join(out, filename), fullPage: true });
        record.screenshots.push(filename);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, "Horizontal overflow");
        assert((await p.locator("header").innerText()).includes("Maya Keller"), "Actor identity must be VISIBLE");
        const navLink = p.locator("header nav a").first();
        assert((await navLink.boundingBox()).height >= 44, "Header navigation touch target <44px");
      };
      try { await run(p, snap); assert.equal(consoleErrors.length, 0); record.status = "PASS"; }
      catch (e) {
        record.error = String(e.message).slice(0, 1200);
        await p.screenshot({ path: path.join(out, `${viewportName}-${name}-failure.png`), fullPage: true });
      }
      results.push(record);
      await context.close();
    }
  }
} finally { await browser.close(); }
await writeFile(path.join(out, "results.json"), JSON.stringify({ candidateSha, scope: "R1a holder-only navigation; NOT R1/R2/R3/R4 completion", evidenceClass: "FIXTURE", results }, null, 2));
console.log(results.map((r) => `${r.status} ${r.viewport} ${r.name}${r.error ? `: ${r.error}` : ""}`).join("\n"));
if (results.some((r) => r.status !== "PASS")) process.exitCode = 1;
