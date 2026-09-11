import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  bookingFixture, bobFixture, committedPaymentFixture, paymentErrorFixture, seededContext,
} from "./product-workbench-booking-fixtures.mjs";

const baseUrl = process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.resolve("artifacts/product-workbench");

async function assertVisible(page, text) {
  const matches = page.getByText(text, { exact: false });
  const count = await matches.count();
  for (let index = 0; index < count; index += 1) if (await matches.nth(index).isVisible()) return;
  throw new Error(`Expected visible text: ${text}`);
}
async function assertAbsent(page, text) {
  const body = await page.locator("body").innerText();
  if (body.includes(text)) throw new Error(`Unexpected customer-visible text: ${text}`);
}
async function assertNoLegacyPersonaOrProofLeak(page) {
  const body = await page.locator("body").innerText();
  for (const phrase of ["Person A", "Person B", "My passes", "Ref #", "buyer wallet", "receiver account"]) {
    if (body.includes(phrase)) throw new Error(`Legacy/demo vocabulary leaked into XC-01: ${phrase}`);
  }
  if (/0x[0-9a-fA-F]{40}/.test(body)) throw new Error("Raw World/customer identifier leaked into XC-01 product surface");
}
async function assertAudienceHeader(page) {
  const url = new URL(page.url());
  const view = url.searchParams.get("view") ?? "";
  if (!view.startsWith("xc-")) return;
  const headerText = (await page.locator("header").textContent()) ?? "";
  if (view.startsWith("xc-provider")) {
    if (!headerText.includes("Studio A") || !headerText.includes("Friday Yoga")) throw new Error(`Provider XC-01 header missing Studio A/Friday Yoga context: ${headerText}`);
    if (headerText.includes("Maya Keller") || headerText.includes("Bob")) throw new Error(`Provider XC-01 header leaked customer identity: ${headerText}`);
    return;
  }
  if (!headerText.includes("Bob") || headerText.includes("Maya Keller")) throw new Error(`Acquirer XC-01 header must identify Bob without Maya leakage: ${headerText}`);
  if (view === "xc-bob-success") {
    if (!headerText.includes("My bookings") || headerText.includes("Find a spot")) throw new Error(`Bob success header must return to My bookings and leave acquisition context: ${headerText}`);
  } else if (!headerText.includes("Find a spot")) throw new Error(`Bob acquisition header must stay in Find a spot: ${headerText}`);
}
async function assertNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`XC-01 introduced horizontal document overflow: ${overflow}px`);
}

const PROOF_DISCLAIMER = "No LIVE sponsor execution is claimed by this Product Workbench state.";
const FORBIDDEN_EVIDENCE_TOKENS = [/\bLIVE\b/, /\bTESTNET\b/, /\bMAINNET\b/, /\bSETTLED\b/, /\bCONFIRMED ON CHAIN\b/];
const FORBIDDEN_IDENTIFIERS = [
  { re: /0x[0-9a-fA-F]{40}/, label: "raw EVM/World address" },
  { re: /\b[0-9a-fA-F]{64}\b/, label: "raw World nullifier / tx hash" },
  { re: /\b0\.0\.\d+\b/, label: "raw Hedera account/token id" },
];
async function assertProofDrawerTruth(page, expectedTitle) {
  const drawer = page.locator("details").filter({ hasText: "View technical proof" }).first();
  if ((await drawer.count()) === 0) throw new Error(`No technical proof drawer on this XC-01 state (expected "${expectedTitle}")`);
  if (await drawer.evaluate((el) => el.open)) throw new Error(`Proof drawer starts expanded: ${expectedTitle}`);
  await drawer.locator("summary").click();
  const drawerText = (await drawer.innerText()).replace(/\s+/g, " ").trim();
  if (!drawerText.includes("FIXTURE") || !drawerText.includes(expectedTitle) || !drawerText.includes(PROOF_DISCLAIMER)) throw new Error(`Proof drawer truth mismatch: ${drawerText}`);
  const residual = drawerText.split(PROOF_DISCLAIMER).join(" ");
  for (const token of FORBIDDEN_EVIDENCE_TOKENS) if (token.test(residual)) throw new Error(`Proof drawer promotes fixture evidence (${token}) in "${expectedTitle}"`);
  for (const { re, label } of FORBIDDEN_IDENTIFIERS) if (re.test(drawerText)) throw new Error(`Proof drawer leaked ${label} in "${expectedTitle}"`);
}
async function screenshot(page, prefix, name) {
  await assertNoHorizontalScroll(page);
  await assertNoLegacyPersonaOrProofLeak(page);
  await assertAudienceHeader(page);
  await page.screenshot({ path: path.join(outDir, `${prefix}-${name}.png`), fullPage: true });
}

