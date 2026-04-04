import {
  AccountId,
  Client,
  PrivateKey,
} from "@hashgraph/sdk";

export type DemoActor = "issuer" | "guestA" | "guestB";

let cached: Client | null = null;

/**
 * `PrivateKey.fromString` guesses key type. A raw 32-byte ECDSA hex key can be
 * misread as Ed25519, which then fails on-chain with INVALID_SIGNATURE.
 */
export function parsePrivateKey(raw: string, typeHint?: string): PrivateKey {
  const key = raw.trim().replace(/^0x/i, "");
  const normalizedHint = typeHint?.trim().toUpperCase();
  if (normalizedHint === "ECDSA") return PrivateKey.fromStringECDSA(key);
  if (normalizedHint === "ED25519") return PrivateKey.fromStringED25519(key);
  if (normalizedHint === "DER") return PrivateKey.fromStringDer(key);
  return PrivateKey.fromString(key);
}

export function getClient(): Client {
  if (cached) return cached;
  const opId = process.env.HEDERA_OPERATOR_ID;
  const opKey = process.env.HEDERA_OPERATOR_KEY;
  if (!opId || !opKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY are required");
  }
  const network = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(
    AccountId.fromString(opId),
    parsePrivateKey(opKey, process.env.HEDERA_OPERATOR_KEY_TYPE)
  );
  cached = client;
  return client;
}

export function getActorCredentials(actor: DemoActor): {
  accountId: AccountId;
  privateKey: PrivateKey;
} {
  if (actor === "issuer") {
    const id = process.env.HEDERA_TREASURY_ID;
    const key = process.env.HEDERA_TREASURY_KEY;
    if (!id || !key) throw new Error("Issuer treasury credentials missing");
    return {
      accountId: AccountId.fromString(id),
      privateKey: parsePrivateKey(key, process.env.HEDERA_TREASURY_KEY_TYPE),
    };
  }
  if (actor === "guestA") {
    const id = process.env.HEDERA_GUEST_A_ID;
    const key = process.env.HEDERA_GUEST_A_KEY;
    if (!id || !key) throw new Error("Guest A credentials missing");
    return {
      accountId: AccountId.fromString(id),
      privateKey: parsePrivateKey(key, process.env.HEDERA_GUEST_A_KEY_TYPE),
    };
  }
  const id = process.env.HEDERA_GUEST_B_ID;
  const key = process.env.HEDERA_GUEST_B_KEY;
  if (!id || !key) throw new Error("Guest B credentials missing");
  return {
    accountId: AccountId.fromString(id),
    privateKey: parsePrivateKey(key, process.env.HEDERA_GUEST_B_KEY_TYPE),
  };
}

export function getTreasuryAccountId(): AccountId {
  const id = process.env.HEDERA_TREASURY_ID;
  if (!id) throw new Error("HEDERA_TREASURY_ID is required");
  return AccountId.fromString(id);
}

export function getFeeCollectorAccountId(): AccountId {
  const id = process.env.HEDERA_FEE_COLLECTOR_ID;
  if (!id) throw new Error("HEDERA_FEE_COLLECTOR_ID is required");
  return AccountId.fromString(id);
}

/** Compare Hedera account ids from Mirror vs env (normalizes shard.realm.num). */
export function accountsEqual(a: string, b: string): boolean {
  try {
    return AccountId.fromString(a).equals(AccountId.fromString(b));
  } catch {
    return a.trim() === b.trim();
  }
}

/** Map a guest account id to demo actor, or null if not Guest A/B. */
export function tryResolveGuestActor(accountIdStr: string): "guestA" | "guestB" | null {
  const a = process.env.HEDERA_GUEST_A_ID?.trim();
  const b = process.env.HEDERA_GUEST_B_ID?.trim();
  if (a && accountsEqual(accountIdStr, a)) return "guestA";
  if (b && accountsEqual(accountIdStr, b)) return "guestB";
  return null;
}
