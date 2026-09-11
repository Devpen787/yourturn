import {
  YOURTURN_AGENT_NAME,
  YOURTURN_AGENT_VERSION,
  YOURTURN_TOOL_MANIFEST_VERSION,
} from "@/lib/hedera-agent-kit/tool-manifest";
import {
  accountsEqual,
  getActorCredentials,
  tryResolveGuestActor,
} from "@/lib/hedera/client";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import { getNftBySerial } from "@/lib/hedera/mirror";
import {
  burnUsedSlot,
  getTreasuryIdString,
  refundAndTransferNftFromHolderToTreasury,
} from "@/lib/hedera/token";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import {
  bookingPort,
  BookingPortError,
  inspectBookingPortPreview,
} from "@/lib/adapters/booking-port";
import { getLifecycleEventsForSerial } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import {
  addListing,
  deactivateListing,
  getActiveListingForSerial,
} from "@/lib/store/listings";
import {
  acquireRecoveryOperationLease,
  assertRecoveryOperationLease,
  createRecoveryOperationIdentity,
  createRecoveryOperationIfAbsent,
  loadRecoveryOperation,
  releaseRecoveryOperationLease,
  saveRecoveryOperation,
  type RecoveryOperationIdentityInput,
  type RecoveryOperationRecord,
} from "@/lib/store/recovery-operations";
import {
  getSlotBySerial,
  updateSlotListingActive,
} from "@/lib/store/slots";
import type { BookingActorRef, ResaleListingView } from "@/lib/types/booking-port";
import type { ResaleListing } from "@/lib/types/listing";

export type WorldRecoverySagaPhase =
  | "operation_busy"
  | "listing_audit"
  | "listing_activation"
  | "cancel_listing_deactivation"
  | "cancel_transfer"
  | "cancel_burn"
  | "cancel_audit";

export class RecoveryOperationReconcileError extends Error {
  readonly operationId: string;
  readonly phase: WorldRecoverySagaPhase;

  constructor(operationId: string, phase: WorldRecoverySagaPhase, message: string) {
    super(message);
    this.name = "RecoveryOperationReconcileError";
    this.operationId = operationId;
    this.phase = phase;
  }
}

type CreateListingPayload = {
  action: "create_listing";
  input: {
    seller: BookingActorRef;
    serial: number;
    askPriceHbar: number;
  };
  expiresAt: string;
};

type CancelReleasePayload = {
  action: "cancel_release";
  input: {
    holder: BookingActorRef;
    serial: number;
  };
  expiresAt: string;
};

type ProtectedPayload = CreateListingPayload | CancelReleasePayload;

type SagaAuthorization = {
  grantId: string;
  delegatedAgentAddress: string;
};

type CreateListingSagaResult = {
  recoveryOperationId: string;
  recoveryStatus: "completed";
  listing: ResaleListingView;
  auditTxId: string | null;
  hashscanUrl: string | null;
};

type CancelReleaseSagaResult = {
  recoveryOperationId: string;
  recoveryStatus: "completed";
  txIds: {
    transferToTreasury: string | null;
    burn: string | null;
    audit: string | null;
  };
  hashscanUrls: {
    transferToTreasury: string | null;
    burn: string | null;
    audit: string | null;
  };
  refundHbar: number;
};

const CREATE_STEPS = ["listing_audit", "listing_activation"] as const;
const CANCEL_STEPS = [
  "cancel_listing_deactivation",
  "cancel_transfer",
  "cancel_burn",
  "cancel_audit",
] as const;

function parseValidatedPreview(previewId: string): ProtectedPayload {
  // Re-run the canonical preview verification here so this module cannot be
  // safely called with a merely decoded client payload. The payload is decoded
  // only after the HMAC/expiry check succeeds.
  const scope = inspectBookingPortPreview(previewId);
  if (scope.action !== "create_listing" && scope.action !== "cancel_release") {
    throw new BookingPortError(
      "Preview is not a World-protected recovery action",
      "VALIDATION_ERROR",
      400
    );
  }
  const [payload] = previewId.split(".");
  if (!payload) {
    throw new BookingPortError("Invalid preview token", "VALIDATION_ERROR", 400);
  }
  const decoded = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  ) as ProtectedPayload;
  if (decoded.action !== scope.action || decoded.input.serial !== scope.serial) {
    throw new BookingPortError(
      "Preview payload does not match verified recovery scope",
      "CONFLICT",
      409
    );
  }
  return decoded;
}

