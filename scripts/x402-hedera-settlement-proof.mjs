import { readFileSync } from "node:fs";
import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/http";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";

function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // CI or operators can provide env directly.
  }
}

function parseArgs(argv) {
  const args = {
    execute: false,
    asset: "HBAR",
    url: process.env.YOURTURN_X402_URL ?? "http://localhost:3015/api/x402/recovery-policy",
    accountId: process.env.HEDERA_X402_CLIENT_ID ?? process.env.HEDERA_GUEST_A_ID,
    privateKey: process.env.HEDERA_X402_CLIENT_KEY ?? process.env.HEDERA_GUEST_A_KEY,
    keyType: process.env.HEDERA_X402_CLIENT_KEY_TYPE ?? process.env.HEDERA_GUEST_A_KEY_TYPE,
  };
  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--asset=")) args.asset = arg.slice("--asset=".length).toUpperCase();
    else if (arg.startsWith("--url=")) args.url = arg.slice("--url=".length);
    else if (arg.startsWith("--account-id=")) args.accountId = arg.slice("--account-id=".length);
    else if (arg.startsWith("--private-key=")) args.privateKey = arg.slice("--private-key=".length);
    else if (arg.startsWith("--key-type=")) args.keyType = arg.slice("--key-type=".length);
    else if (arg === "--help") args.help = true;
  }
  return args;
}

function showHelp() {
  console.log(`Usage:
  npm run hedera:x402-settlement-proof -- [options]

Options:
  --execute                  Create a signed payment payload and retry the paid request.
  --asset=HBAR               Payment asset selector: HBAR or USDC. Default: HBAR.
  --url=http://localhost...  Protected x402 endpoint URL.
  --account-id=0.0.x         Payer account. Defaults to HEDERA_X402_CLIENT_ID or HEDERA_GUEST_A_ID.
  --private-key=...          Payer private key. Defaults to HEDERA_X402_CLIENT_KEY or HEDERA_GUEST_A_KEY.
  --key-type=ECDSA           Optional key parser hint: ECDSA, ED25519, or DER.

Dry-run is the default. For live settlement, start the server with:
  HEDERA_X402_SETTLEMENT_ENABLED=true npx next dev -p 3015`);
}

function parsePrivateKey(raw, hint) {
  const key = raw.trim().replace(/^0x/i, "");
  const normalizedHint = hint?.trim().toUpperCase();
  if (normalizedHint === "ECDSA") return PrivateKey.fromStringECDSA(key);
  if (normalizedHint === "ED25519") return PrivateKey.fromStringED25519(key);
  if (normalizedHint === "DER") return PrivateKey.fromStringDer(key);
  return PrivateKey.fromString(key);
}

function assetMatches(requirement, asset) {
  const symbol = requirement.extra?.assetSymbol ?? requirement.assetSymbol;
  if (asset === "HBAR") return requirement.asset === "0.0.0" || symbol === "HBAR";
  if (asset === "USDC") return symbol === "USDC";
  throw new Error(`Unsupported --asset=${asset}; use HBAR or USDC`);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

loadEnvLocal();

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  showHelp();
  process.exit(0);
}

let initial;
try {
  initial = await fetch(args.url, { method: "POST" });
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    status: "endpoint_unreachable",
    endpoint: args.url,
    message: "Start the app before running this proof script.",
    nextCommand: "npx next dev -p 3015",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}
const initialBody = await readJson(initial);

const dryRunCore = new x402Client((version, accepts) => {
  return accepts.find((requirement) => assetMatches(requirement, args.asset)) ?? accepts[0];
});
const dryRunHttp = new x402HTTPClient(dryRunCore);
const paymentRequired = dryRunHttp.getPaymentRequiredResponse(
  (name) => initial.headers.get(name),
  initialBody
);
const selected =
  paymentRequired.accepts.find((requirement) => assetMatches(requirement, args.asset)) ??
  paymentRequired.accepts[0];

if (!args.execute) {
  console.log(JSON.stringify({
    ok: true,
    status: "dry_run_no_signing",
    endpoint: args.url,
    responseStatus: initial.status,
    selectedPaymentRequirement: selected,
    allAcceptedAssets: paymentRequired.accepts.map((requirement) => ({
      scheme: requirement.scheme,
      network: requirement.network,
      asset: requirement.asset,
      symbol: requirement.extra?.assetSymbol ?? requirement.assetSymbol ?? null,
      amount: requirement.amount,
      payTo: requirement.payTo,
    })),
    nextCommands: [
      "HEDERA_X402_SETTLEMENT_ENABLED=true npx next dev -p 3015",
      `npm run hedera:x402-settlement-proof -- --asset=${args.asset} --execute`,
    ],
  }, null, 2));
  process.exit(0);
}

if (!args.accountId || !args.privateKey) {
  throw new Error(
    "HEDERA_X402_CLIENT_ID/HEDERA_X402_CLIENT_KEY or HEDERA_GUEST_A_ID/HEDERA_GUEST_A_KEY are required for --execute"
  );
}

const signer = createClientHederaSigner(
  args.accountId,
  parsePrivateKey(args.privateKey, args.keyType),
  { network: "hedera:testnet" }
);
const core = new x402Client((version, accepts) => {
  const choice = accepts.find((requirement) => assetMatches(requirement, args.asset));
  if (!choice) {
    throw new Error(`No ${args.asset} payment requirement was offered`);
  }
  return choice;
}).register("hedera:*", new ExactHederaScheme(signer));
const client = new x402HTTPClient(core);
const paymentPayload = await client.createPaymentPayload(paymentRequired);
const headers = client.encodePaymentSignatureHeader(paymentPayload);
const paid = await fetch(args.url, {
  method: "POST",
  headers,
});
const paidBody = await readJson(paid);
let settlement = null;
try {
  settlement = client.getPaymentSettleResponse((name) => paid.headers.get(name));
} catch {
  settlement = null;
}

console.log(JSON.stringify({
  ok: paid.ok,
  status: paid.status,
  endpoint: args.url,
  payerAccountId: args.accountId,
  selectedPaymentRequirement: paymentPayload.accepted,
  paymentPayloadCreated: true,
  paymentPayloadContainsSignedTransaction: Boolean(paymentPayload.payload?.transaction),
  responseBody: paidBody,
  settlement,
}, null, 2));
