import {
  createAgentBookVerifier,
  parseAgentkitHeader,
  validateAgentkitMessage,
  verifyAgentkitSignature,
  type AgentBookVerifier,
} from "@worldcoin/agentkit";

import {
  evaluateWorldAgentGate,
  type WorldAgentGateDecision,
  type WorldAgentVerification,
} from "./trust-boundary";
import type { WorldAgentNonceStore } from "./nonce-store";

export const WORLD_AGENT_VERIFICATION_TTL_MS = 60_000;

export type WorldAgentRequestBlockReason =
  | "missing_agentkit_header"
  | "invalid_agentkit_header"
  | "agentkit_message_invalid"
  | "exact_resource_mismatch"
  | "agentkit_signature_invalid"
  | "agentbook_unavailable"
  | "agentbook_unresolved"
  | "nonce_replayed"
  | Exclude<WorldAgentGateDecision, { status: "allowed" }>['reason'];

export type WorldAgentRequestDecision =
  | {
      status: "allowed";
      reason: "human_backed_agent_verified";
      verification: WorldAgentVerification;
    }
  | {
      status: "blocked";
      reason: WorldAgentRequestBlockReason;
      detail?: string;
    };

export type WorldAgentBookLookup = Pick<AgentBookVerifier, "lookupHuman">;

function sameExactResource(actual: string, expected: string): boolean {
  try {
    return new URL(actual).href === new URL(expected).href;
  } catch {
    return false;
  }
}

function verificationExpiry(payloadExpiration: string | undefined, verifiedAtMs: number) {
  const localExpiry = verifiedAtMs + WORLD_AGENT_VERIFICATION_TTL_MS;
  if (!payloadExpiration) return new Date(localExpiry).toISOString();
  const signedExpiry = Date.parse(payloadExpiration);
  return new Date(Math.min(localExpiry, signedExpiry)).toISOString();
}

/**
 * Server-only World AgentKit verifier for the Delegated Recovery boundary.
 *
 * Trusted state is constructed only after the official AgentKit parser,
 * message validator, signature verifier and AgentBook lookup succeed. The
 * anonymous AgentBook human id is deliberately reduced to a boolean and is
 * never returned from this function.
 *
 * `validateAgentkitMessage` currently validates the URI host, not the complete
 * path. YourTurn therefore adds an exact full-resource check before a signed
 * message may authorize this recovery endpoint.
 */
export async function verifyWorldAgentRequest(options: {
  agentkitHeader: string | null | undefined;
  expectedResourceUri: string;
  expectedAgentAddress: string;
  nonceStore: WorldAgentNonceStore;
  agentBook?: WorldAgentBookLookup;
  maxAgeMs?: number;
  nowMs?: number;
}): Promise<WorldAgentRequestDecision> {
  const {
    agentkitHeader,
    expectedResourceUri,
    expectedAgentAddress,
    nonceStore,
    maxAgeMs,
  } = options;

  if (!agentkitHeader) {
    return { status: "blocked", reason: "missing_agentkit_header" };
  }

  let payload;
  try {
    payload = parseAgentkitHeader(agentkitHeader);
  } catch (error) {
    return {
      status: "blocked",
      reason: "invalid_agentkit_header",
      detail: error instanceof Error ? error.message : "AgentKit header parse failed",
    };
  }

  const nonceKey = { nonce: payload.nonce, resourceUri: expectedResourceUri };
  const validation = await validateAgentkitMessage(payload, expectedResourceUri, {
    ...(maxAgeMs === undefined ? {} : { maxAge: maxAgeMs }),
    checkNonce: () => nonceStore.isFresh(nonceKey),
  });
  if (!validation.valid) {
    return {
      status: "blocked",
      reason: "agentkit_message_invalid",
      detail: validation.error,
    };
  }

  // AgentKit 0.2.1 checks the URI host. Delegated Recovery requires endpoint
  // binding, so a valid signature for another path on the same host is denied.
  if (!sameExactResource(payload.uri, expectedResourceUri)) {
    return { status: "blocked", reason: "exact_resource_mismatch" };
  }

  const signature = await verifyAgentkitSignature(payload);
  if (!signature.valid || !signature.address) {
    return {
      status: "blocked",
      reason: "agentkit_signature_invalid",
      detail: signature.error,
    };
  }

  const agentBook = options.agentBook ?? createAgentBookVerifier();
  let humanId: string | null;
  try {
    humanId = await agentBook.lookupHuman(signature.address);
  } catch (error) {
    return {
      status: "blocked",
      reason: "agentbook_unavailable",
      detail: error instanceof Error ? error.message : "AgentBook lookup failed",
    };
  }
  if (!humanId) {
    return { status: "blocked", reason: "agentbook_unresolved" };
  }

  // Consume only after cryptographic verification + AgentBook resolution. A
  // forged request cannot burn a valid nonce, and SET-NX style stores ensure
  // concurrent copies of the same verified request cannot both proceed.
  if (!(await nonceStore.consume(nonceKey))) {
    return { status: "blocked", reason: "nonce_replayed" };
  }

  const verifiedAtMs = options.nowMs ?? Date.now();
  const verification: WorldAgentVerification = {
    source: "world-agentkit",
    agentAddress: signature.address,
    humanBacked: true,
    agentBookResolved: true,
    resourceUri: expectedResourceUri,
    verifiedAt: new Date(verifiedAtMs).toISOString(),
    expiresAt: verificationExpiry(payload.expirationTime, verifiedAtMs),
  };

  const gate = evaluateWorldAgentGate(
    verification,
    expectedResourceUri,
    expectedAgentAddress,
    verifiedAtMs
  );
  if (gate.status === "blocked") {
    return { status: "blocked", reason: gate.reason };
  }

  return {
    status: "allowed",
    reason: gate.reason,
    verification,
  };
}
