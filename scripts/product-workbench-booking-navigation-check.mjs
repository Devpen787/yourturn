import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { bookingFixture, bobFixture, seededContext, storedFixture } from "./product-workbench-booking-fixtures.mjs";

const base = new URL(process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000");
assert(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Loopback only");
const key = "yourturn:product-preview:holder:v1";
const out = path.resolve("artifacts/product-workbench/booking-navigation");
const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const results = [];
const browser = await chromium.launch({ headless: true });

async function text(page, wanted) {
  await page.waitForFunction((value) => document.querySelector("main")?.textContent?.includes(value), wanted, { timeout: 7000 });
  assert((await page.locator("main").innerText()).includes(wanted), `Missing visible ${wanted}`);
}

async function click(page, name, role = "button", scope = page.locator("main")) {
  await scope.getByRole(role, { name, exact: true }).click();
}

async function enterPendingPayment(page) {
  await page.goto(`${base.origin}/product-preview?view=xc-find`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /View Friday Yoga/ }).click();
  await text(page, "This booking is available to you.");
  await click(page, "Commit 45 USDC");
  await text(page, "Payment pending");
}

async function assertHeader(page, label, identity) {
  const header = (await page.locator("header").innerText()).replace(/\s+/g, " ");
  assert(header.includes(label), `Header missing ${label}: ${header}`);
  assert(header.includes(identity), `Header missing ${identity}: ${header}`);
  const navLink = page.locator("header nav a").first();
  const box = await navLink.boundingBox();
  assert(box && box.height >= 44, "Header navigation touch target <44px");
}

const cases = [
  ["NAV-04-payment-reload", bookingFixture(), async (page, snap) => {
    await enterPendingPayment(page);
    const before = await storedFixture(page);
    assert.equal(before.continuation.payment, "pending");
    assert.equal(before.continuation.paymentAttempts, 1);
    await page.reload({ waitUntil: "networkidle" });
    await text(page, "Payment pending");
    await assertHeader(page, "Find a spot", "Bob");
    assert.deepEqual(await storedFixture(page), before, "Reload must not restart or resolve pending payment");
    await snap("payment-reload");
  }],
  ["NAV-06-payment-history", bookingFixture(), async (page, snap) => {
    await enterPendingPayment(page);
    const before = await storedFixture(page);
    await page.goBack({ waitUntil: "networkidle" });
    await text(page, "Payment pending");
    await page.waitForURL((url) => url.searchParams.get("view") === "xc-payment-pending");
    assert.notEqual(page.url(), "about:blank");
    assert.deepEqual(await storedFixture(page), before, "Browser history must not change pending payment facts");
    await assertHeader(page, "Find a spot", "Bob");
    await snap("payment-history");
  }],
  ["NAV-07-checked-in-header", bobFixture({ checkinWindow: "open" }), async (page, snap) => {
    await page.goto(`${base.origin}/product-preview?view=xc2-bob-ready`, { waitUntil: "networkidle" });
    await text(page, "Check in for Friday Yoga.");
    await click(page, "Check in");
    await text(page, "You’re checked in.");
    const before = await storedFixture(page);
    assert.equal(before.continuation.attendance, "checked-in");
    assert.equal(before.continuation.attendanceCount, 1);
    await click(page, "My bookings", "link", page.locator("header"));
    await text(page, "You're checked in for Friday Yoga.");
    await assertHeader(page, "My bookings", "Bob");
    assert.deepEqual(await storedFixture(page), before, "Header return must preserve Bob attendance");
    await page.reload({ waitUntil: "networkidle" });
    await text(page, "You're checked in for Friday Yoga.");
    assert.deepEqual(await storedFixture(page), before, "Reload after header return must preserve Bob attendance");
    await snap("checked-in-header");
  }],
  ["NAV-08-fulfilled-header", bobFixture({
    checkinWindow: "open", attendance: "checked-in", attendanceCount: 1, fulfilment: "fulfilled",
  }), async (page, snap) => {
    await page.goto(`${base.origin}/product-preview?view=xc2-provider-fulfilled`, { waitUntil: "networkidle" });
    await text(page, "Friday Yoga was fulfilled for Bob.");
    const before = await storedFixture(page);
    assert.equal(before.continuation.fulfilment, "fulfilled");
    assert.equal(before.settlementCount, 1);
    await click(page, "Today", "link", page.locator("header"));
    await text(page, "Friday Yoga was fulfilled for Bob.");
    await page.waitForURL((url) => url.searchParams.get("view") === "xc2-provider-fulfilled");
    await assertHeader(page, "Today", "Studio A");
    const after = await storedFixture(page);
    assert.deepEqual(after, before, "Provider header return must preserve fulfilment facts");
    assert.equal(after.recoveredAmount, 45, "Later fulfilment must not erase recovery settlement");
    await snap("fulfilled-header");
  }],
  ["booking-write-failure", bobFixture({ checkinWindow: "open" }), async (page, snap) => {
    await page.goto(`${base.origin}/product-preview?view=xc2-bob-ready`, { waitUntil: "networkidle" });
    const before = await storedFixture(page);
    await page.evaluate((storageKey) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, value) {
        if (k === storageKey) throw new DOMException("Quota exceeded", "QuotaExceededError");
        return original.call(this, k, value);
      };
    }, key);
    await click(page, "Check in");
    await text(page, "Your booking state could not be saved.");
    assert.deepEqual(await storedFixture(page), before, "Failed write must not claim attendance");
    assert(!(await page.locator("main").innerText()).includes("You’re checked in."));
    await snap("write-failure");
  }],
  ["booking-corrupt-state", null, async (page, snap) => {
    await page.addInitScript((storageKey) => localStorage.setItem(storageKey, "{bad-json"), key);
    await page.goto(`${base.origin}/product-preview?view=xc-payment-pending`, { waitUntil: "networkidle" });
    await text(page, "Your booking state could not be restored.");
    assert(!(await page.locator("main").innerText()).includes("Payment pending"));
    await snap("corrupt-state", false);
  }],
];

