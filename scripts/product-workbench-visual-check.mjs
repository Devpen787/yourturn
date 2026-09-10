import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PRODUCT_WORKBENCH_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.resolve("artifacts/product-workbench");

const bannedCustomerCopy = [
  "Product journey preview",
  "For this product preview",
  "This first journey is testing assisted recovery",
  "Approval handoff is ready",
  "This UX candidate stops here",
  "Try the booking journey",
];

const legacyBookingCopy = ["live pass", "list your pass for resale"];

async function assertVisible(page, text) {
  const matches = page.getByText(text, { exact: false });
  const count = await matches.count();
  for (let index = 0; index < count; index += 1) {
    if (await matches.nth(index).isVisible()) {
      return;
    }
  }
  throw new Error(`Expected visible text: ${text}`);
}

async function assertNoPrototypeCopy(page) {
  const body = await page.locator("body").innerText();
  for (const phrase of bannedCustomerCopy) {
    if (body.includes(phrase)) {
      throw new Error(`Customer-visible prototype copy leaked: ${phrase}`);
    }
  }
}

async function assertNoLegacyBookingCopy(page) {
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const phrase of legacyBookingCopy) {
    if (body.includes(phrase)) {
      throw new Error(`Legacy pass vocabulary leaked into booking-first customer copy: ${phrase}`);
    }
  }
}

async function assertNoRawWorldIdentifier(page) {
  const body = await page.locator("body").innerText();
  if (/0x[0-9a-fA-F]{40}/.test(body)) {
    throw new Error("Raw delegated-agent or human identifier leaked into the customer surface");
  }
}

async function assertCanonicalBookingLinks(page) {
  const canonicalLandingEntry = "/product-preview";
  const bookingLinks = page.getByRole("link", { name: "Open my bookings" });
  const bookingLinkCount = await bookingLinks.count();
  if (bookingLinkCount < 1) {
    throw new Error("Expected at least one Open my bookings link on landing");
  }

  for (let index = 0; index < bookingLinkCount; index += 1) {
    const href = await bookingLinks.nth(index).getAttribute("href");
    if (href !== canonicalLandingEntry) {
      throw new Error(
        `Landing booking CTA diverged from canonical entry state: ${href ?? "missing href"}`
      );
    }
  }

  const headerLink = page.getByRole("link", { name: "My bookings", exact: true }).first();
  const headerHref = await headerLink.getAttribute("href");
  if (headerHref !== canonicalLandingEntry) {
    throw new Error(
      `Home header My bookings diverged from canonical entry state: ${headerHref ?? "missing href"}`
    );
  }
}

async function assertMobileLandingHeader(page, viewport) {
  if (viewport.width > 400) {
    return;
  }

  const providerLink = page.getByRole("link", { name: "Provider dashboard", exact: true });
  if ((await providerLink.count()) > 0 && (await providerLink.first().isVisible())) {
    throw new Error("Provider dashboard must not dominate the compact customer landing header");
  }

  const registerLink = page.getByRole("link", { name: "Register", exact: true });
  if ((await registerLink.count()) > 0 && (await registerLink.first().isVisible())) {
    throw new Error("Register must collapse out of the compact 390px landing header");
  }

  await assertVisible(page, "My bookings");
  await assertVisible(page, "Sign in");
}

async function screenshot(page, prefix, name) {
  await page.screenshot({
    path: path.join(outDir, `${prefix}-${name}.png`),
    fullPage: true,
  });
}

