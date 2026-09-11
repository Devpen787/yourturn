import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.resolve("artifacts/product-workbench");
const disclaimer = "No LIVE sponsor execution is claimed by this Product Workbench state.";

async function assertVisible(page, text) {
  const matches = page.getByText(text, { exact: false });
  for (let i = 0; i < (await matches.count()); i += 1) {
    if (await matches.nth(i).isVisible()) return;
  }
  throw new Error(`Expected visible text: ${text}`);
}

async function assertNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`XC-02 horizontal overflow: ${overflow}px`);
}

async function assertNoTechLeak(page) {
  const body = await page.locator("body").innerText();
  for (const phrase of ["NFT", "HTS", "HCS", "AgentKit", "HashScan", "buyer wallet", "issuer dashboard"]) {
    if (body.includes(phrase)) throw new Error(`Protocol/demo vocabulary leaked into XC-02: ${phrase}`);
  }
  if (/0x[0-9a-fA-F]{40}/.test(body) || /\b0\.0\.\d+\b/.test(body)) {
    throw new Error("Raw protocol identifier leaked into XC-02");
  }
}

async function assertHeader(page, label, identity) {
  const header = page.locator("header");
  const visibleHeader = (await header.innerText()).replace(/\s+/g, " ");
  const semanticHeader = ((await header.textContent()) ?? "").replace(/\s+/g, " ");
  if (!visibleHeader.includes(label) || !semanticHeader.includes(identity)) {
    throw new Error(`XC-02 header mismatch; expected visible ${label} and semantic ${identity}: visible=${visibleHeader}; full=${semanticHeader}`);
  }
}

async function screenshot(page, prefix, name, headerLabel, identity) {
  await assertNoHorizontalScroll(page);
  await assertNoTechLeak(page);
  await assertHeader(page, headerLabel, identity);
  await page.screenshot({ path: path.join(outDir, `${prefix}-${name}.png`), fullPage: true });
}

async function direct(context, prefix, view, name, assertions, headerLabel, identity) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
  for (const text of assertions) await assertVisible(page, text);
  await screenshot(page, prefix, name, headerLabel, identity);
  await page.close();
}

async function expandProofAndCapture(context, prefix, view, name, title, headerLabel, identity) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
  const drawer = page.locator("details").filter({ hasText: "View technical proof" }).first();
  if (!(await drawer.count())) throw new Error(`Missing proof drawer for ${view}`);
  if (await drawer.evaluate((el) => el.open)) throw new Error(`Proof drawer must start collapsed for ${view}`);
  await drawer.locator("summary").click();
  await assertVisible(page, "FIXTURE");
  await assertVisible(page, title);
  await assertVisible(page, disclaimer);
  const drawerText = await drawer.innerText();
  const residual = drawerText.split(disclaimer).join(" ");
  for (const token of ["TESTNET", "MAINNET", "SETTLED", "CONFIRMED ON CHAIN"]) {
    if (residual.includes(token)) throw new Error(`XC-02 fixture proof promoted ${token}`);
  }
  await screenshot(page, prefix, name, headerLabel, identity);
  await page.close();
}

