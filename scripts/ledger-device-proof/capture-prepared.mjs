#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { TypedDataEncoder } from "ethers";

import { validatePreparedEnvelope } from "./ceremony.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

function usage() {
  console.log(`Capture one server-bound Recovery Mandate for Ledger qualification

Usage:
  npm run capture -- \\
    --actor guestA \\
    --serial 193 \\
    --minimum-atomic 40000000 \\
    --expires-in 7200 \\
    --out ../../output/ledger-qualification/prepared.json

Optional:
  --base-url http://127.0.0.1:3000

Safety:
  - base URL must be localhost/127.0.0.1/::1;
  - this script logs into the existing demo session only;
  - it calls only /api/ledger/recovery-mandate/prepare;
  - it never activates authority, moves funds, or writes session cookies to disk.
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
  const serial = Number(args.serial);
  if (!Number.isSafeInteger(serial) || serial < 1) {
    throw new Error("--serial must be a positive safe integer");
  }
  if (!args["minimum-atomic"] || !/^[1-9]\d*$/.test(args["minimum-atomic"])) {
    throw new Error("--minimum-atomic must be a positive integer string");
  }
  const expiresInSeconds = Number(args["expires-in"]);
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 300 || expiresInSeconds > 86400) {
    throw new Error("--expires-in must be an integer from 300 through 86400 seconds");
  }
  if (!args.out) throw new Error("--out is required");

  return {
    actor: args.actor,
    serial,
    minimumRecoveryAtomicUnits: args["minimum-atomic"],
    expiresInSeconds,
    out: path.resolve(args.out),
    baseUrl: assertLocalBaseUrl(args["base-url"] ?? DEFAULT_BASE_URL),
  };
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
    throw new Error("qualification capture is locked to a local app; remote/prod URLs are refused");
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("--base-url must use http or https");
  }
  return url.toString().replace(/\/$/, "");
}

function typedDataForEthers(typedData) {
  const { EIP712Domain: _ignored, ...types } = typedData.types;
  return { domain: typedData.domain, types, message: typedData.message };
}

async function responseJson(response, label) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok || data?.ok !== true) {
    const code = data?.error?.code ?? data?.code ?? "UNKNOWN";
    const message = data?.error?.message ?? data?.message ?? "request failed";
    throw new Error(`${label} failed HTTP ${response.status} ${code}: ${message}`);
  }
  return data;
}

function firstCookie(response) {
  const getSetCookie = response.headers.getSetCookie?.();
  const raw = Array.isArray(getSetCookie) && getSetCookie.length > 0
    ? getSetCookie[0]
    : response.headers.get("set-cookie");
  if (!raw) throw new Error("demo login returned no session cookie");
  return raw.split(";", 1)[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const health = await fetch(`${args.baseUrl}/login`, { redirect: "manual" });
  if (!health.ok) {
    throw new Error(`local app health check failed HTTP ${health.status}`);
  }

  const loginResponse = await fetch(`${args.baseUrl}/api/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: args.actor }),
    redirect: "manual",
  });
  await responseJson(loginResponse, "demo login");
  const cookie = firstCookie(loginResponse);

  const prepareResponse = await fetch(
    `${args.baseUrl}/api/ledger/recovery-mandate/prepare`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        actor: args.actor,
        serial: args.serial,
        minimumRecoveryAtomicUnits: args.minimumRecoveryAtomicUnits,
        expiresInSeconds: args.expiresInSeconds,
      }),
      redirect: "manual",
    }
  );
  const preparedRaw = await responseJson(prepareResponse, "Recovery Mandate prepare");
  const prepared = validatePreparedEnvelope(preparedRaw);
  const typed = typedDataForEthers(prepared.typedData);
  const digest = TypedDataEncoder.hash(typed.domain, typed.types, typed.message);

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, `${JSON.stringify(preparedRaw, null, 2)}\n`, "utf8");

  console.log("Prepared Recovery Mandate: PASS");
  console.log(`- mandateId: ${prepared.mandateId}`);
  console.log(`- digest: ${digest}`);
  console.log(`- signer: ${prepared.signerAddress}`);
  console.log(`- scope: ${prepared.humanSummary}`);
  console.log(`- evidence: ${preparedRaw.evidenceLevel} (no device claim yet)`);
  console.log(`- saved: ${args.out}`);
  console.log("- session cookie: memory only; not written to the evidence file");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
