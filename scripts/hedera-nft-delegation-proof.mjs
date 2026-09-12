import { readFileSync } from "node:fs";
import {
  AccountId,
  Client,
  NftId,
  PrivateKey,
  Status,
  TokenId,
  TokenNftInfoQuery,
} from "@hiero-ledger/sdk";
import {
  buildApprovedSerialTransfer,
  buildSerialScopedNftAllowance,
  buildSerialScopedNftRevocation,
  describeSerialScopedAuthority,
} from "../lib/hedera/delegated-nft-authority.ts";

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
    // CI/operators may provide env directly.
  }
}

function parseArgs(argv) {
  const args = {
    execute: false,
    owner: "guestA",
    spender: "issuer",
    receiver: "guestB",
    token: process.env.BOOKED_RIGHTS_TOKEN_ID ?? "",
    serial: Number(process.env.HEDERA_DELEGATION_SERIAL ?? 1),
    wrongSerial: Number(process.env.HEDERA_DELEGATION_WRONG_SERIAL ?? 2),
  };

  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--owner=")) args.owner = arg.slice("--owner=".length);
    else if (arg.startsWith("--spender=")) args.spender = arg.slice("--spender=".length);
    else if (arg.startsWith("--receiver=")) args.receiver = arg.slice("--receiver=".length);
    else if (arg.startsWith("--token=")) args.token = arg.slice("--token=".length);
    else if (arg.startsWith("--serial=")) args.serial = Number(arg.slice("--serial=".length));
    else if (arg.startsWith("--wrong-serial=")) {
      args.wrongSerial = Number(arg.slice("--wrong-serial=".length));
    } else if (arg === "--help") args.help = true;
  }

  return args;
}

