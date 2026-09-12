export type WorldAgentVerification = {
  source: "world-agentkit";
  agentAddress: string;
  humanBacked: boolean;
  agentBookResolved: boolean;
  resourceUri: string;
  verifiedAt: string;
  expiresAt: string;
};

export type WorldAgentGateDecision =
  | { status: "allowed"; reason: "human_backed_agent_verified" }
  | {
      status: "blocked";
      reason:
        | "source_mismatch"
        | "not_human_backed"
        | "agentbook_unresolved"
        | "resource_mismatch"
        | "invalid_agent_address"
        | "agent_mismatch"
        | "invalid_timestamp"
        | "verified_in_future"
        | "expired";
    };

export const WORLD_AGENT_MAX_CLOCK_SKEW_MS = 30_000;

function normalizeEvmAddress(value: string): string | null {
  const candidate = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(candidate)) return null;
  return candidate.toLowerCase();
}

/**
 * Post-verification policy boundary only. `verification` must be constructed
 * server-side by the World AgentKit adapter after message/signature/AgentBook
 * checks; never deserialize this object directly from a client request.
 *
 * World proves a human-backed requester signal only. The caller must provide
 * the exact agent address from the already-resolved YourTurn Recovery Mandate;
 * this gate then binds the World-verified requester to that delegated agent.
 * Booking ownership, action scope and provider policy remain separate
 * YourTurn/Hedera facts.
 */
export function evaluateWorldAgentGate(
  verification: WorldAgentVerification,
  expectedResourceUri: string,
  expectedAgentAddress: string,
  nowMs = Date.now()
): WorldAgentGateDecision {
  if (verification.source !== "world-agentkit") {
    return { status: "blocked", reason: "source_mismatch" };
  }
  if (!verification.humanBacked) return { status: "blocked", reason: "not_human_backed" };
  if (!verification.agentBookResolved) return { status: "blocked", reason: "agentbook_unresolved" };
  if (verification.resourceUri !== expectedResourceUri) return { status: "blocked", reason: "resource_mismatch" };

  const verifiedAgent = normalizeEvmAddress(verification.agentAddress);
  const expectedAgent = normalizeEvmAddress(expectedAgentAddress);
  if (!verifiedAgent || !expectedAgent) {
    return { status: "blocked", reason: "invalid_agent_address" };
  }
  if (verifiedAgent !== expectedAgent) {
    return { status: "blocked", reason: "agent_mismatch" };
  }

  const verifiedAtMs = Date.parse(verification.verifiedAt);
  const expiresAtMs = Date.parse(verification.expiresAt);
  if (!Number.isFinite(verifiedAtMs) || !Number.isFinite(expiresAtMs)) {
    return { status: "blocked", reason: "invalid_timestamp" };
  }
  if (verifiedAtMs > nowMs + WORLD_AGENT_MAX_CLOCK_SKEW_MS) {
    return { status: "blocked", reason: "verified_in_future" };
  }
  if (expiresAtMs <= verifiedAtMs || expiresAtMs <= nowMs) {
    return { status: "blocked", reason: "expired" };
  }
  return { status: "allowed", reason: "human_backed_agent_verified" };
}

/** Safe for receipts/UI: raw AgentBook human IDs and agent addresses stay private. */
export function toWorldPublicTrustSummary(verification: WorldAgentVerification) {
  return {
    signal: "human-backed-agent" as const,
    verifiedAt: verification.verifiedAt,
    source: verification.source,
  };
}