function actorAccountId(actor: BookingActorRef): string {
  if (actor.kind === "demoActor") {
    return getActorCredentials(actor.id).accountId.toString();
  }
  return actor.accountId;
}

async function resources(): Promise<{
  tokenId: string;
  topicId: string;
  treasuryAccountId: string;
}> {
  const tokenId = await getStoredTokenId();
  const topicId = await getStoredTopicId();
  if (!tokenId || !topicId) {
    throw new BookingPortError("Run /api/init first", "NOT_FOUND", 400);
  }
  return { tokenId, topicId, treasuryAccountId: getTreasuryIdString() };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

async function rememberReconciling(
  operation: RecoveryOperationRecord,
  phase: WorldRecoverySagaPhase,
  error: unknown
): Promise<never> {
  operation.status = "reconciling";
  operation.lastError = `${phase}: ${safeErrorMessage(error)}`;
  try {
    await saveRecoveryOperation(operation);
  } catch {
    // The last durable record remains the pre-effect `running` marker, which is
    // exactly the safe state a later retry must reconcile instead of replaying.
  }
  throw new RecoveryOperationReconcileError(
    operation.operationId,
    phase,
    `Recovery operation is reconciling at ${phase}; do not replay committed effects.`
  );
}

async function markRunning(
  operation: RecoveryOperationRecord,
  leaseToken: string,
  stepName: string
): Promise<void> {
  await assertRecoveryOperationLease(operation.operationId, leaseToken);
  const step = operation.steps[stepName];
  if (!step) throw new Error(`Missing recovery step ${stepName}`);
  step.state = "running";
  step.startedAt = step.startedAt ?? new Date().toISOString();
  delete step.completedAt;
  delete step.receipt;
  delete step.evidence;
  operation.status = "running";
  delete operation.lastError;
  await saveRecoveryOperation(operation);
}

async function markSucceeded(
  operation: RecoveryOperationRecord,
  stepName: string,
  receipt: string | null,
  evidenceKind: "transaction_receipt" | "hcs_event" | "mirror_state" | "local_state",
  evidenceValue: string
): Promise<void> {
  const step = operation.steps[stepName];
  if (!step) throw new Error(`Missing recovery step ${stepName}`);
  step.state = "succeeded";
  step.receipt = receipt;
  step.evidence = { kind: evidenceKind, value: evidenceValue };
  step.completedAt = new Date().toISOString();
  await saveRecoveryOperation(operation);
}

async function markReconciled(
  operation: RecoveryOperationRecord,
  stepName: string,
  evidenceKind: "hcs_event" | "mirror_state" | "local_state",
  evidenceValue: string
): Promise<void> {
  const step = operation.steps[stepName];
  if (!step) throw new Error(`Missing recovery step ${stepName}`);
  step.state = "reconciled";
  step.receipt = step.receipt ?? null;
  step.evidence = { kind: evidenceKind, value: evidenceValue };
  step.completedAt = new Date().toISOString();
  await saveRecoveryOperation(operation);
}

async function findAuditEvent(
  operation: RecoveryOperationRecord,
  eventType: "LISTED" | "CANCEL_RELEASED"
): Promise<boolean> {
  const events = await getLifecycleEventsForSerial({
    topicId: await getStoredTopicId(),
    tokenId: operation.tokenId,
    serial: operation.serial,
  });
  return events.some(
    (event) =>
      event.eventType === eventType &&
      event.agentProof?.approvalId === operation.operationId
  );
}

async function getOrOpenOperation(input: {
  identity: RecoveryOperationIdentityInput;
  authorization: SagaAuthorization;
  stepNames: readonly string[];
  preflight: () => Promise<unknown>;
}): Promise<RecoveryOperationRecord> {
  const identity = createRecoveryOperationIdentity(input.identity);
  const existing = await loadRecoveryOperation(identity.operationId);
  if (existing) {
    if (existing.identityHash !== identity.identityHash) {
      throw new Error("Recovery operation identity mismatch");
    }
    return existing;
  }

  // Existing booking/provider/holder rules remain authoritative for opening a
  // new operation. A partially committed operation intentionally skips this
  // fresh-state check on resume because the operation itself may have changed
  // the current chain state.
  await input.preflight();
  const opened = await createRecoveryOperationIfAbsent({
    identity: input.identity,
    initialAuthorizationGrantId: input.authorization.grantId,
    stepNames: [...input.stepNames],
  });
  return opened.record;
}

async function completeOperation<T>(
  operation: RecoveryOperationRecord,
  result: T
): Promise<T> {
  operation.status = "completed";
  operation.result = result;
  delete operation.lastError;
  await saveRecoveryOperation(operation);
  return result;
}

function cachedResult<T>(operation: RecoveryOperationRecord): T | null {
  if (operation.status !== "completed" || !operation.result) return null;
  return operation.result as T;
}

function operationHasStarted(operation: RecoveryOperationRecord): boolean {
  return Object.values(operation.steps).some((step) => step.state !== "pending");
}

async function withLease<T>(
  operation: RecoveryOperationRecord,
  fn: (leaseToken: string) => Promise<T>
): Promise<T> {
  const token = await acquireRecoveryOperationLease(operation.operationId);
  if (!token) {
    throw new RecoveryOperationReconcileError(
      operation.operationId,
      "operation_busy",
      "Recovery operation is already executing or reconciling."
    );
  }
  try {
    return await fn(token);
  } catch (error) {
    if (error instanceof RecoveryOperationReconcileError) throw error;
    if (!operationHasStarted(operation)) throw error;
    return rememberReconciling(operation, "operation_busy", error);
  } finally {
    try {
      await releaseRecoveryOperationLease(operation.operationId, token);
    } catch {
      // Lease expiry is safe because every external step is durably marked
      // `running` before execution and must reconcile before re-execution.
    }
  }
}

export async function confirmWorldCreateListing(input: {
  previewId: string;
  authorization: SagaAuthorization;
}): Promise<CreateListingSagaResult> {
  const preview = parseValidatedPreview(input.previewId);
  if (preview.action !== "create_listing") {
    throw new BookingPortError(
      "Preview token is not for create listing",
      "VALIDATION_ERROR",
      400
    );
  }
  const stored = await resources();
  const sellerAccountId = actorAccountId(preview.input.seller);
  const identity: RecoveryOperationIdentityInput = {
    action: "create_listing",
    actorAccountId: sellerAccountId,
    tokenId: stored.tokenId,
    serial: preview.input.serial,
    delegatedAgentAddress: input.authorization.delegatedAgentAddress,
    parameters: { askPriceHbar: preview.input.askPriceHbar },
  };
  const operation = await getOrOpenOperation({
    identity,
    authorization: input.authorization,
    stepNames: CREATE_STEPS,
    preflight: () => bookingPort.previewCreateListing(preview.input),
  });
  const cached = cachedResult<CreateListingSagaResult>(operation);
  if (cached) return cached;

  return withLease(operation, async (leaseToken) => {
    if (!operationHasStarted(operation)) {
      await bookingPort.previewCreateListing(preview.input);
    }
    const auditStep = operation.steps.listing_audit;
    if (auditStep.state === "running") {
      if (!(await findAuditEvent(operation, "LISTED"))) {
        return rememberReconciling(
          operation,
          "listing_audit",
          new Error("LISTED audit receipt is still unknown")
        );
      }
      await markReconciled(
        operation,
        "listing_audit",
        "hcs_event",
        `LISTED:${operation.operationId}`
      );
    }

    if (
      auditStep.state !== "succeeded" &&
      auditStep.state !== "reconciled"
    ) {
      await markRunning(operation, leaseToken, "listing_audit");
      let auditTxId: string;
      try {
        auditTxId = await submitLifecycleEvent(stored.topicId, {
          eventType: "LISTED",
          tokenId: stored.tokenId,
          serial: preview.input.serial,
          from: sellerAccountId,
          priceHbar: preview.input.askPriceHbar,
          agentProof: {
            agentName: YOURTURN_AGENT_NAME,
            agentVersion: YOURTURN_AGENT_VERSION,
            manifestVersion: YOURTURN_TOOL_MANIFEST_VERSION,
            toolId: "yourturn.recovery.confirm_listing",
            approvalId: operation.operationId,
            proofType: "agent_policy_approved_action",
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return rememberReconciling(operation, "listing_audit", error);
      }
      try {
        await markSucceeded(
          operation,
          "listing_audit",
          auditTxId,
          "transaction_receipt",
          auditTxId
        );
      } catch (error) {
        return rememberReconciling(operation, "listing_audit", error);
      }
    }

    const activationStep = operation.steps.listing_activation;
    if (activationStep.state === "pending") {
      try {
        await bookingPort.previewCreateListing(preview.input);
      } catch (error) {
        return rememberReconciling(operation, "listing_activation", error);
      }
    }
    if (activationStep.state === "running") {
      // Both local writes are idempotent. Re-running them repairs a crash between
      // listing storage and the slot flag without repeating any Hedera effect.
      try {
        const listing: ResaleListing = {
          tokenId: stored.tokenId,
          serial: preview.input.serial,
          sellerAccountId,
          askPriceHbar: preview.input.askPriceHbar,
          active: true,
          createdAt: operation.createdAt,
        };
        await addListing(listing);
        await updateSlotListingActive(preview.input.serial, true);
        await markReconciled(
          operation,
          "listing_activation",
          "local_state",
          `listing_active:${preview.input.serial}`
        );
      } catch (error) {
        return rememberReconciling(operation, "listing_activation", error);
      }
    } else if (
      activationStep.state !== "succeeded" &&
      activationStep.state !== "reconciled"
    ) {
      await markRunning(operation, leaseToken, "listing_activation");
      try {
        const listing: ResaleListing = {
          tokenId: stored.tokenId,
          serial: preview.input.serial,
          sellerAccountId,
          askPriceHbar: preview.input.askPriceHbar,
          active: true,
          createdAt: operation.createdAt,
        };
        await addListing(listing);
        await updateSlotListingActive(preview.input.serial, true);
        await markSucceeded(
          operation,
          "listing_activation",
          null,
          "local_state",
          `listing_active:${preview.input.serial}`
        );
      } catch (error) {
        return rememberReconciling(operation, "listing_activation", error);
      }
    }

    const listing = await bookingPort.getListing(preview.input.serial);
    if (!listing?.active) {
      return rememberReconciling(
        operation,
        "listing_activation",
        new Error("Audited listing is not durably active")
      );
    }
    const receipt = operation.steps.listing_audit.receipt ?? null;
    return completeOperation(operation, {
      recoveryOperationId: operation.operationId,
      recoveryStatus: "completed" as const,
      listing,
      auditTxId: receipt,
      hashscanUrl: receipt ? getHashscanTxUrl(receipt) : null,
    });
  });
}

function cancelHolderActor(actor: BookingActorRef): "guestA" | "guestB" {
  if (actor.kind === "demoActor") {
    if (actor.id === "guestA" || actor.id === "guestB") return actor.id;
    throw new BookingPortError(
      "Holder must be one of the demo guest accounts.",
      "CONFLICT",
      409
    );
  }
  const resolved = tryResolveGuestActor(actor.accountId);
  if (resolved === "guestA" || resolved === "guestB") return resolved;
  throw new BookingPortError(
    "Holder must resolve to one of the demo guest accounts.",
    "CONFLICT",
    409
  );
}

export async function confirmWorldCancelRelease(input: {
  previewId: string;
  authorization: SagaAuthorization;
}): Promise<CancelReleaseSagaResult> {
  const preview = parseValidatedPreview(input.previewId);
  if (preview.action !== "cancel_release") {
    throw new BookingPortError(
      "Preview token is not for cancel release",
      "VALIDATION_ERROR",
      400
    );
  }
  const stored = await resources();
  const slot = await getSlotBySerial(preview.input.serial);
  if (!slot) {
    throw new BookingPortError("Unknown serial", "NOT_FOUND", 404);
  }
  const holderAccountId = actorAccountId(preview.input.holder);
  const holderActor = cancelHolderActor(preview.input.holder);
  const identity: RecoveryOperationIdentityInput = {
    action: "cancel_release",
    actorAccountId: holderAccountId,
    tokenId: stored.tokenId,
    serial: preview.input.serial,
    delegatedAgentAddress: input.authorization.delegatedAgentAddress,
    parameters: {
      refundHbar: slot.primaryPriceHbar,
      releaseAllowed: slot.policySnapshot.releaseAllowed,
      policyVersion: slot.policySnapshot.version,
    },
  };
  const operation = await getOrOpenOperation({
    identity,
    authorization: input.authorization,
    stepNames: CANCEL_STEPS,
    // This preserves the canonical provider-policy/current-holder checks,
    // including cancellation-forbidden Golden mandates, before any new saga is
    // opened. Existing partial operations resume from their durable state.
    preflight: () => bookingPort.previewCancelRelease(preview.input),
  });
  const cached = cachedResult<CancelReleaseSagaResult>(operation);
  if (cached) return cached;

  return withLease(operation, async (leaseToken) => {
    if (!operationHasStarted(operation)) {
      await bookingPort.previewCancelRelease(preview.input);
    }
    const listingStep = operation.steps.cancel_listing_deactivation;
    if (listingStep.state === "running") {
      try {
        await deactivateListing(preview.input.serial);
        await updateSlotListingActive(preview.input.serial, false);
        await markReconciled(
          operation,
          "cancel_listing_deactivation",
          "local_state",
          `listing_inactive:${preview.input.serial}`
        );
      } catch (error) {
        return rememberReconciling(
          operation,
          "cancel_listing_deactivation",
          error
        );
      }
    } else if (
      listingStep.state !== "succeeded" &&
      listingStep.state !== "reconciled"
    ) {
      await markRunning(operation, leaseToken, "cancel_listing_deactivation");
      try {
        const activeListing = await getActiveListingForSerial(preview.input.serial);
        if (activeListing) {
          await deactivateListing(preview.input.serial);
          await updateSlotListingActive(preview.input.serial, false);
        }
        await markSucceeded(
          operation,
          "cancel_listing_deactivation",
          null,
          "local_state",
          `listing_inactive:${preview.input.serial}`
        );
      } catch (error) {
        return rememberReconciling(
          operation,
          "cancel_listing_deactivation",
          error
        );
      }
    }

    const transferStep = operation.steps.cancel_transfer;
    if (transferStep.state === "running") {
      const nft = await getNftBySerial(stored.tokenId, preview.input.serial);
      if (nft?.deleted) {
        return rememberReconciling(
          operation,
          "cancel_transfer",
          new Error("NFT is already deleted but transfer receipt is unknown")
        );
      }
      if (
        nft?.account_id &&
        accountsEqual(nft.account_id, stored.treasuryAccountId)
      ) {
        await markReconciled(
          operation,
          "cancel_transfer",
          "mirror_state",
          `treasury_owner:${stored.treasuryAccountId}`
        );
      } else {
        return rememberReconciling(
          operation,
          "cancel_transfer",
          new Error("Refund/NFT-transfer receipt is still unknown")
        );
      }
    } else if (
      transferStep.state !== "succeeded" &&
      transferStep.state !== "reconciled"
    ) {
      try {
        await bookingPort.previewCancelRelease(preview.input);
      } catch (error) {
        return rememberReconciling(operation, "cancel_transfer", error);
      }
      await markRunning(operation, leaseToken, "cancel_transfer");
      let transferTxId: string;
      try {
        const holderCredentials = getActorCredentials(holderActor);
        transferTxId = await refundAndTransferNftFromHolderToTreasury({
          holderAccountId,
          holderPrivateKey: holderCredentials.privateKey.toString(),
          serial: preview.input.serial,
          tokenIdStr: stored.tokenId,
          refundHbar: slot.primaryPriceHbar,
        });
      } catch (error) {
        return rememberReconciling(operation, "cancel_transfer", error);
      }
      try {
        await markSucceeded(
          operation,
          "cancel_transfer",
          transferTxId,
          "transaction_receipt",
          transferTxId
        );
      } catch (error) {
        return rememberReconciling(operation, "cancel_transfer", error);
      }
    }

    const burnStep = operation.steps.cancel_burn;
    if (burnStep.state === "running") {
      const nft = await getNftBySerial(stored.tokenId, preview.input.serial);
      if (nft?.deleted) {
        await markReconciled(
          operation,
          "cancel_burn",
          "mirror_state",
          `nft_deleted:${preview.input.serial}`
        );
      } else {
        return rememberReconciling(
          operation,
          "cancel_burn",
          new Error("Burn receipt is still unknown")
        );
      }
    } else if (burnStep.state !== "succeeded" && burnStep.state !== "reconciled") {
      await markRunning(operation, leaseToken, "cancel_burn");
      let burnTxId: string;
      try {
        burnTxId = await burnUsedSlot({
          serial: preview.input.serial,
          tokenIdStr: stored.tokenId,
        });
      } catch (error) {
        return rememberReconciling(operation, "cancel_burn", error);
      }
      try {
        await markSucceeded(
          operation,
          "cancel_burn",
          burnTxId,
          "transaction_receipt",
          burnTxId
        );
      } catch (error) {
        return rememberReconciling(operation, "cancel_burn", error);
      }
    }

    const auditStep = operation.steps.cancel_audit;
    if (auditStep.state === "running") {
      if (!(await findAuditEvent(operation, "CANCEL_RELEASED"))) {
        return rememberReconciling(
          operation,
          "cancel_audit",
          new Error("CANCEL_RELEASED audit receipt is still unknown")
        );
      }
      await markReconciled(
        operation,
        "cancel_audit",
        "hcs_event",
        `CANCEL_RELEASED:${operation.operationId}`
      );
    } else if (
      auditStep.state !== "succeeded" &&
      auditStep.state !== "reconciled"
    ) {
      await markRunning(operation, leaseToken, "cancel_audit");
      let auditTxId: string;
      try {
        auditTxId = await submitLifecycleEvent(stored.topicId, {
          eventType: "CANCEL_RELEASED",
          tokenId: stored.tokenId,
          serial: preview.input.serial,
          from: holderAccountId,
          to: stored.treasuryAccountId,
          txId: operation.steps.cancel_transfer.receipt ?? undefined,
          priceHbar: slot.primaryPriceHbar,
          refundHbar: slot.primaryPriceHbar,
          agentProof: {
            agentName: YOURTURN_AGENT_NAME,
            agentVersion: YOURTURN_AGENT_VERSION,
            manifestVersion: YOURTURN_TOOL_MANIFEST_VERSION,
            toolId: "yourturn.recovery.confirm_refund_release",
            approvalId: operation.operationId,
            proofType: "agent_policy_approved_action",
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return rememberReconciling(operation, "cancel_audit", error);
      }
      try {
        await markSucceeded(
          operation,
          "cancel_audit",
          auditTxId,
          "transaction_receipt",
          auditTxId
        );
      } catch (error) {
        return rememberReconciling(operation, "cancel_audit", error);
      }
    }

    const transferReceipt = operation.steps.cancel_transfer.receipt ?? null;
    const burnReceipt = operation.steps.cancel_burn.receipt ?? null;
    const auditReceipt = operation.steps.cancel_audit.receipt ?? null;
    return completeOperation(operation, {
      recoveryOperationId: operation.operationId,
      recoveryStatus: "completed" as const,
      txIds: {
        transferToTreasury: transferReceipt,
        burn: burnReceipt,
        audit: auditReceipt,
      },
      hashscanUrls: {
        transferToTreasury: transferReceipt
          ? getHashscanTxUrl(transferReceipt)
          : null,
        burn: burnReceipt ? getHashscanTxUrl(burnReceipt) : null,
        audit: auditReceipt ? getHashscanTxUrl(auditReceipt) : null,
      },
      refundHbar: slot.primaryPriceHbar,
    });
  });
}