async function inspectRejectedState(context, viewport, prefix) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/product-preview?view=ledger-rejected`, { waitUntil: "networkidle" });
  await assertVisible(page, "Approval was rejected on your Ledger.");
  await assertVisible(page, "no recovery authority was created");
  await assertVisible(page, "Not authorized");
  await assertNoRawWorldIdentifier(page);
  await screenshot(page, prefix, "10-ledger-rejected");
  await page.close();
}

async function runJourney(browser, viewport, prefix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertVisible(page, "Book the spot.");
  await assertVisible(page, "Open my bookings");
  await assertCanonicalBookingLinks(page);
  await assertNoLegacyBookingCopy(page);
  await assertMobileLandingHeader(page, viewport);
  await screenshot(page, prefix, "01-landing");

  await page.getByRole("link", { name: "Open my bookings" }).first().click();
  await page.waitForURL(/\/product-preview$/);
  await assertNoPrototypeCopy(page);
  await assertVisible(page, "Maya Keller");
  await screenshot(page, prefix, "02-entry");

  await page.getByRole("button", { name: "Open my bookings" }).click();
  await assertVisible(page, "Good evening, Maya.");
  await assertVisible(page, "Friday Yoga");
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "03-bookings");

  await page.getByText("View booking →", { exact: true }).click();
  await assertVisible(page, "What do you want to do?");
  await assertVisible(page, "Change plans");
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "04-booking-detail");

  await page.getByRole("button", { name: "Change plans" }).click();
  await assertVisible(page, "What would help most?");

  await page.getByRole("button", { name: /Find someone to take it/ }).click();
  await assertVisible(page, "isn’t available for Friday Yoga right now");
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "05-change-plans");

  await page.getByRole("button", { name: /Let YourTurn handle it/ }).click();
  await assertVisible(page, "Only this booking");
  await assertVisible(page, "40");
  await assertVisible(page, "USDC");
  await assertVisible(page, "Tomorrow · 17:00");
  await assertVisible(page, "Cancel this booking.");
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "06-recovery-limits");

  await page.getByRole("checkbox").check();
  const continueButton = page.getByRole("button", { name: "Continue to secure approval" });
  if (await continueButton.isDisabled()) {
    throw new Error("Secure-approval handoff stayed disabled after scope acknowledgement");
  }
  await continueButton.click();

  await assertVisible(page, "Not authorized yet");
  await assertVisible(page, "Friday Yoga only");
  const approvalButton = page.getByRole("button", { name: "Approve on secure device" });
  if (await approvalButton.isDisabled()) {
    throw new Error("YT-05 continuation did not activate the Golden secure-approval handoff");
  }
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "07-authorization-boundary");

  await approvalButton.click();
  await assertVisible(page, "Ledger not connected.");
  await assertVisible(page, "40 USDC");
  await assertVisible(page, "No recovery authority exists yet");
  await assertNoRawWorldIdentifier(page);
  await screenshot(page, prefix, "08-ledger-not-ready");

  await page.getByRole("button", { name: "Connect Ledger" }).click();
  await assertVisible(page, "Waiting for your Ledger.");
  await assertVisible(page, "rejecting or cancelling creates no authority");
  await screenshot(page, prefix, "09-ledger-waiting");

  await inspectRejectedState(context, viewport, prefix);

  await page.getByRole("button", { name: "Cancel approval" }).click();
  await assertVisible(page, "Approval cancelled.");
  await assertVisible(page, "No mandate was created");
  await assertVisible(page, "Not authorized");
  await screenshot(page, prefix, "11-ledger-cancelled");

  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Connect Ledger" }).click();
  await page.getByRole("button", { name: "Check approval status" }).click();
  await assertVisible(page, "Approved on your Ledger.");
  await assertVisible(page, "Authorized");
  await assertVisible(page, "40 USDC");
  await screenshot(page, prefix, "12-ledger-approved");

  await page.getByRole("button", { name: "View active recovery" }).click();
  await assertVisible(page, "Recovery active");
  await assertVisible(page, "Exact delegated agent verified");
  await assertVisible(page, "Human-backed");
  await assertVisible(page, "Stop recovery");
  await assertNoRawWorldIdentifier(page);
  await screenshot(page, prefix, "13-recovery-active");

  await page.getByRole("button", { name: "See latest offer" }).click();
  await assertVisible(page, "32 USDC was not accepted.");
  await assertVisible(page, "below your 40 USDC minimum");
  await assertVisible(page, "No booking transfer. No settlement.");
  await assertVisible(page, "Offer blocked");
  await screenshot(page, prefix, "14-offer-blocked");

  await page.getByRole("button", { name: "Lower my minimum" }).click();
  await assertVisible(page, "Lowering your minimum needs a new authorization.");
  await assertVisible(page, "Current authority");
  await assertVisible(page, "Proposed replacement");
  await assertVisible(page, "30 USDC");
  await screenshot(page, prefix, "15-reauthorize");

  await page.getByRole("button", { name: "Review 30 USDC authorization" }).click();
  await assertVisible(page, "Connect your Ledger to authorize recovery.");
  await assertVisible(page, "30 USDC");
  await assertVisible(page, "current 40 USDC authority stays active");
  await screenshot(page, prefix, "16-reauthorize-ledger");

  await page.getByRole("button", { name: "Keep current 40 USDC rule" }).click();
  await assertVisible(page, "32 USDC was not accepted.");
  await page.getByRole("button", { name: "Keep looking" }).click();
  await assertVisible(page, "45 USDC is within your limits.");
  await assertVisible(page, "No new prompt");
  await assertVisible(page, "No extra permission needed.");
  await screenshot(page, prefix, "17-offer-allowed");

  await page.getByRole("button", { name: "Refresh recovery status" }).click();
  await assertVisible(page, "You recovered 45 USDC.");
  await assertVisible(page, "Transferred");
  await assertVisible(page, "no longer available as one of your usable bookings");
  await screenshot(page, prefix, "18-recovery-success");

  const proof = page.getByText("View technical proof", { exact: true });
  await proof.click();
  await assertVisible(page, "FIXTURE");
  await assertVisible(page, "Hedera atomic-recovery seam");
  await screenshot(page, prefix, "19-recovery-proof");

  await page.getByRole("button", { name: "Back to my bookings" }).click();
  await assertVisible(page, "Recently recovered");
  await assertVisible(page, "Recovered 45 USDC");
  const usableFridayYoga = page.getByText("View booking →", { exact: true });
  if ((await usableFridayYoga.count()) > 0) {
    throw new Error("Friday Yoga still exposes a usable booking action after recovery success");
  }
  await screenshot(page, prefix, "20-bookings-after-recovery");

  await context.close();
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  await runJourney(browser, { width: 1440, height: 1000 }, "desktop");
  await runJourney(browser, { width: 390, height: 844 }, "mobile");
} finally {
  await browser.close();
}

console.log(
  "Product Workbench visual check passed YT-01 through YT-08 at desktop and mobile widths."
);