function showHelp() {
  console.log(`Usage:
  npm run hedera:nft-delegation-proof -- [options]

Default mode is deterministic and never signs or submits a transaction.

Live testnet options:
  --execute              Run the serial allowance -> negative tests -> revoke -> transfer lifecycle.
  --owner=guestA         Owner actor/account id. Default: guestA.
  --spender=issuer       Delegated spender actor/account id. Default: issuer.
  --receiver=guestB      Receiver actor/account id. Default: guestB.
  --token=0.0.x          BOOKED NFT token id (or set BOOKED_RIGHTS_TOKEN_ID).
  --serial=1             Serial to delegate.
  --wrong-serial=2       Different owner-held serial used for the negative test.

Live mode requires owner + spender private keys and a receiver already associated
with the NFT token. It is testnet-only; mainnet execution is rejected.`);
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

function resolveActor(actorOrAccountId, needsKey) {
  const prefix = actorEnvPrefix(actorOrAccountId);
  if (!prefix) {
    if (needsKey) {
      throw new Error(`Named actor is required when a private key is needed: ${actorOrAccountId}`);
    }
    return { label: actorOrAccountId, accountId: AccountId.fromString(actorOrAccountId), privateKey: null };
  }

  const id = process.env[`${prefix}_ID`];
  const rawKey = process.env[`${prefix}_KEY`];
  if (!id) throw new Error(`${prefix}_ID is required`);
  if (needsKey && !rawKey) throw new Error(`${prefix}_KEY is required`);

  return {
    label: actorOrAccountId,
    accountId: AccountId.fromString(id),
    privateKey: rawKey ? parsePrivateKey(rawKey, process.env[`${prefix}_KEY_TYPE`]) : null,
  };
}

function clientFor(actor) {
  if (!actor.privateKey) throw new Error(`Private key missing for ${actor.accountId.toString()}`);
  const client = Client.forTestnet();
  client.setOperator(actor.accountId, actor.privateKey);
  return client;
}

function hashscanTxUrl(txId) {
  const normalized = txId.includes("@") ? txId.replace("@", "-") : txId;
  return `https://hashscan.io/#/testnet/transaction/${normalized}`;
}

function mirrorTxUrl(txId) {
  const normalized = txId.includes("@") ? txId.replace("@", "-") : txId;
  return `https://testnet.mirrornode.hedera.com/api/v1/transactions/${normalized}`;
}

function serialNumbers(allowance) {
  return (allowance.serialNumbers ?? []).map((serial) => Number(serial.toString()));
}

function deterministicCheck(args) {
  const token = args.token || "0.0.2001";
  const authority = {
    tokenId: token,
    serial: args.serial,
    ownerAccountId: "0.0.1001",
    spenderAccountId: "0.0.1002",
  };

  const approval = buildSerialScopedNftAllowance(authority);
  const revocation = buildSerialScopedNftRevocation(authority);
  const transfer = buildApprovedSerialTransfer({
    authority,
    receiverAccountId: "0.0.1003",
  });

  const nftApproval = approval.tokenNftApprovals[0];
  const nftDeletion = revocation.tokenNftAllowanceDeletions[0];
  const payer = transfer.transactionId?.accountId?.toString();

  const assertions = {
    exactlyOneApproval: approval.tokenNftApprovals.length === 1,
    approvalIsSingleSerial: nftApproval?.allSerials === false && serialNumbers(nftApproval)[0] === args.serial,
    approvalOwnerMatches: nftApproval?.ownerAccountId?.toString() === authority.ownerAccountId,
    approvalSpenderMatches: nftApproval?.spenderAccountId?.toString() === authority.spenderAccountId,
    exactlyOneRevocation: revocation.tokenNftAllowanceDeletions.length === 1,
    revocationIsSingleSerial:
      nftDeletion?.allSerials === false && serialNumbers(nftDeletion)[0] === args.serial,
    approvedTransferPayerIsSpender: payer === authority.spenderAccountId,
    approvedForAllNeverUsed: describeSerialScopedAuthority(authority).approvedForAll === false,
  };

  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length) throw new Error(`deterministic delegation assertions failed: ${failed.join(", ")}`);

  return {
    ok: true,
    evidenceLevel: "CI/LOCAL",
    status: "deterministic_serial_scope_verified_no_network",
    authority: describeSerialScopedAuthority(authority),
    assertions,
    liveAcceptanceStillRequired: [
      "serial_scoped_nft_allowance_created_live",
      "wrong_serial_transfer_blocked",
      "nft_allowance_revoked_live",
      "revoked_transfer_blocked",
      "mirror_or_hashscan_evidence_recorded",
    ],
  };
}

