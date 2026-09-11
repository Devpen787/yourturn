import type { ApprovalGrantClaims } from "../server/approval-grants.ts";
import type { BookingPortAction } from "../types/booking-port.ts";
import type { WorldAgentBookLookup } from "./server-verifier.ts";
import { verifyWorldAgentRequest } from "./server-verifier.ts";
import { toWorldPublicTrustSummary } from "./trust-boundary.ts";
import type { WorldAgentNonceStore } from "./nonce-store.ts";

export type WorldProtectedRecoveryAction = "create_listing" | "cancel_release";

export type WorldRecoveryWriteDecision =
  | {
      status: "allowed";
      reason: "human_backed_delegated_agent_verified";
      publicTrust: ReturnType<typeof toWorldPublicTrustSummary>;
    }
  | {
      status: "blocked";
      reason:
        | "mandate_kind_invalid"
        | "mandate_action_not_exact"
        | "mandate_serial_not_exact"
        | "mandate_actor_missing"
        | "mandate_agent_missing"
        | "mandate_agent_invalid"
        | `world_${string}`;
    };

function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

/**
 * World is an additional requester-identity gate, not booking authority.
 *
 * The existing server-signed, exact-scoped ApprovalGrant is the branch's
 * current YourTurn mandate carrier. For recovery writes we require it to name
 * the delegated agent before looking at the AgentKit request. That prevents a
 * requesting agent from self-asserting which address YourTurn expected.
 *
 * The grant remains responsible for YourTurn action/actor/serial authority;
 * World proves only that the cryptographically requesting agent resolves to a
 * World-ID-backed human record and is the same delegated address.
 */
export async function authorizeWorldRecoveryWrite(options: {
  agentkitHeader: string | null | undefined;
  expectedResourceUri: string;
  grant: ApprovalGrantClaims;
  previewAction: BookingPortAction;
  previewSerial: number;
  nonceStore: WorldAgentNonceStore;
  agentBook?: WorldAgentBookLookup;
}): Promise<WorldRecoveryWriteDecision> {
  const {
    agentkitHeader,
    expectedResourceUri,
    grant,
    previewAction,
    previewSerial,
    nonceStore,
    agentBook,
  } = options;

  if (grant.kind !== "booked-rights-approval-grant") {
    return { status: "blocked", reason: "mandate_kind_invalid" };
  }
  if (grant.action === "any" || grant.action !== previewAction) {
    return { status: "blocked", reason: "mandate_action_not_exact" };
  }
  if (grant.serial == null || grant.serial !== previewSerial) {
    return { status: "blocked", reason: "mandate_serial_not_exact" };
  }
  if (!grant.actor) {
    return { status: "blocked", reason: "mandate_actor_missing" };
  }

  const expectedAgentAddress = grant.delegatedAgentAddress?.trim();
  if (!expectedAgentAddress) {
    return { status: "blocked", reason: "mandate_agent_missing" };
  }
  if (!isEvmAddress(expectedAgentAddress)) {
    return { status: "blocked", reason: "mandate_agent_invalid" };
  }

  const world = await verifyWorldAgentRequest({
    agentkitHeader,
    expectedResourceUri,
    expectedAgentAddress,
    nonceStore,
    ...(agentBook ? { agentBook } : {}),
  });
  if (world.status === "blocked") {
    return { status: "blocked", reason: `world_${world.reason}` };
  }

  return {
    status: "allowed",
    reason: "human_backed_delegated_agent_verified",
    publicTrust: toWorldPublicTrustSummary(world.verification),
  };
}

export function isWorldProtectedRecoveryAction(
  action: BookingPortAction
): action is WorldProtectedRecoveryAction {
  return action === "create_listing" || action === "cancel_release";
}