async function run(viewport, prefix) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  try {
    await direct(context, prefix, "xc2-bob-not-open", "40-xc2-bob-not-open", ["Friday Yoga is ready for later.", "Opens at 17:30", "Confirmed"], "My bookings", "Bob");

    const bob = await context.newPage();
    await bob.goto(`${baseUrl}/product-preview?view=xc2-bob-ready`, { waitUntil: "networkidle" });
    await assertVisible(bob, "Check in for Friday Yoga.");
    await assertVisible(bob, "Check-in open");
    await screenshot(bob, prefix, "41-xc2-bob-checkin-open", "My bookings", "Bob");
    await bob.getByRole("button", { name: "Check in" }).click();
    await bob.waitForURL(/view=xc2-bob-checked-in/);
    await assertVisible(bob, "You’re checked in.");
    await assertVisible(bob, "Checked in");
    await screenshot(bob, prefix, "42-xc2-bob-checked-in", "My bookings", "Bob");
    await bob.getByRole("button", { name: "View activity" }).click();
    await bob.waitForURL(/view=xc2-bob-history/);
    await assertVisible(bob, "Friday Yoga activity.");
    await assertVisible(bob, "You checked in");
    await screenshot(bob, prefix, "43-xc2-bob-history", "Activity", "Bob");
    await bob.close();

    await direct(context, prefix, "xc2-bob-checkin-error", "44-xc2-bob-checkin-error", ["Check-in did not complete.", "No attendance was recorded", "Try check-in again"], "My bookings", "Bob");
    await direct(context, prefix, "xc2-bob-stale-holder", "45-xc2-bob-stale-holder", ["confirm this booking before check-in", "No check-in was recorded", "Needs confirmation"], "My bookings", "Bob");

    await direct(context, prefix, "xc2-provider-pending", "46-xc2-provider-pending", ["Bob is the expected guest", "Not checked in", "Current holder"], "Today", "Studio A");

    const provider = await context.newPage();
    await provider.goto(`${baseUrl}/product-preview?view=xc2-provider-fulfilled`, { waitUntil: "networkidle" });
    await assertVisible(provider, "Friday Yoga was fulfilled for Bob.");
    await assertVisible(provider, "Fulfilled");
    await screenshot(provider, prefix, "47-xc2-provider-fulfilled", "Today", "Studio A");
    await provider.getByRole("button", { name: "Review reconciliation" }).click();
    await provider.waitForURL(/view=xc2-provider-reconciled/);
    await assertVisible(provider, "Friday Yoga is fully reconciled.");
    await screenshot(provider, prefix, "48-xc2-provider-reconciled", "Reconciliation", "Studio A");
    await provider.getByRole("button", { name: "View activity" }).click();
    await provider.waitForURL(/view=xc2-provider-history/);
    await assertVisible(provider, "Friday Yoga lifecycle complete.");
    await screenshot(provider, prefix, "49-xc2-provider-history", "Activity", "Studio A");
    await provider.close();

    await direct(context, prefix, "xc2-provider-reconcile-issue", "50-xc2-provider-reconcile-issue", ["not fully reconciled", "Still confirming", "Not complete"], "Reconciliation", "Studio A");
    await direct(context, prefix, "xc2-history-partial", "51-xc2-history-partial", ["still being finalized", "Final reconciliation is still being confirmed", "Pending"], "Activity", "Maya Keller");
    await direct(context, prefix, "xc2-maya-history", "52-xc2-maya-history", ["Friday Yoga recovery complete.", "You recovered 45 USDC", "Booking fulfilled"], "Activity", "Maya Keller");

    await expandProofAndCapture(context, prefix, "xc2-bob-checked-in", "53-xc2-proof-checkin", "Check-in record seam", "My bookings", "Bob");
    await expandProofAndCapture(context, prefix, "xc2-provider-reconciled", "54-xc2-proof-provider", "Provider reconciliation seam", "Reconciliation", "Studio A");
    await expandProofAndCapture(context, prefix, "xc2-maya-history", "55-xc2-proof-receipt", "Recovery receipt seam", "Activity", "Maya Keller");
  } finally {
    await context.close();
    await browser.close();
  }
}

await mkdir(outDir, { recursive: true });
await run({ width: 1440, height: 1000 }, "desktop");
await run({ width: 390, height: 844 }, "mobile");

for (const width of [360, 430, 768, 1024]) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  try {
    for (const [view, label, identity] of [
      ["xc2-bob-ready", "My bookings", "Bob"],
      ["xc2-provider-reconciled", "Reconciliation", "Studio A"],
      ["xc2-maya-history", "Activity", "Maya Keller"],
    ]) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
      await assertNoHorizontalScroll(page);
      await assertNoTechLeak(page);
      await assertHeader(page, label, identity);
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

console.log("Product Workbench XC-02 visual check passed Bob check-in, provider fulfil/reconciliation, three-perspective aftermath/history, fail-closed negative states, proof truth, real shell transitions, and responsive smoke widths.");