async function inspectDirectState(browser, viewport, prefix, view, name, assertions, fixture) {
  const context = await seededContext(browser, viewport, fixture);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
    for (const text of assertions) await assertVisible(page, text);
    await screenshot(page, prefix, name);
  } finally {
    await context.close();
  }
}

async function runXc01(browser, viewport, prefix) {
  await inspectDirectState(browser, viewport, prefix, "xc-provider-policy", "23-xc-provider-policy", ["Friday Yoga can recover without a staff approval queue.", "Recovery allowed", "Transfer cutoff", "Eligible Studio A customer", "none for an individual handoff"], bookingFixture());
  await inspectDirectState(browser, viewport, prefix, "xc-provider-blocked", "24-xc-provider-policy-blocked", ["Recovery stopped before the handoff.", "Recovery blocked", "No booking moved. Bob was not charged.", "Failed closed"], bookingFixture({}, { providerPolicy: "blocked" }));

  const context = await seededContext(browser, viewport, bookingFixture());
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/product-preview?view=xc-find`, { waitUntil: "networkidle" });
    await assertVisible(page, "A spot opened for Friday Yoga.");
    await assertVisible(page, "45 USDC");
    await assertVisible(page, "Available");
    await assertVisible(page, "Studio A conditions apply");
    await screenshot(page, prefix, "25-xc-bob-find");

    await page.getByRole("button", { name: /View Friday Yoga/ }).click();
    await assertVisible(page, "This booking is available to you.");
    await assertVisible(page, "Eligible");
    await assertVisible(page, "Commit 45 USDC");
    await assertVisible(page, "None for this session");
    await screenshot(page, prefix, "26-xc-bob-eligible");

    await inspectDirectState(browser, viewport, prefix, "xc-eligibility-failed", "27-xc-bob-ineligible", ["This account is not eligible for the booking.", "Not eligible", "No payment commitment was created", "existing booking holder is unchanged"], bookingFixture({}, { eligibility: "ineligible" }));
    await inspectDirectState(browser, viewport, prefix, "xc-taken", "28-xc-bob-already-taken", ["This Friday Yoga spot is no longer available.", "Already taken", "You have not paid for this booking."], bookingFixture({}, { availability: "taken" }));

    await page.getByRole("button", { name: "Commit 45 USDC" }).click();
    await assertVisible(page, "Confirming your 45 USDC commitment.");
    await assertVisible(page, "Payment pending");
    await assertVisible(page, "Nothing has moved yet.");
    await assertAbsent(page, "Friday Yoga is now yours.");
    await screenshot(page, prefix, "29-xc-payment-pending");

    await inspectDirectState(browser, viewport, prefix, "xc-payment-error", "30-xc-payment-error", ["We couldn't confirm the 45 USDC payment.", "No booking moved", "no payment was treated as complete", "Try payment again"], paymentErrorFixture());

    await page.getByRole("button", { name: "Check payment status" }).click();
    await assertVisible(page, "Your 45 USDC commitment is ready.");
    await assertVisible(page, "45 USDC committed");
    await assertVisible(page, "Not changed yet");
    await assertVisible(page, "payment commitment alone is not a completed recovery");
    await screenshot(page, prefix, "31-xc-opportunity-ready");

    await page.getByRole("button", { name: "Check handoff status" }).click();
    await assertVisible(page, "The handoff is being confirmed.");
    await assertVisible(page, "Checking final state");
    await assertVisible(page, "Holder state");
    await assertVisible(page, "Reconciling");
    await assertAbsent(page, "Friday Yoga is now yours.");
    await screenshot(page, prefix, "32-xc-reconciling");

    await inspectDirectState(browser, viewport, prefix, "xc-partial", "33-xc-partial-unknown", ["We're still confirming who holds Friday Yoga.", "Needs reconciliation", "Booking holder", "Still checking", "should not attempt check-in yet"], committedPaymentFixture("unknown"));

    await page.getByRole("button", { name: "Refresh booking" }).click();
    await page.waitForURL((url) => url.searchParams.get("view") === "xc-bob-success");
    await assertVisible(page, "Friday Yoga is now yours.");
    await assertVisible(page, "Booked for");
    await assertVisible(page, "Bob");
    await assertVisible(page, "Confirmed");
    await assertVisible(page, "Use booking");
    await assertAudienceHeader(page);
    await screenshot(page, prefix, "34-xc-bob-booking");

    await page.getByRole("button", { name: "Use booking" }).click();
    await assertVisible(page, "Check-in opens 30 minutes before Friday Yoga.");
    await assertAudienceHeader(page);
    await screenshot(page, prefix, "35-xc-bob-use-booking");
  } finally {
    await context.close();
  }

  await inspectDirectState(browser, viewport, prefix, "xc-provider-final", "36-xc-provider-final-holder", ["Bob is now the current holder.", "Current holder", "Previous holder", "Maya Keller", "No manual approval required", "Friday Yoga remains a valid booking."], bobFixture());
}

async function runProofTruth(browser, viewport, prefix) {
  const variants = [
    { view: "xc-provider-policy", name: "37-xc-proof-provider", title: "Provider-rule integration seam", fixture: bookingFixture() },
    { view: "xc-eligibility", name: "38-xc-proof-acquirer", title: "Eligibility and payment integration seam", fixture: bookingFixture({}, { eligibility: "eligible" }) },
    { view: "xc-opportunity", name: "39-xc-proof-handoff", title: "Cross-holder reconciliation seam", fixture: committedPaymentFixture() },
  ];
  for (const { view, name, title, fixture } of variants) {
    const context = await seededContext(browser, viewport, fixture);
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
      await assertProofDrawerTruth(page, title);
      await screenshot(page, prefix, name);
    } finally {
      await context.close();
    }
  }
}

async function runBreakpointSmoke(browser, width) {
  const checks = [
    ["xc-find", bookingFixture()],
    ["xc-payment-pending", bookingFixture({}, { eligibility: "eligible", payment: "pending", paymentAttempts: 1 })],
    ["xc-provider-final", bobFixture()],
  ];
  for (const [view, fixture] of checks) {
    const context = await seededContext(browser, { width, height: 900 }, fixture);
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/product-preview?view=${view}`, { waitUntil: "networkidle" });
      await assertNoHorizontalScroll(page);
      await assertNoLegacyPersonaOrProofLeak(page);
      await assertAudienceHeader(page);
    } finally {
      await context.close();
    }
  }
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await runXc01(browser, { width: 1440, height: 1000 }, "desktop");
  await runXc01(browser, { width: 390, height: 844 }, "mobile");
  await runProofTruth(browser, { width: 1440, height: 1000 }, "desktop");
  await runProofTruth(browser, { width: 390, height: 844 }, "mobile");
  for (const width of [360, 430, 768, 1024]) await runBreakpointSmoke(browser, width);
} finally {
  await browser.close();
}
console.log("Product Workbench XC-01 visual check passed with explicit source-state fixture preconditions; URLs create no payment/holder facts, interactive Bob success remains 40/45 scoped, and FIXTURE/non-LIVE proof truth is preserved.");