await mkdir(out, { recursive: true });
try {
  for (const [viewportName, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    for (const [name, fixture, run] of cases) {
      const context = fixture ? await seededContext(browser, viewport, fixture) : await browser.newContext({ viewport });
      await context.route("**/*", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== base.origin || !["GET", "HEAD"].includes(request.method())) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      const consoleErrors = [];
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      const record = { name, viewport: viewportName, status: "FAIL", screenshots: [], consoleErrors };
      const snap = async (label, checkHeader = true) => {
        const filename = `${viewportName}-${label}.png`;
        await page.screenshot({ path: path.join(out, filename), fullPage: true });
        record.screenshots.push(filename);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, "Horizontal overflow");
        if (checkHeader) {
          const header = await page.locator("header").innerText();
          assert(header.includes("Maya Keller") || header.includes("Bob") || header.includes("Studio A"), "Actor identity must be visible");
        }
      };
      try {
        await run(page, snap);
        assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join(" | ")}`);
        record.status = "PASS";
      } catch (error) {
        record.error = String(error.message).slice(0, 1200);
        await page.screenshot({ path: path.join(out, `${viewportName}-${name}-failure.png`), fullPage: true });
      }
      results.push(record);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(path.join(out, "results.json"), JSON.stringify({
  candidateSha,
  scope: "#44 R1b NAV-04/06/07/08 shared booking continuity; B1-B4 remain outside this closure",
  evidenceClass: "FIXTURE",
  results,
}, null, 2));
console.log(results.map((result) => `${result.status} ${result.viewport} ${result.name}${result.error ? `: ${result.error}` : ""}`).join("\n"));
if (results.some((result) => result.status !== "PASS")) process.exitCode = 1;
