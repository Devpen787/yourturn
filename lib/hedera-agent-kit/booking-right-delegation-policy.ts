import {
  AbstractPolicy,
  type PreToolExecutionParams,
} from "@hashgraph/hedera-agent-kit";
import { AccountId, TokenId } from "@hiero-ledger/sdk";
import { getRedis } from "../store/redis.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL,
  YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
} from "./delegated-recovery-plugin.ts";

export type BookingRightDelegationAction = "DELEGATE" | "REVOKE" | "RECOVER";
export type BookingRightPolicyOutcome = "ALLOW" | "BLOCK" | "ESCALATE";

export type BookingRightRecoveryAsset =
  | { kind: "HBAR" }
  | { kind: "HTS"; tokenId: string };

export type BookingRightDelegation = {
  delegationId: string;
  delegatedAgentAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  serial: number;
  holderAccountId: string;
  allowedActions: BookingRightDelegationAction[];
  minimumRecovery: {
    asset: BookingRightRecoveryAsset;
    atomicUnits: string;
  };
  expiresAtMs: number;
  cancellationAllowed: boolean;
  providerPolicyId: string;
  revokedAtMs?: number | null;
};

export type BookingRightDelegationInvocation = {
  agentAccountId: string;
  currentHolderAccountId: string;
  action: BookingRightDelegationAction;
  nonce: string;
  providerPolicy: {
    id: string;
    state: "ALLOW" | "BLOCK" | "REVIEW";
  };
  recovery?: {
    asset: BookingRightRecoveryAsset;
    atomicUnits: string;
  };
  receiverAccountId?: string;
};

export type BookingRightPolicyReason =
  | "ALLOW"
  | "DELEGATION_REVOKED"
  | "DELEGATION_EXPIRED"
  | "AGENT_MISMATCH"
  | "TOKEN_MISMATCH"
  | "SERIAL_MISMATCH"
  | "HOLDER_MISMATCH"
  | "SPENDER_MISMATCH"
  | "PAYER_MISMATCH"
  | "ACTION_NOT_ALLOWED"
  | "TOOL_ACTION_MISMATCH"
  | "CANCELLATION_NOT_ALLOWED"
  | "RECOVERY_QUOTE_MISSING"
  | "RECOVERY_ASSET_MISMATCH"
  | "BELOW_MINIMUM_RECOVERY"
  | "RECEIVER_MISMATCH"
  | "SETTLEMENT_TOKEN_MISMATCH"
  | "SETTLEMENT_AMOUNT_MISMATCH"
  | "SETTLEMENT_RECIPIENT_MISMATCH"
  | "SETTLEMENT_DECIMALS_MISMATCH"
  | "PROVIDER_POLICY_CHANGED"
  | "PROVIDER_POLICY_STATE_INVALID"
  | "PROVIDER_POLICY_DENIED"
  | "PROVIDER_POLICY_REVIEW"
  | "INVALID_DELEGATION"
  | "INVALID_NONCE"
  | "REPLAY_STORE_UNAVAILABLE"
  | "IDEMPOTENT_REPLAY"
  | "NONCE_CONFLICT";

export type BookingRightPolicyDecision = {
  outcome: BookingRightPolicyOutcome;
  reason: BookingRightPolicyReason;
  delegationId: string;
  action: BookingRightDelegationAction;
  tokenId: string;
  serial: number;
  detail: string;
};

export type BookingRightNonceReservation =
  | "claimed"
  | "duplicate"
  | "conflict"
  | "unavailable";

export interface BookingRightNonceStore {
  reserve(args: {
    key: string;
    fingerprint: string;
    ttlSeconds: number;
  }): Promise<BookingRightNonceReservation>;
}