async function submitOwnerTransaction(transaction, owner) {
  const client = clientFor(owner);
  try {
    const frozen = await transaction.freezeWith(client);
    const signed = await frozen.sign(owner.privateKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    return {
      txId: response.transactionId.toString(),
      status: receipt.status.toString(),
      hashscan: hashscanTxUrl(response.transactionId.toString()),
      mirror: mirrorTxUrl(response.transactionId.toString()),
    };
  } finally {
    client.close();
  }
}

async function attemptApprovedTransfer(authority, receiverAccountId, spender) {
  const client = clientFor(spender);
  try {
    const transaction = buildApprovedSerialTransfer({ authority, receiverAccountId });
    const frozen = await transaction.freezeWith(client);
    const signed = await frozen.sign(spender.privateKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    return {
      ok: true,
      txId: response.transactionId.toString(),
      status: receipt.status.toString(),
      hashscan: hashscanTxUrl(response.transactionId.toString()),
      mirror: mirrorTxUrl(response.transactionId.toString()),
    };
  } catch (error) {
    const status = error?.status?.toString?.() ?? null;
    const message = error instanceof Error ? error.message : String(error);
    const allowanceStatus = Status.SpenderDoesNotHaveAllowance.toString();
    return {
      ok: false,
      status,
      message,
      deniedForMissingAllowance:
        status === allowanceStatus || message.includes(allowanceStatus),
    };
  } finally {
    client.close();
  }
}

async function currentOwner(tokenId, serial, queryActor) {
  const client = clientFor(queryActor);
  try {
    const info = await new TokenNftInfoQuery()
      .setNftId(new NftId(TokenId.fromString(tokenId), serial))
      .execute(client);
    return info[0]?.accountId?.toString() ?? null;
  } finally {
    client.close();
  }
}

function errorSummary(error) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

async function liveLifecycle(args) {
  if ((process.env.HEDERA_NETWORK ?? "testnet").toLowerCase() !== "testnet") {
    throw new Error("hedera:nft-delegation-proof refuses non-testnet execution");
  }
  if (!args.token) throw new Error("BOOKED_RIGHTS_TOKEN_ID or --token is required for --execute");
  if (!Number.isSafeInteger(args.serial) || args.serial <= 0) throw new Error("--serial must be positive");
  if (!Number.isSafeInteger(args.wrongSerial) || args.wrongSerial <= 0) {
    throw new Error("--wrong-serial must be positive");
  }
  if (args.serial === args.wrongSerial) throw new Error("--wrong-serial must differ from --serial");

  const owner = resolveActor(args.owner, true);
  const spender = resolveActor(args.spender, true);
  const receiver = resolveActor(args.receiver, false);
  const ownerAccountId = owner.accountId.toString();
  const base = {
    tokenId: args.token,
    serial: args.serial,
    ownerAccountId,
    spenderAccountId: spender.accountId.toString(),
  };
  const wrong = { ...base, serial: args.wrongSerial };
  const evidence = {};
  let allowanceMayBeLive = false;
  let targetOwnershipMoved = false;
  let lifecycleError = null;

  try {
    const targetOwnerBefore = await currentOwner(args.token, args.serial, owner);
    const wrongSerialOwnerBefore = await currentOwner(args.token, args.wrongSerial, owner);
    evidence.preconditions = {
      expectedOwnerAccountId: ownerAccountId,
      targetSerial: args.serial,
      targetOwnerBefore,
      wrongSerial: args.wrongSerial,
      wrongSerialOwnerBefore,
    };

    if (targetOwnerBefore !== ownerAccountId) {
      throw new Error(
        `target serial ${args.serial} is not owner-held: expected ${ownerAccountId}, got ${targetOwnerBefore}`
      );
    }
    if (wrongSerialOwnerBefore !== ownerAccountId) {
      throw new Error(
        `wrong serial ${args.wrongSerial} is not owner-held: expected ${ownerAccountId}, got ${wrongSerialOwnerBefore}`
      );
    }

    // Pessimistically assume the allowance may become live before submission. If execute()
    // reaches a node but receipt retrieval fails, finally must still revoke the serial.
    allowanceMayBeLive = true;
    evidence.approve = await submitOwnerTransaction(buildSerialScopedNftAllowance(base), owner);

    evidence.wrongSerialAttempt = await attemptApprovedTransfer(
      wrong,
      receiver.accountId.toString(),
      spender
    );
    if (
      evidence.wrongSerialAttempt.ok ||
      !evidence.wrongSerialAttempt.deniedForMissingAllowance
    ) {
      throw new Error(
        `wrong-serial test did not prove SPENDER_DOES_NOT_HAVE_ALLOWANCE: ${JSON.stringify(evidence.wrongSerialAttempt)}`
      );
    }

    evidence.wrongSerialOwnerAfter = await currentOwner(
      args.token,
      args.wrongSerial,
      owner
    );
    if (evidence.wrongSerialOwnerAfter !== ownerAccountId) {
      throw new Error(
        `wrong serial ownership changed during negative test: expected ${ownerAccountId}, got ${evidence.wrongSerialOwnerAfter}`
      );
    }

    evidence.revoke = await submitOwnerTransaction(buildSerialScopedNftRevocation(base), owner);
    allowanceMayBeLive = false;

    evidence.postRevokeAttempt = await attemptApprovedTransfer(
      base,
      receiver.accountId.toString(),
      spender
    );
    if (evidence.postRevokeAttempt.ok) {
      targetOwnershipMoved = true;
      throw new Error(
        `post-revoke transfer unexpectedly succeeded: ${JSON.stringify(evidence.postRevokeAttempt)}`
      );
    }
    if (!evidence.postRevokeAttempt.deniedForMissingAllowance) {
      throw new Error(
        `post-revoke test did not prove SPENDER_DOES_NOT_HAVE_ALLOWANCE: ${JSON.stringify(evidence.postRevokeAttempt)}`
      );
    }

    // Same pessimistic rule applies to reapproval: cleanup must cover submit/receipt
    // uncertainty, not only the fully confirmed success path.
    allowanceMayBeLive = true;
    evidence.reapprove = await submitOwnerTransaction(buildSerialScopedNftAllowance(base), owner);

    evidence.permittedTransfer = await attemptApprovedTransfer(
      base,
      receiver.accountId.toString(),
      spender
    );
    if (!evidence.permittedTransfer.ok) {
      throw new Error(
        `permitted serial transfer failed: ${JSON.stringify(evidence.permittedTransfer)}`
      );
    }

    // A successful receipt means the target NFT moved; the old owner's serial allowance
    // is no longer actionable and cleanup must not try to revoke an NFT it no longer owns.
    targetOwnershipMoved = true;
    allowanceMayBeLive = false;

    evidence.ownerAfter = await currentOwner(args.token, args.serial, spender);
    if (evidence.ownerAfter !== receiver.accountId.toString()) {
      throw new Error(
        `Mirror/node NFT ownership mismatch: expected ${receiver.accountId}, got ${evidence.ownerAfter}`
      );
    }
  } catch (error) {
    lifecycleError = error;
  } finally {
    if (allowanceMayBeLive && !targetOwnershipMoved) {
      try {
        const cleanupRevoke = await submitOwnerTransaction(
          buildSerialScopedNftRevocation(base),
          owner
        );
        evidence.cleanup = {
          attempted: true,
          success: true,
          reason: "proof_interrupted_with_possible_live_allowance",
          revoke: cleanupRevoke,
        };
        allowanceMayBeLive = false;
      } catch (cleanupError) {
        evidence.cleanup = {
          attempted: true,
          success: false,
          reason: "proof_interrupted_with_possible_live_allowance",
          error: errorSummary(cleanupError),
        };
        lifecycleError = lifecycleError
          ? new AggregateError(
              [lifecycleError, cleanupError],
              "Hedera delegation lifecycle failed and cleanup revocation also failed"
            )
          : cleanupError;
      }
    } else {
      evidence.cleanup = {
        attempted: false,
        success: true,
        reason: targetOwnershipMoved
          ? "target_serial_already_transferred"
          : "no_live_allowance_expected",
      };
    }
  }

  if (lifecycleError) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          evidenceLevel: "LIVE/TESTNET_ATTEMPT",
          status: "serial_scoped_delegation_lifecycle_failed",
          network: "testnet",
          authority: describeSerialScopedAuthority(base),
          evidence,
          error: errorSummary(lifecycleError),
        },
        null,
        2
      )
    );
    throw lifecycleError;
  }

  return {
    ok: true,
    evidenceLevel: "LIVE/TESTNET",
    status: "serial_scoped_delegation_lifecycle_verified",
    network: "testnet",
    authority: describeSerialScopedAuthority(base),
    receiverAccountId: receiver.accountId.toString(),
    wrongSerial: args.wrongSerial,
    evidence,
  };
}

loadEnvLocal();
const args = parseArgs(process.argv.slice(2));
if (args.help) {
  showHelp();
  process.exit(0);
}

const result = args.execute ? await liveLifecycle(args) : deterministicCheck(args);
console.log(JSON.stringify(result, null, 2));
