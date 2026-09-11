#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { buildReviewerQualificationBundle } from "./qualification.mjs";

function usage() {
  console.log(`Verify one identical Recovery Mandate across Ledger approve/reject/cancel evidence

Usage:
  npm run bundle -- \\
    --prepared /path/to/prepared.json \\
    --approve /path/to/approve-proof.json \\
    --reject /path/to/reject-proof.json \\
    --cancel /path/to/cancel-proof.json \\
    --out /path/to/reviewer-bundle.json

The output intentionally omits the full mandate body, session cookies, and device name.
The approved signature and public signer address remain because reviewers need them
for cryptographic verification.
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
  for (const key of ["prepared", "approve", "reject", "cancel", "out"]) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [key, path.resolve(value)])
  );
}

async function readJson(file, label) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} could not be read as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const [preparedRaw, approveProof, rejectProof, cancelProof, packageRaw] = await Promise.all([
    readJson(args.prepared, "prepared mandate"),
    readJson(args.approve, "approve proof"),
    readJson(args.reject, "reject proof"),
    readJson(args.cancel, "cancel proof"),
    readJson(new URL("./package.json", import.meta.url), "device proof package"),
  ]);

  const bundle = buildReviewerQualificationBundle({
    preparedRaw,
    approveProof,
    rejectProof,
    cancelProof,
    tooling: {
      deviceManagementKit: packageRaw.dependencies?.["@ledgerhq/device-management-kit"] ?? null,
      ethereumSignerKit: packageRaw.dependencies?.["@ledgerhq/device-signer-kit-ethereum"] ?? null,
      nodeHidTransport: packageRaw.dependencies?.["@ledgerhq/device-transport-kit-node-hid"] ?? null,
      contextModule: packageRaw.dependencies?.["@ledgerhq/context-module"] ?? null,
      ethers: packageRaw.dependencies?.ethers ?? null,
    },
  });

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log("Ledger identical-mandate device qualification: PASS");
  console.log(`- mandateId: ${bundle.mandateId}`);
  console.log(`- digest: ${bundle.mandateDigest}`);
  console.log(`- signer: ${bundle.signerAddress}`);
  console.log("- reject: observed; no signature; no activation");
  console.log("- cancel: DMK Stopped observed; no signature; no activation");
  console.log("- approve: Completed observed; signature recovers enrolled signer");
  console.log("- authority: still CONFIGURED until downstream activation is separately exercised");
  console.log(`- reviewer bundle: ${args.out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
