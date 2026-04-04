import {
  AccountId,
  Client,
  PrivateKey,
} from "@hashgraph/sdk";

export type DemoActor = "issuer" | "guestA" | "guestB";

let cached: Client | null = null;

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
  client.setOperator(AccountId.fromString(opId), PrivateKey.fromString(opKey));
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
      privateKey: PrivateKey.fromString(key),
    };
  }
  if (actor === "guestA") {
    const id = process.env.HEDERA_GUEST_A_ID;
    const key = process.env.HEDERA_GUEST_A_KEY;
    if (!id || !key) throw new Error("Guest A credentials missing");
    return {
      accountId: AccountId.fromString(id),
      privateKey: PrivateKey.fromString(key),
    };
  }
  const id = process.env.HEDERA_GUEST_B_ID;
  const key = process.env.HEDERA_GUEST_B_KEY;
  if (!id || !key) throw new Error("Guest B credentials missing");
  return {
    accountId: AccountId.fromString(id),
    privateKey: PrivateKey.fromString(key),
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
