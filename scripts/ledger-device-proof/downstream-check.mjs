#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { buildReviewerQualificationBundle } from "./qualification.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const INVALID_SIGNATURE = `0x${"11".repeat(64)}1b`;

function usage() {
  console.log(`Exercise the local downstream Recovery Mandate activation boundary

Usage:
  npm run downstream -- \\
    --actor guestA \\
    --prepared /path/to/prepared.json \\
    --approve /path/to/approve-proof.json \\
    --reject /path/to/reject-proof.json \\
    --cancel /path/to/cancel-proof.json \\
    --out /path/to/downstream-proof.json

Optional:
  --base-url http://127.0.0.1:3000

This script is localhost-only. It first proves a syntactically valid but wrong
signature cannot activate the mandate, then activates with the hardware-produced
approved signature, then proves the identical signature cannot be replayed.
It does not call any recovery execution endpoint, Hedera transfer endpoint, or
legacy approval-grant endpoint, and it does not move funds.
`);
}

function assertLocalBaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("--base-url must be a valid URL");
  }
  const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error("downstream qualification is locked to a local app; remote/prod URLs are refused");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("--base-url must use http or https");
  }
  return url.toString().replace(/\/$/, "");
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
  for (const key of ["prepared", "approve", "reject", "cancel", "out"]) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }
  return {
    actor: args.actor,
    prepared: path.resolve(args.prepared),
    approve: path.resolve(args.approve),
    reject: path.resolve(args.reject),
    cancel: path.resolve(args.cancel),
    out: path.resolve(args.out),
    baseUrl: assertLocalBaseUrl(args["base-url"] ?? DEFAULT_BASE_URL),
  };
}

async function readJson(file, label) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} could not be read as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function firstCookie(response) {
  const getSetCookie = response.headers.getSetCookie?.();
  const raw = Array.isArray(getSetCookie) && getSetCookie.length > 0
    ? getSetCookie[0]
    : response.headers.get("set-cookie");
  if (!raw) throw new Error("demo login returned no session cookie");
  return raw.split(";", 1)[0];
}

async function readResponse(response) {
  try {
    return await response.json();
  } catch {
    return { ok: false, error: { message: `non-JSON response HTTP ${response.status}` } };
  }
}

function scalar(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function assertActivationMatchesPrepared(activation, preparedRaw, bundle) {
  if (activation?.ok !== true || activation?.state !== "active") {
    throw new Error("approved hardware signature did not create the active Recovery Mandate");
  }
  if (activation.mandateId !== bundle.mandateId) {
    throw new Error("activation mandateId diverges from the hardware-approved mandate");
  }
  if (String(activation.digest ?? "").toLowerCase() !== bundle.mandateDigest.toLowerCase()) {
    throw new Error("activation digest diverges from the hardware-approved mandate");
  }
  if (String(activation.signerAddress ?? "").toLowerCase() !== bundle.signerAddress.toLowerCase()) {
    throw new Error("activation signer diverges from the hardware-approved signer");
  }
  const expected = preparedRaw.mandate;
  const actual = activation.authority;
  if (!expected || !actual) throw new Error("activation response is missing exact authority scope");
  for (const key of [
    "agentId",
    "bookingTokenId",
    "bookingSerial",
    "allowedAction",
    "minimumRecoveryAtomicUnits",
    "settlementAsset",
    "cancellationAllowed",
  ]) {
    if (scalar(actual[key]) !== scalar(expected[key])) {
      throw new Error(`activation authority diverges from hardware-approved mandate at ${key}`);
    }
  }
  const version = Number(activation.authorityStateVersion);
  if (!Number.isSafeInteger(version) || version < 0 || version % 2 !== 0) {
    throw new Error("activation did not return a stable even authority-state version");
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
    },
  });

  const health = await fetch(`${args.baseUrl}/login`, { redirect: "manual" });
  if (!health.ok) throw new Error(`local app health check failed HTTP ${health.status}`);

  const loginResponse = await fetch(`${args.baseUrl}/api/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: args.actor }),
    redirect: "manual",
  });
  const loginData = await readResponse(loginResponse);
  if (!loginResponse.ok || loginData?.ok !== true) {
    throw new Error(`demo login failed HTTP ${loginResponse.status}`);
  }
  const cookie = firstCookie(loginResponse);

  const activate = async (signature) => {
    const response = await fetch(`${args.baseUrl}/api/ledger/recovery-mandate/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        mandateId: bundle.mandateId,
        signature,
      }),
      redirect: "manual",
    });
    return { response, data: await readResponse(response) };
  };

  const invalid = await activate(INVALID_SIGNATURE);
  if (invalid.response.ok || invalid.data?.ok === true) {
    throw new Error("wrong software signature unexpectedly activated Recovery Mandate authority");
  }

  const approvedSignature = approveProof.signature;
  if (typeof approvedSignature !== "string") {
    throw new Error("approved device proof is missing its hardware-produced signature");
  }
  const approved = await activate(approvedSignature);
  if (!approved.response.ok) {
    const detail = approved.data?.error?.message ?? approved.data?.message ?? "unknown error";
    throw new Error(`hardware-approved activation failed HTTP ${approved.response.status}: ${detail}`);
  }
  assertActivationMatchesPrepared(approved.data, preparedRaw, bundle);

  const replay = await activate(approvedSignature);
  if (replay.response.ok || replay.data?.ok === true) {
    throw new Error("hardware-approved signature replay unexpectedly succeeded");
  }

  const proof = {
    schema: "yourturn-ledger-recovery-mandate-downstream-proof/v1",
    capturedAt: new Date().toISOString(),
    deviceEvidenceLevel: "LIVE/DEVICE",
    authorityEvidenceLevel: "LOCAL",
    network: bundle.network,
    mandateId: bundle.mandateId,
    mandateDigest: bundle.mandateDigest,
    signerAddress: bundle.signerAddress,
    wrongSignatureAttempt: {
      rejected: true,
      httpStatus: invalid.response.status,
      code: invalid.data?.error?.code ?? invalid.data?.code ?? null,
    },
    approvedActivation: {
      accepted: true,
      httpStatus: approved.response.status,
      state: approved.data.state,
      authorityStateVersion: approved.data.authorityStateVersion,
      authority: approved.data.authority,
    },
    replayAttempt: {
      rejected: true,
      httpStatus: replay.response.status,
      code: replay.data?.error?.code ?? replay.data?.code ?? null,
    },
    invariants: {
      hardwareApprovedDigestActivatedExactly: true,
      wrongSignatureCouldNotActivate: true,
      oneShotReplayRejected: true,
      providerHolderListingBoundaryEnforcedByActivationRoute: true,
      legacyApprovalGrantUsed: false,
      recoveryExecutionAttempted: false,
      fundsMoved: false,
    },
    claimBoundary:
      "LOCAL proves that the hardware-approved off-chain Recovery Mandate signature crosses the guarded one-shot activation boundary while a wrong signature and replay do not. This script does not execute recovery, move funds, or claim Ledger signed a Hedera HTS transaction.",
  };

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, `${JSON.stringify(proof, null, 2)}\n`, "utf8");

  console.log("Ledger downstream non-bypass qualification: PASS");
  console.log(`- wrong signature rejected: HTTP ${invalid.response.status}`);
  console.log(`- hardware-approved mandate activated: HTTP ${approved.response.status}`);
  console.log(`- identical signature replay rejected: HTTP ${replay.response.status}`);
  console.log("- exact authority scope matches the signed mandate");
  console.log("- recovery execution attempted: no");
  console.log("- funds moved: no");
  console.log(`- downstream proof: ${args.out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