export class RedisBookingRightNonceStore implements BookingRightNonceStore {
  async reserve(args: {
    key: string;
    fingerprint: string;
    ttlSeconds: number;
  }): Promise<BookingRightNonceReservation> {
    const redis = getRedis();
    if (!redis) return "unavailable";

    try {
      const claimed = await redis.set(args.key, args.fingerprint, {
        nx: true,
        ex: args.ttlSeconds,
      });
      if (claimed === "OK") return "claimed";

      const existing = await redis.get<string>(args.key);
      if (typeof existing !== "string") return "unavailable";
      return existing === args.fingerprint ? "duplicate" : "conflict";
    } catch {
      return "unavailable";
    }
  }
}

export class BookingRightDelegationPolicyError extends Error {
  readonly decision: BookingRightPolicyDecision;

  constructor(decision: BookingRightPolicyDecision) {
    super(`booking_right_delegation:${decision.outcome}:${decision.reason}`);
    this.name = "BookingRightDelegationPolicyError";
    this.decision = decision;
  }
}

type RawDelegatedRecoveryParams = {
  tokenId?: unknown;
  serial?: unknown;
  ownerAccountId?: unknown;
  spenderAccountId?: unknown;
  receiverAccountId?: unknown;
  settlementTokenId?: unknown;
  settlementAmountAtomicUnits?: unknown;
  settlementRecipientAccountId?: unknown;
  settlementDecimals?: unknown;
};

type RuntimeProviderPolicy = {
  id?: unknown;
  state?: unknown;
};

const TOOL_ACTION: Record<string, BookingRightDelegationAction> = {
  [YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL]: "DELEGATE",
  [YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL]: "REVOKE",
  [YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL]: "RECOVER",
  [YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL]: "RECOVER",
};

const BOOKING_RIGHT_DELEGATION_ACTIONS = new Set<BookingRightDelegationAction>([
  "DELEGATE",
  "REVOKE",
  "RECOVER",
]);

function validAllowedActions(value: unknown): value is BookingRightDelegationAction[] {
  return (
    Array.isArray(value) &&
    value.every(
      (action) =>
        typeof action === "string" &&
        BOOKING_RIGHT_DELEGATION_ACTIONS.has(action as BookingRightDelegationAction)
    )
  );
}

function account(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return AccountId.fromString(value).toString();
  } catch {
    return null;
  }
}

function token(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return TokenId.fromString(value).toString();
  } catch {
    return null;
  }
}

