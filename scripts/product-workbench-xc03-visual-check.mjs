import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.resolve("artifacts/product-workbench");
const disclaimer = "No LIVE sponsor execution is claimed by this Product Workbench state.";

async function visible(page, text) {
  const matches = page.getByText(text, { exact: false });
  for (let i = 0; i < (await matches.count()); i += 1) if (await matches.nth(i).isVisible()) return;
  throw new Error(`Expected visible text: ${text}`);
}

async function guard(page, label, identity) {
  const body = await page.locator("body").innerText();
  for (const phrase of ["Person A", "Person B", "My passes", "NFT", "HTS", "HCS", "HashScan", "issuer dashboard", "primaryPriceHbar"]) {
    if (body.includes(phrase)) throw new Error(`Legacy/protocol language leaked into XC-03: ${phrase}`);
  }
  if (/0x[0-9a-fA-F]{40}/.test(body) || /\b0\.0\.\d+\b/.test(body)) throw new Error("Raw protocol identifier leaked into XC-03");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`XC-03 horizontal overflow: ${overflow}px`);
  const header = page.locator("header");
  const visibleHeader = (await header.innerText()).replace(/\s+/g, " ");
  const semanticHeader = ((await header.textContent()) ?? "").replace(/\s+/g, " ");
  if (!visibleHeader.includes(label) || !semanticHeader.includes(identity)) {
    throw new Error(`XC-03 header mismatch; expected visible ${label} and semantic ${identity}: visible=${visibleHeader}; full=${semanticHeader}`);
  }
}

async function snap(page, prefix, name, label, identity) {
  await guard(page, label, identity);
  await page.screenshot({ path: path.join(outDir, `${prefix}-${name}.png`), fullPage: true });
}

async function direct(context, prefix, view, name, assertions, label) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
  for (const text of assertions) await visible(page, text);
  await snap(page, prefix, name, label, "Studio A");
  await page.close();
}

async function proof(context, prefix, view, name, title, label) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
  const drawer = page.locator("details").filter({ hasText: "View technical proof" }).first();
  if (!(await drawer.count())) throw new Error(`Missing XC-03 proof drawer: ${view}`);
  if (await drawer.evaluate((el) => el.open)) throw new Error(`XC-03 proof drawer starts expanded: ${view}`);
  await drawer.locator("summary").click();
  await visible(page, "FIXTURE");
  await visible(page, title);
  await visible(page, disclaimer);
  const residual = (await drawer.innerText()).split(disclaimer).join(" ");
  for (const token of ["TESTNET", "MAINNET", "SETTLED", "CONFIRMED ON CHAIN"]) if (residual.includes(token)) throw new Error(`XC-03 fixture proof promoted ${token}`);
  await snap(page, prefix, name, label, "Studio A");
  await page.close();
}

async function run(viewport, prefix) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/product-preview?view=xc3-provider-join`, { waitUntil: "networkidle" });
    await visible(page, "Bring Studio A onto YourTurn.");
    await snap(page, prefix, "56-xc3-provider-join", "Setup", "Studio A");

    await page.getByRole("button", { name: "Continue setup" }).click();
    await page.waitForURL(/view=xc3-provider-profile/);
    await visible(page, "Studio A is ready to add sessions.");
    await snap(page, prefix, "57-xc3-provider-profile", "Setup", "Studio A");

    await page.getByRole("button", { name: "Connect inventory" }).click();
    await page.waitForURL(/view=xc3-provider-inventory-empty/);
    await visible(page, "No sessions are connected yet.");
    await snap(page, prefix, "58-xc3-inventory-empty", "Inventory", "Studio A");

    await page.getByRole("button", { name: "Connect schedule" }).click();
    await page.waitForURL(/view=xc3-provider-inventory-loading/);
    await visible(page, "Connecting your schedule.");
    await snap(page, prefix, "59-xc3-inventory-loading", "Inventory", "Studio A");

    await page.getByRole("button", { name: "Check connection" }).click();
    await page.waitForURL(/view=xc3-provider-inventory$/);
    await visible(page, "Your schedule is connected.");
    await snap(page, prefix, "60-xc3-inventory-connected", "Inventory", "Studio A");

    await page.getByRole("button", { name: "Configure Friday Yoga" }).click();
    await page.waitForURL(/view=xc3-provider-session-draft/);
    await visible(page, "Review Friday Yoga before publishing.");
    await visible(page, "Recovery allowed");
    await visible(page, "Automatic when compliant");
    await snap(page, prefix, "61-xc3-session-draft", "Inventory", "Studio A");

    await page.getByRole("button", { name: "Publish session" }).click();
    await page.waitForURL(/view=xc3-provider-session-published/);
    await visible(page, "Friday Yoga is open for bookings.");
    await visible(page, "Published");
    await snap(page, prefix, "62-xc3-session-published", "Inventory", "Studio A");

    await page.getByRole("button", { name: "Open booking activity" }).click();
    await page.waitForURL(/view=xc3-provider-sale-pending/);
    await visible(page, "booking is being confirmed");
    await visible(page, "Pending");
    await snap(page, prefix, "63-xc3-booking-pending", "Bookings", "Studio A");

    await page.getByRole("button", { name: "Check booking status" }).click();
    await page.waitForURL(/view=xc3-provider-sale-success/);
    await visible(page, "Maya has a confirmed Friday Yoga booking.");
    await visible(page, "Current holder");
    await visible(page, "Maya Keller");
    await snap(page, prefix, "64-xc3-booking-success", "Bookings", "Studio A");

    await page.getByRole("button", { name: /Open today/ }).click();
    await page.waitForURL(/view=xc3-provider-today/);
    await visible(page, "Friday Yoga is ready to operate.");
    await visible(page, "Recovery");
    await snap(page, prefix, "65-xc3-provider-today", "Today", "Studio A");
    await page.close();

    await direct(context, prefix, "xc3-provider-inventory-error", "66-xc3-inventory-error", ["could not connect the schedule", "No customer inventory was created", "Try again"], "Inventory");
    await direct(context, prefix, "xc3-provider-sale-error", "67-xc3-booking-error", ["booking did not complete", "Maya is not shown as the holder", "place available again"], "Bookings");
    await direct(context, prefix, "xc3-provider-today-empty", "68-xc3-today-empty", ["No bookings need attention right now", "Nothing due now"], "Today");
    await direct(context, prefix, "xc3-provider-stale-holder", "69-xc3-stale-holder", ["Current holder needs confirmation", "holder read is stale", "blocked until"], "Today");

    await proof(context, prefix, "xc3-provider-inventory", "70-xc3-proof-inventory", "Inventory connection seam", "Inventory");
    await proof(context, prefix, "xc3-provider-today", "71-xc3-proof-operations", "Provider operations seam", "Today");
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
    for (const [view, label] of [["xc3-provider-join", "Setup"], ["xc3-provider-session-published", "Inventory"], ["xc3-provider-today", "Today"]]) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
      await guard(page, label, "Studio A");
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

console.log("Product Workbench XC-03 visual check passed provider join/setup, inventory connection states, session publish and reusable rules, booking issue/sale states, Today operations, negative fail-closed states, proof truth, real shell transitions, and responsive smoke widths.");
