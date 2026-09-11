#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

// The current published DMK 1.9.0 ESM entrypoint contains an extensionless
// directory import (`./src`) that Node 22 rejects with ERR_UNSUPPORTED_DIR_IMPORT.
// Its package exports also provide a CommonJS entrypoint, so use that supported
// export condition for the terminal Node-HID ceremony instead of weakening CI.
const require = createRequire(import.meta.url);
const {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} = require("@ledgerhq/device-management-kit");
const { SignerEthBuilder } = require("@ledgerhq/device-signer-kit-ethereum");
const {
  nodeHidTransportFactory,
} = require("@ledgerhq/device-transport-kit-node-hid");

import {
  Signature,
  TypedDataEncoder,
  getAddress,
  keccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";

import {
  assertExpectedCeremonyResult,
  sanitizeDeviceState,
  validatePreparedEnvelope,
} from "./ceremony.mjs";

const DEFAULT_DISCOVERY_TIMEOUT_MS = 30_000;
const RECOVERY_MANDATE_DOMAIN_SALT = keccak256(
  toUtf8Bytes("yourturn:ethonline-2026:recovery-mandate:v1")
);

function usage() {
  console.log(`YourTurn Ledger Recovery Mandate device proof

Usage:
  npm run proof -- --prepared /path/to/prepared.json --expect approve --out /path/to/approve-proof.json
  npm run proof -- --prepared /path/to/prepared.json --expect reject  --out /path/to/reject-proof.json
  npm run proof -- --prepared /path/to/prepared.json --expect cancel  --out /path/to/cancel-proof.json

The same prepared.json should be used for approve and reject/cancel evidence.
This tool never calls /api/ledger/recovery-mandate/activate and never calls the legacy ApprovalGrant route.
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
  if (!args.prepared) throw new Error("--prepared is required");
  if (!args.expect || !["approve", "reject", "cancel"].includes(args.expect)) {
    throw new Error("--expect must be approve, reject, or cancel");
  }
  if (!args.out) throw new Error("--out is required");
  return {
    prepared: path.resolve(args.prepared),
    expectation: args.expect,
    out: path.resolve(args.out),
    discoveryTimeoutMs: args["discovery-timeout-ms"]
      ? Number(args["discovery-timeout-ms"])
      : DEFAULT_DISCOVERY_TIMEOUT_MS,
  };
}

function normalizeSignaturePart(value) {
  const text = String(value);
  return text.startsWith("0x") ? text : `0x${text}`;
}

function signatureFromLedger(output) {
  if (!output || !output.r || !output.s || output.v === undefined) {
    throw new Error("Ledger completed signing without r/s/v output");
  }
  return Signature.from({
    r: normalizeSignaturePart(output.r),
    s: normalizeSignaturePart(output.s),
    v: Number(output.v),
  }).serialized;
}

function typedDataForEthers(typedData) {
  const { EIP712Domain: _ignored, ...types } = typedData.types;
  return { domain: typedData.domain, types, message: typedData.message };
}

async function waitForFirstDevice(dmk, timeoutMs) {
  return await new Promise((resolve, reject) => {
    let settled = false;
    let subscription;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription?.unsubscribe();
      reject(new Error(`no Ledger device discovered within ${timeoutMs}ms`));
    }, timeoutMs);

    subscription = dmk.listenToAvailableDevices({}).subscribe({
      next(devices) {
        if (settled || !Array.isArray(devices) || devices.length === 0) return;
        settled = true;
        clearTimeout(timer);
        subscription?.unsubscribe();
        resolve(devices[0]);
      },
      error(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    });
  });
}

async function executeAction(action, { expectation, onEvent }) {
  const events = [];
  let output = null;
  let terminalError = null;
  let cancelRequested = false;

  await new Promise((resolve, reject) => {
    action.observable.subscribe({
      next(state) {
        const event = sanitizeDeviceState(state);
        events.push(event);
        onEvent(event);

        const isTypedDataPrompt =
          event.step === "signer.eth.steps.signTypedData" &&
          Boolean(event.requiredUserInteraction);
        if (expectation === "cancel" && isTypedDataPrompt && !cancelRequested) {
          cancelRequested = true;
          action.cancel();
        }

        if (state.status === DeviceActionStatus.Completed) {
          output = state.output;
        } else if (state.status === DeviceActionStatus.Error) {
          terminalError = state.error;
        }
      },
      complete() {
        resolve();
      },
      error(error) {
        reject(error);
      },
    });
  });

  return { events, output, terminalError, cancelRequested };
}

function printEvent(prefix, event) {
  const parts = [event.status];
  if (event.step) parts.push(event.step);
  if (event.requiredUserInteraction) parts.push(`interaction=${event.requiredUserInteraction}`);
  if (event.errorCode) parts.push(`errorCode=${event.errorCode}`);
  console.log(`${prefix}: ${parts.join(" | ")}`);
}

async function deriveAndVerifySigner(signer, derivationPath, expectedSigner) {
  console.log("Deriving the enrolled Ledger address before signing...");
  const action = signer.getAddress(derivationPath, {
    checkOnDevice: false,
    returnChainCode: false,
    skipOpenApp: false,
  });
  const { events, output, terminalError } = await executeAction(action, {
    expectation: "approve",
    onEvent: (event) => printEvent("address", event),
  });
  if (terminalError || !output?.address) {
    const code = terminalError?.errorCode ? ` (${terminalError.errorCode})` : "";
    throw new Error(`failed to derive Ledger address${code}`);
  }
  const actual = getAddress(output.address);
  const expected = getAddress(expectedSigner);
  if (actual !== expected) {
    throw new Error(`connected Ledger derives ${actual}, but server enrollment requires ${expected}`);
  }
  return { address: actual, events };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  if (!Number.isFinite(args.discoveryTimeoutMs) || args.discoveryTimeoutMs < 1_000) {
    throw new Error("--discovery-timeout-ms must be at least 1000");
  }

  const preparedRaw = JSON.parse(await fs.readFile(args.prepared, "utf8"));
  const prepared = validatePreparedEnvelope(preparedRaw);
  if (
    String(prepared.typedData.domain.salt).toLowerCase() !==
    RECOVERY_MANDATE_DOMAIN_SALT.toLowerCase()
  ) {
    throw new Error("prepared typed-data salt does not match the canonical YourTurn Recovery Mandate domain");
  }
  const ethersTyped = typedDataForEthers(prepared.typedData);
  const mandateDigest = TypedDataEncoder.hash(
    ethersTyped.domain,
    ethersTyped.types,
    ethersTyped.message
  );

  console.log(`Mandate: ${prepared.mandateId}`);
  console.log(`Digest:  ${mandateDigest}`);
  console.log(`Signer:  ${prepared.signerAddress}`);
  console.log(`Scope:   ${prepared.humanSummary}`);
  console.log(`Mode:    ${args.expectation}`);
  console.log("Connect and unlock the Ledger. The Ethereum app may be opened by DMK.");

  const dmk = new DeviceManagementKitBuilder()
    .addTransport(nodeHidTransportFactory)
    .build();
  let sessionId = null;
  let activeAction = null;

  const cleanup = async () => {
    try {
      activeAction?.cancel?.();
    } catch {}
    if (sessionId) {
      try {
        await dmk.disconnect({ sessionId });
      } catch {}
    }
  };

  const interrupt = async () => {
    console.error("\nInterrupted: cancelling the active DMK action; no activation request is sent.");
    await cleanup();
    process.exitCode = 130;
  };
  process.once("SIGINT", interrupt);

  try {
    const device = await waitForFirstDevice(dmk, args.discoveryTimeoutMs);
    console.log(`Discovered: ${device.name ?? "Ledger device"}`);
    sessionId = await dmk.connect({ device });
    const connected = dmk.getConnectedDevice({ sessionId });
    const signer = new SignerEthBuilder({ dmk, sessionId }).build();

    const addressProof = await deriveAndVerifySigner(
      signer,
      prepared.derivationPath,
      prepared.signerAddress
    );

    console.log("Starting EIP-712 Recovery Mandate signing action...");
    if (args.expectation === "approve") {
      console.log("APPROVE the exact Recovery Mandate on the Ledger.");
    } else if (args.expectation === "reject") {
      console.log("REJECT the exact Recovery Mandate on the Ledger.");
    } else {
      console.log("Do not approve: this runner will invoke DMK cancel() when the typed-data prompt is observable.");
    }

    activeAction = signer.signTypedData(
      prepared.derivationPath,
      prepared.typedData,
      { skipOpenApp: false }
    );
    const signing = await executeAction(activeAction, {
      expectation: args.expectation,
      onEvent: (event) => printEvent("typed-data", event),
    });
    activeAction = null;

    let serializedSignature = null;
    if (signing.output && args.expectation === "approve") {
      serializedSignature = signatureFromLedger(signing.output);
      const recovered = getAddress(
        verifyTypedData(
          ethersTyped.domain,
          ethersTyped.types,
          ethersTyped.message,
          serializedSignature
        )
      );
      if (recovered !== getAddress(prepared.signerAddress)) {
        throw new Error(`Ledger signature recovers ${recovered}, not enrolled signer ${prepared.signerAddress}`);
      }
    }

    const result = assertExpectedCeremonyResult({
      expectation: args.expectation,
      events: signing.events,
      signature: serializedSignature,
      cancelRequested: signing.cancelRequested,
    });

    const proof = {
      schema: "yourturn-ledger-recovery-mandate-device-proof/v1",
      capturedAt: new Date().toISOString(),
      evidenceLevel: "LIVE/DEVICE",
      network: prepared.network,
      mandateId: prepared.mandateId,
      mandateDigest,
      derivationPath: prepared.derivationPath,
      enrolledSignerAddress: getAddress(prepared.signerAddress),
      derivedDeviceAddress: addressProof.address,
      device: {
        name: device.name ?? null,
        modelId: connected?.modelId ?? connected?.deviceModelId ?? null,
      },
      expectation: args.expectation,
      result,
      addressStates: addressProof.events,
      signingStates: signing.events,
      signature: result === "approved" ? serializedSignature : null,
      activationAttempted: false,
      legacyApprovalGrantUsed: false,
      claimBoundary:
        "Ledger signed or rejected/cancelled an off-chain YourTurn Recovery Mandate through DMK Ethereum signTypedData; this does not claim Ledger signed a Hedera HTS transaction.",
    };

    await fs.mkdir(path.dirname(args.out), { recursive: true });
    await fs.writeFile(args.out, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    console.log(`Proof written: ${args.out}`);
    console.log(`Result: ${result}`);
    if (result === "approved") {
      console.log("The proof contains the hardware-produced signature but has NOT activated authority.");
    } else {
      console.log("No signature was persisted and no authority activation was attempted.");
    }
  } finally {
    process.removeListener("SIGINT", interrupt);
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
