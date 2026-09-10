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

async function assertVisible(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  if (!(await locator.isVisible())) {
    throw new Error(`Expected visible text: ${text}`);
  }
}

async function assertNoPrototypeCopy(page) {
  const body = await page.locator("body").innerText();
  for (const phrase of bannedCustomerCopy) {
    if (body.includes(phrase)) {
      throw new Error(`Customer-visible prototype copy leaked: ${phrase}`);
    }
  }
}

async function screenshot(page, prefix, name) {
  await page.screenshot({
    path: path.join(outDir, `${prefix}-${name}.png`),
    fullPage: true,
  });
}

async function runJourney(browser, viewport, prefix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertVisible(page, "Book the spot.");
  await assertVisible(page, "Open my bookings");
  await screenshot(page, prefix, "01-landing");

  await page.getByRole("link", { name: "Open my bookings" }).first().click();
  await page.waitForURL(/\/product-preview/);
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
  await page.getByRole("button", { name: "Change plans" }).click();
  await assertVisible(page, "What would help most?");

  await page.getByRole("button", { name: /Find someone to take it/ }).click();
  await assertVisible(page, "isn’t available for Friday Yoga right now");
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "04-change-plans");

  await page.getByRole("button", { name: /Let YourTurn handle it/ }).click();
  await assertVisible(page, "Only this booking");
  await assertVisible(page, "40");
  await assertVisible(page, "USDC");
  await assertVisible(page, "Tomorrow · 17:00");
  await assertVisible(page, "Cancel this booking.");
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "05-recovery-limits");

  await page.getByRole("checkbox").check();
  const continueButton = page.getByRole("button", { name: "Continue to secure approval" });
  if (await continueButton.isDisabled()) {
    throw new Error("Secure-approval handoff stayed disabled after scope acknowledgement");
  }
  await continueButton.click();

  await assertVisible(page, "Not authorized yet");
  await assertVisible(page, "Friday Yoga only");
  const approvalButton = page.getByRole("button", { name: "Approve on secure device" });
  if (!(await approvalButton.isDisabled())) {
    throw new Error("UX-only candidate must not expose an enabled authorization action");
  }
  await assertNoPrototypeCopy(page);
  await screenshot(page, prefix, "06-authorization-boundary");

  await page.getByRole("link", { name: "My bookings" }).click();
  await page.waitForURL(/\/product-preview\?view=bookings/);
  await assertVisible(page, "Good evening, Maya.");
  await assertNoPrototypeCopy(page);

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

console.log("Product Workbench visual check passed at desktop and mobile widths.");
