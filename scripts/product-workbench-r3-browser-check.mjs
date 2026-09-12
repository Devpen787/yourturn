import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { bookingFixture, bobFixture, seededContext, storedFixture } from "./product-workbench-booking-fixtures.mjs";

const base = new URL(process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000");
assert(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Loopback only");
const providerKey = "yourturn:product-preview:provider-config:v1";
const out = path.resolve("artifacts/product-workbench/r3");
const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const viewports = [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }];
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir(out, { recursive: true });

async function shot(page, viewport, name) { const file = `${viewport}-${name}.png`; await page.screenshot({ path: path.join(out, file), fullPage: true }); return file; }
async function visible(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 7000 }); }
async function header(page, identity, label) { const text = await page.locator("header").innerText(); assert(text.includes(identity) && text.includes(label), `Header mismatch: ${text}`); }
async function goto(page, view = "") { await page.goto(`${base.origin}/product-preview${view ? `?view=${view}` : ""}`, { waitUntil: "networkidle" }); }
async function providerState(page) { return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), providerKey); }

try {
  for (const viewport of viewports) {
    const size = { width: viewport.width, height: viewport.height };
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await goto(page, "xc3-provider-session-draft"); await header(page, "Studio A", "Inventory");
    await page.getByLabel("Capacity").fill("14"); await page.getByLabel("Transfer cutoff").fill("17:20");
    await visible(page, "Unsaved draft"); assert.equal((await providerState(page)).published.capacity, 12);
    await shot(page, viewport.name, "provider-draft");
    await page.reload({ waitUntil: "networkidle" }); assert.equal(await page.getByLabel("Capacity").inputValue(), "14"); assert.equal((await providerState(page)).published.capacity, 12);
    await shot(page, viewport.name, "provider-draft-reload");

    await page.getByLabel("Capacity").fill("0"); await page.getByRole("button", { name: "Save and publish", exact: true }).click();
    await visible(page, "Capacity must be a whole number"); assert.equal((await providerState(page)).published.capacity, 12);
    await shot(page, viewport.name, "provider-invalid");

    await page.getByLabel("Capacity").fill("14");
    await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.saveMode = "fail-once"; localStorage.setItem(k, JSON.stringify(s)); window.dispatchEvent(new Event("yourturn:r3-provider-config-changed")); }, providerKey);
    await page.getByRole("button", { name: "Save and publish", exact: true }).click();
    await visible(page, "could not be saved"); assert.equal((await providerState(page)).published.capacity, 12);
    await shot(page, viewport.name, "provider-save-failure");

    await page.getByRole("button", { name: "Save and publish", exact: true }).click();
    await page.waitForURL((u) => u.searchParams.get("view") === "xc3-provider-session-published");
    await visible(page, "14 places"); await visible(page, "Friday · 17:20");
    await shot(page, viewport.name, "provider-published");
    await page.reload({ waitUntil: "networkidle" }); await visible(page, "14 places");
    await context.close();

    const preContext = await seededContext(browser, size, bookingFixture());
    const pre = await preContext.newPage(); const preErrors = [];
    pre.on("pageerror", (e) => preErrors.push(e.message)); pre.on("console", (m) => { if (m.type() === "error") preErrors.push(m.text()); });
    await goto(pre, "xc2-bob-list"); await header(pre, "Bob", "My bookings"); await visible(pre, "No Friday Yoga booking yet");
    assert.equal((await storedFixture(pre)).holder, "maya"); await shot(pre, viewport.name, "bob-list-before-handoff");
    await pre.getByRole("button", { name: "Browse available spots", exact: true }).click(); await pre.waitForURL((u) => u.searchParams.get("view") === "xc-find"); await header(pre, "Bob", "Find a spot");
    await shot(pre, viewport.name, "browse-in-product-preview");
    await preContext.close();

    const bobContext = await seededContext(browser, size, bobFixture({ checkinWindow: "open" }));
    const bob = await bobContext.newPage(); const bobErrors = [];
    bob.on("pageerror", (e) => bobErrors.push(e.message)); bob.on("console", (m) => { if (m.type() === "error") bobErrors.push(m.text()); });
    await goto(bob, "xc2-bob-list"); await header(bob, "Bob", "My bookings"); await visible(bob, "Friday Yoga · 18:00");
    const owned = await storedFixture(bob); assert.equal(owned.holder, "bob"); assert.equal(owned.recoveredAmount, 45); assert.equal(owned.settlementCount, 1);
    await shot(bob, viewport.name, "bob-list-after-handoff");
    await bob.getByRole("button", { name: "Use booking", exact: true }).click(); await bob.waitForURL((u) => u.searchParams.get("view") === "xc2-bob-ready"); await visible(bob, "Check in for Friday Yoga");
    await bobContext.close();

    const mayaContext = await seededContext(browser, size, bookingFixture({ confirmedScope: false, activeMinimum: null, approvalStatus: "idle" }));
    const maya = await mayaContext.newPage(); const mayaErrors = [];
    maya.on("pageerror", (e) => mayaErrors.push(e.message)); maya.on("console", (m) => { if (m.type() === "error") mayaErrors.push(m.text()); });
    await goto(maya); await header(maya, "Maya Keller", "My bookings"); await visible(maya, "prepared customer account"); await visible(maya, "Friday Yoga · 18:00");
    assert.equal((await storedFixture(maya)).holder, "maya"); await shot(maya, viewport.name, "prepared-maya-owner-boundary"); await mayaContext.close();

    const allErrors = [...errors, ...preErrors, ...bobErrors, ...mayaErrors];
    assert.equal(allErrors.length, 0, `Console/page errors: ${allErrors.join(" | ")}`);
    results.push({ viewport: viewport.name, status: "PASS", evidenceClass: "FIXTURE", screenshots: 8, consoleErrors: 0 });
    console.log(`PASS R3 ${viewport.name}`);
  }
} finally { await browser.close(); }

await writeFile(path.join(out, "results.json"), JSON.stringify({ schemaVersion: 1, candidateSha, generatedAt: new Date().toISOString(), scope: "R3 only: provider draft/published separation, validation/save failure, Bob My bookings projection, internal Browse, prepared Maya-owner fixture boundary", results }, null, 2));
assert.equal(results.length, 2); assert(results.every((r) => r.status === "PASS"));
console.log("R3 browser evidence: PASS 2/2 viewports");
