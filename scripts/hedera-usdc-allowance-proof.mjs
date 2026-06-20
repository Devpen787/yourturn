import { readFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  Client,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
} from "@hashgraph/sdk";

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
    associateOwner: false,
    associateSpender: false,
    owner: "guestA",
    spender: "issuer",
    amount: process.env.YOURTURN_POLICY_USDC_LIMIT_UNITS ?? "5000000",
    token: process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274",
  };
  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg === "--associate-owner") args.associateOwner = true;
    else if (arg === "--associate-spender") args.associateSpender = true;
    else if (arg.startsWith("--owner=")) args.owner = arg.slice("--owner=".length);
    else if (arg.startsWith("--spender=")) args.spender = arg.slice("--spender=".length);
    else if (arg.startsWith("--amount=")) args.amount = arg.slice("--amount=".length);
    else if (arg.startsWith("--token=")) args.token = arg.slice("--token=".length);
    else if (arg === "--help") args.help = true;
  }
  return args;
}

function showHelp() {
  console.log(`Usage:
  npm run hedera:usdc-allowance-proof -- [options]

Options:
  --execute              Actually submit association/allowance transactions.
  --associate-owner      Associate the owner account with the USDC token first.
  --associate-spender    Associate the spender account with the USDC token first.
  --owner=guestA         Allowance owner actor or account id. Default: guestA.
  --spender=issuer       Allowance spender actor or account id. Default: issuer.
  --amount=5000000       Allowance in token atomic units. Default: 5 USDC.
  --token=0.0.429274     Hedera testnet USDC token id.

Dry-run is the default and never signs or spends.`);
}

function parsePrivateKey(raw, hint) {
  const key = raw.trim().replace(/^0x/i, "");
  const normalizedHint = hint?.trim().toUpperCase();
  if (normalizedHint === "ECDSA") return PrivateKey.fromStringECDSA(key);
  if (normalizedHint === "ED25519") return PrivateKey.fromStringED25519(key);
  if (normalizedHint === "DER") return PrivateKey.fromStringDer(key);
  return PrivateKey.fromString(key);
}

function actorEnvPrefix(actor) {
  if (actor === "issuer") return "HEDERA_TREASURY";
  if (actor === "guestA") return "HEDERA_GUEST_A";
  if (actor === "guestB") return "HEDERA_GUEST_B";
  return null;
}

function resolveActor(actorOrAccountId) {
  const prefix = actorEnvPrefix(actorOrAccountId);
  if (!prefix) {
    return {
      label: actorOrAccountId,
      accountId: AccountId.fromString(actorOrAccountId),
      privateKey: null,
    };
  }
  const id = process.env[`${prefix}_ID`];
  const key = process.env[`${prefix}_KEY`];
  if (!id) throw new Error(`${prefix}_ID is required`);
  return {
    label: actorOrAccountId,
    accountId: AccountId.fromString(id),
    privateKey: key ? parsePrivateKey(key, process.env[`${prefix}_KEY_TYPE`]) : null,
  };
}

function clientFor(accountId, privateKey) {
  if (!privateKey) throw new Error(`Private key missing for ${accountId.toString()}`);
  const network = (process.env.HEDERA_NETWORK ?? "testnet").toLowerCase();
  const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(accountId, privateKey);
  return client;
}

async function associateToken(label, actor, tokenId) {
  const client = clientFor(actor.accountId, actor.privateKey);
  try {
    try {
      const response = await new TokenAssociateTransaction()
        .setAccountId(actor.accountId)
        .setTokenIds([tokenId])
        .execute(client);
      const receipt = await response.getReceipt(client);
      return {
        label,
        accountId: actor.accountId.toString(),
        tokenId: tokenId.toString(),
        txId: response.transactionId.toString(),
        status: receipt.status.toString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
        return {
          label,
          accountId: actor.accountId.toString(),
          tokenId: tokenId.toString(),
          txId: null,
          status: "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT",
        };
      }
      throw error;
    }
  } finally {
    client.close();
  }
}

async function approveAllowance(owner, spender, tokenId, amount) {
  const client = clientFor(owner.accountId, owner.privateKey);
  try {
    const tx = await new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(tokenId, owner.accountId, spender.accountId, BigInt(amount))
      .freezeWith(client)
      .sign(owner.privateKey);
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    return {
      ownerAccountId: owner.accountId.toString(),
      spenderAccountId: spender.accountId.toString(),
      tokenId: tokenId.toString(),
      amountAtomicUnits: amount,
      allowanceTxId: response.transactionId.toString(),
      status: receipt.status.toString(),
      envLine: `YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID=${response.transactionId.toString()}`,
    };
  } finally {
    client.close();
  }
}

loadEnvLocal();

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  showHelp();
  process.exit(0);
}

const owner = resolveActor(args.owner);
const spender = resolveActor(args.spender);
const tokenId = TokenId.fromString(args.token);
const dryRun = !args.execute;

const plan = {
  dryRun,
  network: process.env.HEDERA_NETWORK ?? "testnet",
  tokenId: tokenId.toString(),
  token: "HTS USDC",
  owner: {
    label: owner.label,
    accountId: owner.accountId.toString(),
    hasPrivateKey: Boolean(owner.privateKey),
  },
  spender: {
    label: spender.label,
    accountId: spender.accountId.toString(),
    hasPrivateKey: Boolean(spender.privateKey),
  },
  amountAtomicUnits: args.amount,
  amountUsdc: (Number(args.amount) / 1_000_000).toString(),
  requestedTransactions: {
    associateOwner: args.associateOwner,
    associateSpender: args.associateSpender,
    approveAllowance: true,
  },
};

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    status: "dry_run_no_signing",
    plan,
    nextCommand:
      "npm run hedera:usdc-allowance-proof -- --associate-owner --associate-spender --execute",
  }, null, 2));
  process.exit(0);
}

const submitted = [];
if (args.associateOwner) {
  submitted.push(await associateToken("owner", owner, tokenId));
}
if (args.associateSpender) {
  submitted.push(await associateToken("spender", spender, tokenId));
}
submitted.push(await approveAllowance(owner, spender, tokenId, args.amount));

console.log(JSON.stringify({
  ok: true,
  status: "submitted",
  plan,
  submitted,
}, null, 2));
