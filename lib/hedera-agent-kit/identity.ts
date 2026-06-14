import { createHash } from "node:crypto";
import {
  YOURTURN_AGENT_NAME,
  YOURTURN_AGENT_VERSION,
  YOURTURN_TOOL_MANIFEST_VERSION,
} from "./tool-manifest.ts";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export type Hcs14AgentIdentity = {
  standard: "HCS-14";
  status: "draft";
  method: "uaid:aid";
  id: string;
  nativeId: string;
  registry: "yourturn";
  protocol: "a2a";
  name: typeof YOURTURN_AGENT_NAME;
  version: typeof YOURTURN_AGENT_VERSION;
  manifestVersion: typeof YOURTURN_TOOL_MANIFEST_VERSION;
  skills: number[];
  canonical: {
    registry: "yourturn";
    name: typeof YOURTURN_AGENT_NAME;
    version: typeof YOURTURN_AGENT_VERSION;
    protocol: "a2a";
    nativeId: string;
    skills: number[];
  };
};

function base58Encode(bytes: Buffer): string {
  let value = BigInt(`0x${bytes.toString("hex")}`);
  let encoded = "";
  const zero = BigInt(0);
  const base = BigInt(58);
  while (value > zero) {
    const remainder = Number(value % base);
    value /= base;
    encoded = BASE58_ALPHABET[remainder] + encoded;
  }
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === 0) encoded = BASE58_ALPHABET[0] + encoded;
    else break;
  }
  return encoded || BASE58_ALPHABET[0];
}

export function buildHcs14AgentIdentity(args?: {
  nativeId?: string;
}): Hcs14AgentIdentity {
  const nativeId =
    args?.nativeId ??
    `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}:${
      process.env.HEDERA_TREASURY_ID ?? "0.0.pending"
    }`;
  const canonical = {
    registry: "yourturn" as const,
    name: YOURTURN_AGENT_NAME,
    version: YOURTURN_AGENT_VERSION,
    protocol: "a2a" as const,
    nativeId,
    // HCS-14 examples reserve low numbers for core skills. Use plain,
    // reviewer-readable capabilities: payments, API integration, scheduling.
    skills: [17, 20, 21],
  };
  const canonicalJson = JSON.stringify(canonical);
  const digest = createHash("sha384").update(canonicalJson).digest();
  const root = base58Encode(digest);
  const id = `uaid:aid:${root};uid=0;registry=${canonical.registry};nativeId=${encodeURIComponent(
    canonical.nativeId
  )};protocol=${canonical.protocol}`;
  return {
    standard: "HCS-14",
    status: "draft",
    method: "uaid:aid",
    id,
    nativeId,
    registry: canonical.registry,
    protocol: canonical.protocol,
    name: canonical.name,
    version: canonical.version,
    manifestVersion: YOURTURN_TOOL_MANIFEST_VERSION,
    skills: canonical.skills,
    canonical,
  };
}
