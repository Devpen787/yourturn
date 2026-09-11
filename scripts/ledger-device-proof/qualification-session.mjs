#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

function usage() {
  console.log(`Run the complete local Ledger Recovery Mandate qualification ceremony

Usage:
  npm run qualify -- \\
    --actor guestA \\
    --prepared ../../output/ledger-qualification/prepared.json \\
    --out-dir ../../output/ledger-qualification/session-1

Optional:
  --base-url http://127.0.0.1:3000

Order is fixed and uses the exact same prepared file:
  1. reject on the Ledger;
  2. host cancel after DMK exposes the typed-data interaction;
  3. approve on the Ledger;
  4. verify a reviewer-safe identical-mandate bundle;
  5. exercise localhost-only downstream activation: wrong signature rejected,
     hardware signature accepted once, replay rejected.

No recovery execution endpoint is called and no funds are moved.
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") return { help: true };
    if (!token.startsWith("--")) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${token}`);
    args[key] = value;
    i += 1;
  }
  if (!args.actor || !["guestA", "guestB"].includes(args.actor)) {
    throw new Error("--actor must be guestA or guestB");
  }
  if (!args.prepared) throw new Error("--prepared is required");
  if (!args["out-dir"]) throw new Error("--out-dir is required");
  return {
    actor: args.actor,
    prepared: path.resolve(args.prepared),
    outDir: path.resolve(args["out-dir"]),
    baseUrl: args["base-url"] ?? DEFAULT_BASE_URL,
  };
}

async function assertFreshEvidenceDirectory(outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const existing = await fs.readdir(outDir);
  if (existing.length > 0) {
    throw new Error(
      `--out-dir must be empty so evidence from different mandates cannot be mixed: ${outDir}`
    );
  }
}

async function runNode(scriptName, args) {
  const script = path.join(HERE, scriptName);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: HERE,
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          `${scriptName} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`
        )
      );
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  await fs.access(args.prepared);
  await assertFreshEvidenceDirectory(args.outDir);

  const reject = path.join(args.outDir, "reject-proof.json");
  const cancel = path.join(args.outDir, "cancel-proof.json");
  const approve = path.join(args.outDir, "approve-proof.json");
  const bundle = path.join(args.outDir, "reviewer-bundle.json");
  const downstream = path.join(args.outDir, "downstream-proof.json");

  console.log("\n=== Ledger qualification 1/5: DEVICE REJECT ===");
  console.log("When the Recovery Mandate is shown on Ledger, reject it on the device.");
  await runNode("device-proof.mjs", [
    "--prepared",
    args.prepared,
    "--expect",
    "reject",
    "--out",
    reject,
  ]);

  console.log("\n=== Ledger qualification 2/5: HOST CANCEL ===");
  console.log("Do not approve or reject. The runner will call DMK cancel() when the typed-data interaction becomes observable.");
  await runNode("device-proof.mjs", [
    "--prepared",
    args.prepared,
    "--expect",
    "cancel",
    "--out",
    cancel,
  ]);

  console.log("\n=== Ledger qualification 3/5: DEVICE APPROVE ===");
  console.log("Review the same Recovery Mandate and approve it on the Ledger.");
  await runNode("device-proof.mjs", [
    "--prepared",
    args.prepared,
    "--expect",
    "approve",
    "--out",
    approve,
  ]);

  console.log("\n=== Ledger qualification 4/5: IDENTICAL-MANDATE BUNDLE ===");
  await runNode("qualification-check.mjs", [
    "--prepared",
    args.prepared,
    "--approve",
    approve,
    "--reject",
    reject,
    "--cancel",
    cancel,
    "--out",
    bundle,
  ]);

  console.log("\n=== Ledger qualification 5/5: DOWNSTREAM NON-BYPASS ===");
  await runNode("downstream-check.mjs", [
    "--actor",
    args.actor,
    "--base-url",
    args.baseUrl,
    "--prepared",
    args.prepared,
    "--approve",
    approve,
    "--reject",
    reject,
    "--cancel",
    cancel,
    "--out",
    downstream,
  ]);

  console.log("\nLedger Recovery Mandate qualification session: PASS");
  console.log(`Reviewer-safe device bundle: ${bundle}`);
  console.log(`Reviewer-safe downstream proof: ${downstream}`);
  console.log("No production/mainnet deployment or recovery execution was performed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