function positiveSerial(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function validIdentifier(value: string): boolean {
  return value.length >= 1 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function atomicUnits(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function canonicalAsset(asset: BookingRightRecoveryAsset): string | null {
  if (asset.kind === "HBAR") return "HBAR";
  const tokenId = token(asset.tokenId);
  return tokenId ? `HTS:${tokenId}` : null;
}

function stableFingerprint(args: {
  method: string;
  delegation: BookingRightDelegation;
  invocation: BookingRightDelegationInvocation;
  raw: RawDelegatedRecoveryParams;
}): string {
  return JSON.stringify({
    method: args.method,
    delegationId: args.delegation.delegationId,
    agentAccountId: account(args.invocation.agentAccountId),
    action: args.invocation.action,
    tokenId: token(args.raw.tokenId),
    serial: positiveSerial(args.raw.serial),
    holderAccountId: account(args.raw.ownerAccountId),
    spenderAccountId: account(args.raw.spenderAccountId),
    receiverAccountId: account(args.raw.receiverAccountId ?? args.invocation.receiverAccountId),
    providerPolicyId: args.invocation.providerPolicy.id,
    providerPolicyState: args.invocation.providerPolicy.state,
    recoveryAsset: args.invocation.recovery
      ? canonicalAsset(args.invocation.recovery.asset)
      : null,
    recoveryAtomicUnits: args.invocation.recovery?.atomicUnits ?? null,
    settlementTokenId: token(args.raw.settlementTokenId),
    settlementAmountAtomicUnits:
      atomicUnits(args.raw.settlementAmountAtomicUnits)?.toString() ?? null,
    settlementRecipientAccountId: account(args.raw.settlementRecipientAccountId),
    settlementDecimals:
      typeof args.raw.settlementDecimals === "number"
        ? args.raw.settlementDecimals
        : null,
    nonce: args.invocation.nonce,
  });
}

function decision(
  delegation: BookingRightDelegation,
  invocation: BookingRightDelegationInvocation,
  outcome: BookingRightPolicyOutcome,
  reason: BookingRightPolicyReason,
  detail: string
): BookingRightPolicyDecision {
  return {
    outcome,
    reason,
    delegationId: delegation.delegationId,
    action: invocation.action,
    tokenId: delegation.tokenId,
    serial: delegation.serial,
    detail,
  };
}

/**
 * ETHOnline 2026 booking-right delegation policy for the HAK v4 BaseTool lifecycle.
 *
 * The policy intentionally runs at pre-tool execution so a rejected request cannot
 * construct transaction bytes. Replay reservation is the final check and is durable
 * by default: production fails closed when Upstash Redis is unavailable rather than
 * silently falling back to process memory.
 */
export class BookingRightDelegationPolicy extends AbstractPolicy {
  readonly name = "YourTurn BookingRight Delegation Policy";
  readonly description =
    "Binds delegated booking-right recovery to an exact agent, NFT serial, holder, action, minimum recovery, provider policy, expiry, revocation state, and durable nonce.";
  readonly relevantTools = [
    YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
    YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL,
    YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
    YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL,
  ];

  lastDecision: BookingRightPolicyDecision | null = null;

  constructor(
    readonly delegation: BookingRightDelegation,
    readonly invocation: BookingRightDelegationInvocation,
    private readonly nonceStore: BookingRightNonceStore = new RedisBookingRightNonceStore(),
    private readonly now: () => number = () => Date.now()
  ) {
    super();
  }

  private finish(
    outcome: BookingRightPolicyOutcome,
    reason: BookingRightPolicyReason,
    detail: string
  ): BookingRightPolicyDecision {
    const value = decision(this.delegation, this.invocation, outcome, reason, detail);
    this.lastDecision = value;
    return value;
  }

  private stop(
    outcome: Exclude<BookingRightPolicyOutcome, "ALLOW">,
    reason: BookingRightPolicyReason,
    detail: string
  ): never {
    throw new BookingRightDelegationPolicyError(this.finish(outcome, reason, detail));
  }

  protected async shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string
  ): Promise<boolean> {
    const raw = (params.rawParams ?? {}) as RawDelegatedRecoveryParams;
    const expectedAction = TOOL_ACTION[method];
    const nowMs = this.now();

    const delegationIdValid = validIdentifier(this.delegation.delegationId);
    const nonceValid = validIdentifier(this.invocation.nonce);
    const delegatedAgent = account(this.delegation.delegatedAgentAccountId);
    const invokedAgent = account(this.invocation.agentAccountId);
    const delegatedHolder = account(this.delegation.holderAccountId);
    const currentHolder = account(this.invocation.currentHolderAccountId);
    const rawHolder = account(raw.ownerAccountId);
    const delegatedSpender = account(this.delegation.spenderAccountId);
    const rawSpender = account(raw.spenderAccountId);
    const delegatedToken = token(this.delegation.tokenId);
    const rawToken = token(raw.tokenId);
    const rawSerial = positiveSerial(raw.serial);

    if (
      !delegationIdValid ||
      !delegatedAgent ||
      !delegatedHolder ||
      !delegatedSpender ||
      !delegatedToken ||
      !positiveSerial(this.delegation.serial) ||
      !Number.isFinite(this.delegation.expiresAtMs) ||
      !validIdentifier(this.delegation.providerPolicyId) ||
      !validAllowedActions(this.delegation.allowedActions) ||
      !canonicalAsset(this.delegation.minimumRecovery.asset) ||
      atomicUnits(this.delegation.minimumRecovery.atomicUnits) === null
    ) {
      this.stop("BLOCK", "INVALID_DELEGATION", "Delegation contains malformed or non-canonical security fields.");
    }
    if (!nonceValid) {
      this.stop("BLOCK", "INVALID_NONCE", "Invocation nonce must be 1-128 safe identifier characters.");
    }
    if (this.delegation.revokedAtMs != null) {
      this.stop("BLOCK", "DELEGATION_REVOKED", "Delegation has already been revoked.");
    }
    if (nowMs >= this.delegation.expiresAtMs) {
      this.stop("BLOCK", "DELEGATION_EXPIRED", "Delegation is expired at execution time.");
    }
    if (!expectedAction || expectedAction !== this.invocation.action) {
      this.stop("BLOCK", "TOOL_ACTION_MISMATCH", `Tool ${method} is not bound to requested action ${this.invocation.action}.`);
    }
    if (!delegatedAgent || delegatedAgent !== invokedAgent) {
      this.stop("BLOCK", "AGENT_MISMATCH", "Invocation agent does not match the delegated agent.");
    }
    if (!delegatedToken || delegatedToken !== rawToken) {
      this.stop("BLOCK", "TOKEN_MISMATCH", "Tool token does not match the delegated booking-right token.");
    }
    if (this.delegation.serial !== rawSerial) {
      this.stop("BLOCK", "SERIAL_MISMATCH", "Tool serial does not match the delegated booking-right serial.");
    }
    if (!delegatedHolder || delegatedHolder !== currentHolder || delegatedHolder !== rawHolder) {
      this.stop("BLOCK", "HOLDER_MISMATCH", "Current holder and tool owner must both match the delegated holder.");
    }
    if (!delegatedSpender || delegatedSpender !== rawSpender) {
      this.stop("BLOCK", "SPENDER_MISMATCH", "Tool spender does not match the delegated Hedera spender account.");
    }

    const payer = account(params.context.accountId);
    const expectedPayer = this.invocation.action === "RECOVER" ? delegatedSpender : delegatedHolder;
    if (!payer || payer !== expectedPayer) {
      this.stop("BLOCK", "PAYER_MISMATCH", "HAK context payer is not the signer expected for this delegated action.");
    }
    if (!this.delegation.allowedActions.includes(this.invocation.action)) {
      this.stop("BLOCK", "ACTION_NOT_ALLOWED", "Requested action is outside the holder-approved action set.");
    }
    if (this.invocation.action === "REVOKE" && !this.delegation.cancellationAllowed) {
      this.stop("BLOCK", "CANCELLATION_NOT_ALLOWED", "Holder delegation does not permit agent-initiated cancellation/revocation.");
    }

    const runtimeProviderPolicy = this.invocation.providerPolicy as unknown as
      | RuntimeProviderPolicy
      | null
      | undefined;
    const providerPolicyState = runtimeProviderPolicy?.state;
    if (
      providerPolicyState !== "ALLOW" &&
      providerPolicyState !== "BLOCK" &&
      providerPolicyState !== "REVIEW"
    ) {
      this.stop(
        "ESCALATE",
        "PROVIDER_POLICY_STATE_INVALID",
        "Provider policy state is missing, malformed, or unrecognized; only exact ALLOW may authorize transaction preparation."
      );
    }
    if (runtimeProviderPolicy?.id !== this.delegation.providerPolicyId) {
      this.stop("ESCALATE", "PROVIDER_POLICY_CHANGED", "Provider policy identity changed after delegation; human/provider review is required.");
    }
    if (providerPolicyState === "BLOCK") {
      this.stop("BLOCK", "PROVIDER_POLICY_DENIED", "Current provider policy denies this recovery action.");
    }
    if (providerPolicyState === "REVIEW") {
      this.stop("ESCALATE", "PROVIDER_POLICY_REVIEW", "Current provider policy requires review before transaction preparation.");
    }
    if (providerPolicyState !== "ALLOW") {
      this.stop(
        "ESCALATE",
        "PROVIDER_POLICY_STATE_INVALID",
        "Provider policy did not resolve to the exact ALLOW state required for transaction preparation."
      );
    }

    if (this.invocation.action === "RECOVER") {
      if (!this.invocation.recovery) {
        this.stop("BLOCK", "RECOVERY_QUOTE_MISSING", "Recovery action requires an explicit asset and atomic-unit quote.");
      }
      const minimumAsset = canonicalAsset(this.delegation.minimumRecovery.asset);
      const offeredAsset = canonicalAsset(this.invocation.recovery.asset);
      if (!minimumAsset || !offeredAsset || minimumAsset !== offeredAsset) {
        this.stop("BLOCK", "RECOVERY_ASSET_MISMATCH", "Recovery asset does not match the holder-approved minimum asset.");
      }
      const minimum = atomicUnits(this.delegation.minimumRecovery.atomicUnits);
      const offered = atomicUnits(this.invocation.recovery.atomicUnits);
      if (minimum === null || offered === null || offered < minimum) {
        this.stop("BLOCK", "BELOW_MINIMUM_RECOVERY", "Recovery amount is below the holder-approved minimum atomic units.");
      }
      const boundReceiver = account(this.invocation.receiverAccountId);
      const rawReceiver = account(raw.receiverAccountId);
      if (!boundReceiver || boundReceiver !== rawReceiver) {
        this.stop("BLOCK", "RECEIVER_MISMATCH", "Transfer receiver must match the receiver bound into this evaluated invocation.");
      }

      if (method === YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL) {
        if (this.invocation.recovery.asset.kind !== "HTS") {
          this.stop("BLOCK", "SETTLEMENT_TOKEN_MISMATCH", "Atomic settlement requires the exact HTS token bound into the recovery quote.");
        }
        const recoveryToken = token(this.invocation.recovery.asset.tokenId);
        const settlementToken = token(raw.settlementTokenId);
        if (!recoveryToken || !settlementToken || recoveryToken !== settlementToken) {
          this.stop("BLOCK", "SETTLEMENT_TOKEN_MISMATCH", "Settlement token does not match the HTS recovery token that passed policy.");
        }
        const settlementAmount = atomicUnits(raw.settlementAmountAtomicUnits);
        if (settlementAmount === null || settlementAmount !== offered) {
          this.stop("BLOCK", "SETTLEMENT_AMOUNT_MISMATCH", "Settlement atomic units do not match the recovery amount that passed policy.");
        }
        const settlementRecipient = account(raw.settlementRecipientAccountId);
        if (!settlementRecipient || settlementRecipient !== delegatedHolder) {
          this.stop("BLOCK", "SETTLEMENT_RECIPIENT_MISMATCH", "Settlement recipient must be the delegated booking-right holder.");
        }
        if (raw.settlementDecimals !== 6) {
          this.stop("BLOCK", "SETTLEMENT_DECIMALS_MISMATCH", "USDC settlement must use the six-decimal HTS representation.");
        }
      }
    }

    const fingerprint = stableFingerprint({
      method,
      delegation: this.delegation,
      invocation: this.invocation,
      raw,
    });
    const ttlSeconds = Math.max(
      60,
      Math.ceil((this.delegation.expiresAtMs - nowMs) / 1000) + 3600
    );
    const key = `ethonline:hedera:booking-right:${encodeURIComponent(this.delegation.delegationId)}:${this.invocation.action}:${encodeURIComponent(this.invocation.nonce)}`;
    const reservation = await this.nonceStore.reserve({ key, fingerprint, ttlSeconds });

    if (reservation === "unavailable") {
      this.stop("ESCALATE", "REPLAY_STORE_UNAVAILABLE", "Durable replay store is unavailable; transaction preparation fails closed.");
    }
    if (reservation === "duplicate") {
      this.stop("BLOCK", "IDEMPOTENT_REPLAY", "This exact delegated action nonce was already accepted; no second transaction will be prepared.");
    }
    if (reservation === "conflict") {
      this.stop("BLOCK", "NONCE_CONFLICT", "This nonce was already bound to a different delegated action fingerprint.");
    }

    this.finish("ALLOW", "ALLOW", "Exact delegation scope and durable nonce reservation accepted.");
    return false;
  }
}
