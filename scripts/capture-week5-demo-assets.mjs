import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    baseUrl: "https://yourturn-sage.vercel.app",
    serial: "193",
    role: "guestA",
    outputDir: "output/week5-proof-assets",
    width: 1400,
    height: 2200,
  };
  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) args.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--serial=")) args.serial = arg.slice("--serial=".length);
    else if (arg.startsWith("--role=")) args.role = arg.slice("--role=".length);
    else if (arg.startsWith("--out=")) args.outputDir = arg.slice("--out=".length);
    else if (arg.startsWith("--width=")) args.width = Number(arg.slice("--width=".length));
    else if (arg.startsWith("--height=")) args.height = Number(arg.slice("--height=".length));
    else if (arg === "--help") args.help = true;
  }
  return args;
}

function showHelp() {
  console.log(`Usage:
  node scripts/capture-week5-demo-assets.mjs [options]

Options:
  --base-url=https://yourturn-sage.vercel.app
  --serial=193
  --role=guestA
  --out=output/week5-proof-assets
  --width=1400
  --height=2200

This script:
- logs into the demo as the given role;
- captures /my-bookings, /resale/:serial?mode=recovery, /week5-proof, and API proof routes;
- writes screenshot files into the output directory.
`);
}

function normalizeUrl(base) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function shotConfig(label, url, filename) {
  return { label, url, filename };
}

async function loginAsRole(context, baseUrl, role) {
  const login = await context.request.post(`${baseUrl}/api/auth/demo-login`, {
    data: { role },
  });
  if (!login.ok()) {
    const body = await login.text();
    throw new Error(`demo login failed for ${role}: ${login.status()} ${login.statusText()} ${body}`);
  }
  const body = await login.json();
  if (!body?.ok) {
    throw new Error(`Demo login endpoint returned ok:false: ${JSON.stringify(body)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    showHelp();
    return;
  }

  const baseUrl = normalizeUrl(args.baseUrl);
  const outputDir = args.outputDir;
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: args.width, height: args.height },
  });
  const page = await context.newPage();

  try {
    await loginAsRole(context, baseUrl, args.role);

    const shots = [
      shotConfig("app-home", `${baseUrl}/`, "cover-home.png"),
      shotConfig("my-bookings", `${baseUrl}/my-bookings`, "02-my-bookings.png"),
      shotConfig(
        "recovery-page",
        `${baseUrl}/resale/${args.serial}?mode=recovery`,
        "01-resale-recovery.png"
      ),
      shotConfig("week5-proof", `${baseUrl}/week5-proof`, "week5-proof.png"),
      shotConfig("api-week5-proof", `${baseUrl}/api/agent/week5-proof`, "week5-proof-json.png"),
      shotConfig(
        "api-x402",
        `${baseUrl}/api/x402/recovery-policy`,
        "04-x402-json.png"
      ),
      shotConfig(
        "api-wallet-budget",
        `${baseUrl}/api/wallet-budget/config`,
        "05-wallet-budget-json.png"
      ),
      shotConfig(
        "api-nft-studio",
        `${baseUrl}/api/nft-studio/proof`,
        "06-nft-studio-json.png"
      ),
    ];

    for (const shot of shots) {
      try {
        const response = await page.goto(shot.url, { waitUntil: "networkidle" });
        if (!response) {
          throw new Error("No response");
        }
        if (!response.ok()) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Route failed (${response.status()}) ${shot.url}: ${text.slice(0, 140)}`
          );
        }
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(outputDir, shot.filename),
          fullPage: true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeFileSync(path.join(outputDir, "capture-errors.log"), `${message}\n`, { flag: "a" });
      }
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      role: args.role,
      serial: args.serial,
      outputDir,
      shots: shots.map((shot) => shot.filename),
      errors: 0,
    };
    writeFileSync(
      path.join(outputDir, "week5-proof-assets.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    console.log(JSON.stringify({ ok: true, ...manifest }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
