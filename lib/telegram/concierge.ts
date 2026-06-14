import { bookingPort } from "@/lib/adapters/booking-port";
import {
  buildRecoveryPaymentAgentTrace,
  buildRefundReleaseAgentTrace,
} from "@/lib/agent/concierge-agent";
import { buildHederaAgentProof } from "@/lib/hedera-agent-kit/agent-proof";
import { getDemoConciergeBudget } from "@/lib/hedera-agent-kit/budget";
import {
  evaluateYourTurnAgentPolicies,
  policyChecksPassed,
} from "@/lib/hedera-agent-kit/policies";
import { getActorCredentials } from "@/lib/hedera/client";
import { createScheduledRecoveryPayment } from "@/lib/hedera/schedule";
import { mintApprovalGrant } from "@/lib/server/approval-grants";
import { upsertAutomationProof } from "@/lib/store/automation-proofs";
import { upsertRecoveryReceipt } from "@/lib/store/recovery-receipts";

type TelegramActor = "guestA" | "guestB";

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id?: number | string };
    text?: string;
    from?: { id?: number | string; username?: string; first_name?: string };
  };
};

export type TelegramCommand =
  | { kind: "show_bookings"; actor: TelegramActor }
  | { kind: "recover_booking"; actor: TelegramActor; serial?: number }
  | { kind: "approve_listing"; actor: TelegramActor; serial?: number }
  | { kind: "approve_refund"; actor: TelegramActor; serial?: number }
  | { kind: "help"; actor: TelegramActor };

export type TelegramHandleOptions = {
  appBaseUrl: string;
  allowMutations?: boolean;
};

export type TelegramHandleResult = {
  chatId: string | null;
  actor: TelegramActor;
  command: TelegramCommand["kind"];
  messages: string[];
  mutated: boolean;
};

function actorFromText(text: string): TelegramActor {
  const lower = text.toLowerCase();
  if (lower.includes("person b") || lower.includes("user b") || lower.includes("guestb")) {
    return "guestB";
  }
  return (process.env.TELEGRAM_DEMO_ACTOR as TelegramActor | undefined) ?? "guestA";
}

function serialFromText(text: string): number | undefined {
  const match = text.match(/(?:ref|serial|booking|pass|#)\s*#?(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

export function parseTelegramCommand(text: string): TelegramCommand {
  const normalized = text.trim().toLowerCase();
  const actor = actorFromText(normalized);
  const serial = serialFromText(normalized);
  if (normalized.includes("approve") && normalized.includes("refund")) {
    return { kind: "approve_refund", actor, serial };
  }
  if (
    normalized.includes("approve") &&
    (normalized.includes("list") ||
      normalized.includes("listing") ||
      normalized.includes("resale") ||
      normalized.includes("recover"))
  ) {
    return { kind: "approve_listing", actor, serial };
  }
  if (
    normalized.includes("can't attend") ||
    normalized.includes("cannot attend") ||
    normalized.includes("recover") ||
    normalized.includes("can't make") ||
    normalized.includes("list for resale")
  ) {
    return { kind: "recover_booking", actor, serial };
  }
  if (normalized.includes("booking") || normalized.includes("pass")) {
    return { kind: "show_bookings", actor };
  }
  return { kind: "help", actor };
}

function personLabel(actor: TelegramActor): string {
  return actor === "guestA" ? "Person A" : "Person B";
}

async function resolveHeldSerial(actor: TelegramActor, explicitSerial?: number): Promise<number | null> {
  if (explicitSerial) return explicitSerial;
  const holdings = await bookingPort.listHoldings({ kind: "demoActor", id: actor });
  const held = holdings.find((slot) => slot.status === "HELD");
  return held?.serial ?? null;
}

async function showBookings(actor: TelegramActor, appBaseUrl: string): Promise<string[]> {
  const holdings = await bookingPort.listHoldings({ kind: "demoActor", id: actor });
  if (holdings.length === 0) {
    return [`${personLabel(actor)} has no active passes right now.`];
  }
  return [
    `${personLabel(actor)} active passes:`,
    ...holdings.map(
      (slot) =>
        `Ref #${slot.serial}: ${slot.title} · ${slot.status} · ${appBaseUrl}/slots/${slot.serial}`
    ),
  ];
}

async function recoverBooking(
  actor: TelegramActor,
  appBaseUrl: string,
  explicitSerial?: number
): Promise<string[]> {
  const serial = await resolveHeldSerial(actor, explicitSerial);
  if (!serial) {
    return [`I could not find a held pass for ${personLabel(actor)}.`];
  }
  const slot = await bookingPort.getSlot(serial);
  if (!slot) return [`Ref #${serial} is not in the current demo schedule.`];
  const activeListing = await bookingPort.getListing(serial);
  if (activeListing?.active) {
    return [
      `Ref #${serial} is already listed for resale.`,
      `Ask: ${activeListing.askPriceHbar.toFixed(2)} HBAR.`,
      `Open listing: ${appBaseUrl}/resale/${serial}`,
    ];
  }
  try {
    const preview = await bookingPort.previewCreateListing({
      seller: { kind: "demoActor", id: actor },
      serial,
      askPriceHbar: slot.primaryPriceHbar,
    });
    return [
      `Recovery preview for ${personLabel(actor)}.`,
      `Ref #${serial}: ${slot.title}`,
      `Ask: ${preview.details.askPriceHbar.toFixed(2)} HBAR.`,
      `Owner royalty: ${preview.details.royaltyHbar.toFixed(2)} HBAR.`,
      `Seller net: ${preview.details.sellerNetHbar.toFixed(2)} HBAR.`,
      `Open Concierge: ${appBaseUrl}/resale/${serial}?mode=recovery`,
      `To approve listing from Telegram, send: approve listing ref ${serial}`,
      `For release/refund instead, send: approve refund ref ${serial}`,
    ];
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [
      `Recovery is blocked for Ref #${serial}.`,
      reason,
      `Open Concierge: ${appBaseUrl}/resale/${serial}?mode=recovery`,
    ];
  }
}

async function approveListing(
  actor: TelegramActor,
  appBaseUrl: string,
  explicitSerial: number | undefined,
  allowMutations: boolean
): Promise<{ messages: string[]; mutated: boolean }> {
  const serial = await resolveHeldSerial(actor, explicitSerial);
  if (!serial) {
    return {
      mutated: false,
      messages: [`I could not find a held pass for ${personLabel(actor)}.`],
    };
  }
  if (!allowMutations) {
    return {
      mutated: false,
      messages: [
        `Telegram listing approval is dry-run safe right now.`,
        `Open the approval surface: ${appBaseUrl}/resale/${serial}?mode=recovery`,
        `Enable TELEGRAM_ALLOW_MUTATIONS=true with an allowlisted chat to execute from Telegram.`,
      ],
    };
  }
  const slot = await bookingPort.getSlot(serial);
  if (!slot) {
    return { mutated: false, messages: [`Ref #${serial} is not in the current demo schedule.`] };
  }
  const activeListing = await bookingPort.getListing(serial);
  if (activeListing?.active) {
    return {
      mutated: false,
      messages: [
        `Ref #${serial} is already listed.`,
        `Ask: ${activeListing.askPriceHbar.toFixed(2)} HBAR.`,
        `Open listing: ${appBaseUrl}/resale/${serial}`,
      ],
    };
  }
  const actorAccountId = getActorCredentials(actor).accountId.toString();
  const askPriceHbar = slot.primaryPriceHbar;
  const preview = await bookingPort.previewCreateListing({
    seller: { kind: "demoActor", id: actor },
    serial,
    askPriceHbar,
  });
  const grant = mintApprovalGrant({
    action: "create_listing",
    actor: { kind: "demoActor", id: actor },
    serial,
    approvedBy: `telegram:${actor}`,
    source: "agent_handoff",
    ttlSeconds: 10 * 60,
  });
  const createdAt = new Date().toISOString();
  const scheduledRecoveryPaymentHbar = 0.01;
  const budget = getDemoConciergeBudget(actor);
  const preflightPolicyChecks = evaluateYourTurnAgentPolicies({
    toolId: "yourturn.recovery.confirm_listing",
    slot,
    actorAccountId,
    askPriceHbar,
    approvalId: grant.claims.grantId,
    scheduleSerial: serial,
    budget,
    budgetAmountHbar: scheduledRecoveryPaymentHbar,
  });
  if (!policyChecksPassed(preflightPolicyChecks)) {
    return {
      mutated: false,
      messages: [
        `Telegram approval was blocked by recovery policy.`,
        ...preflightPolicyChecks
          .filter((check) => check.status === "blocked")
          .map((check) => `${check.label}: ${check.detail}`),
        `Open Concierge: ${appBaseUrl}/resale/${serial}?mode=recovery`,
      ],
    };
  }
  const result = await bookingPort.confirmCreateListing({
    previewId: preview.previewId,
    approval: {
      approvedBy: grant.claims.approvedBy,
      approvedAt: grant.claims.approvedAt,
      source: grant.claims.source,
      approvalId: grant.claims.grantId,
    },
  });
  const scheduleProof = await createScheduledRecoveryPayment({
    payerActor: actor,
    amountHbar: scheduledRecoveryPaymentHbar,
    serial,
    executeAfterSeconds: 90,
  });
  const policyChecks = evaluateYourTurnAgentPolicies({
    toolId: "yourturn.recovery.confirm_listing",
    slot,
    actorAccountId,
    askPriceHbar: result.listing.askPriceHbar,
    approvalId: grant.claims.grantId,
    scheduleSerial: serial,
    budget,
    budgetAmountHbar: scheduledRecoveryPaymentHbar,
  });
  const agentTrace = buildRecoveryPaymentAgentTrace({
    serial,
    intent:
      "Telegram Concierge approval to recover value by listing and scheduling recovery settlement proof.",
    actorLabel: personLabel(actor),
    approvalId: grant.claims.grantId,
    policySnapshot: slot.policySnapshot,
    amountHbar: scheduleProof.amountHbar,
    scheduleId: scheduleProof.scheduleId,
  });
  const agentProof = buildHederaAgentProof({
    toolId: "yourturn.recovery.confirm_listing",
    approvalId: grant.claims.grantId,
    policyChecks,
    createdAt,
    proofOutputs: {
      serial,
      budgetId: budget.budgetId,
      budgetRemainingHbar: budget.remainingHbar,
      budgetSource: budget.source,
      askPriceHbar: result.listing.askPriceHbar,
      royaltyHbar: result.listing.royaltyHbar,
      sellerNetHbar: result.listing.sellerNetHbar,
      auditTxId: result.auditTxId,
      scheduleId: scheduleProof.scheduleId,
      scheduledTransactionId: scheduleProof.scheduledTransactionId,
      createTxId: scheduleProof.createTxId,
      scheduleHashscanUrl: scheduleProof.scheduleHashscanUrl,
    },
  });
  await upsertAutomationProof({
    serial,
    actor,
    scheduleProof,
    agentTrace,
    agentProof,
    createdAt,
  });
  const receipt = {
    title: "Telegram recovery listing created",
    statusLabel: "Listed",
    actionLabel: "Telegram Concierge recovery listing",
    actorLabel: personLabel(actor),
    currentState: "Telegram Concierge listed this pass for another customer to take over.",
    receiptId: grant.claims.grantId,
    action: "create_listing" as const,
    actor,
    actorAccountId,
    serial,
    askPriceHbar: result.listing.askPriceHbar,
    royaltyHbar: result.listing.royaltyHbar,
    sellerNetHbar: result.listing.sellerNetHbar,
    approvalId: grant.claims.grantId,
    approvalGrantId: grant.claims.grantId,
    auditTxId: result.auditTxId,
    hashscanUrl: result.hashscanUrl,
    createdAt,
    occurredAt: createdAt,
    policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
    policySnapshot: slot.policySnapshot,
    scheduleProof,
    agentTrace,
    agentProof,
  };
  await upsertRecoveryReceipt(receipt, "telegram_recovery_listing");
  return {
    mutated: true,
    messages: [
      `Approved and listed Ref #${serial} from Telegram.`,
      `Ask: ${result.listing.askPriceHbar.toFixed(2)} HBAR.`,
      `Seller net: ${result.listing.sellerNetHbar.toFixed(2)} HBAR after owner royalty.`,
      `Schedule proof: ${scheduleProof.scheduleId}`,
      `Listing proof: ${result.hashscanUrl}`,
      `Receipt: ${appBaseUrl}/resale/${serial}?mode=recovery`,
    ],
  };
}

async function approveRefund(
  actor: TelegramActor,
  appBaseUrl: string,
  explicitSerial: number | undefined,
  allowMutations: boolean
): Promise<{ messages: string[]; mutated: boolean }> {
  const serial = await resolveHeldSerial(actor, explicitSerial);
  if (!serial) {
    return {
      mutated: false,
      messages: [`I could not find a held pass for ${personLabel(actor)}.`],
    };
  }
  if (!allowMutations) {
    return {
      mutated: false,
      messages: [
        `Telegram approval is fixture-tested but mutation-gated.`,
        `Open the approval surface: ${appBaseUrl}/resale/${serial}?mode=recovery`,
      ],
    };
  }
  const slot = await bookingPort.getSlot(serial);
  if (!slot) {
    return { mutated: false, messages: [`Ref #${serial} is not in the current demo schedule.`] };
  }
  const preview = await bookingPort.previewCancelRelease({
    holder: { kind: "demoActor", id: actor },
    serial,
  });
  const grant = mintApprovalGrant({
    action: "cancel_release",
    actor: { kind: "demoActor", id: actor },
    serial,
    approvedBy: `telegram:${actor}`,
    source: "agent_handoff",
    ttlSeconds: 10 * 60,
  });
  const result = await bookingPort.confirmCancelRelease({
    previewId: preview.previewId,
    approval: {
      approvedBy: grant.claims.approvedBy,
      approvedAt: grant.claims.approvedAt,
      source: grant.claims.source,
      approvalId: grant.claims.grantId,
    },
  });
  const actorAccountId = getActorCredentials(actor).accountId.toString();
  const releaseHashscanUrl = result.hashscanUrls.transferToTreasury ?? undefined;
  const createdAt = new Date().toISOString();
  const policyChecks = evaluateYourTurnAgentPolicies({
    toolId: "yourturn.recovery.confirm_refund_release",
    slot,
    actorAccountId,
    refundHbar: result.refundHbar,
    approvalId: grant.claims.grantId,
  });
  const agentProof = buildHederaAgentProof({
    toolId: "yourturn.recovery.confirm_refund_release",
    approvalId: grant.claims.grantId,
    policyChecks,
    createdAt,
    proofOutputs: {
      serial,
      refundHbar: result.refundHbar,
      releaseTxId: result.txIds.transferToTreasury,
      burnTxId: result.txIds.burn,
      auditTxId: result.txIds.audit,
      releaseHashscanUrl,
      burnHashscanUrl: result.hashscanUrls.burn,
    },
  });
  const trace = buildRefundReleaseAgentTrace({
    serial,
    intent: "Telegram Concierge approval to release booking and return value.",
    actorLabel: personLabel(actor),
    approvalId: grant.claims.grantId,
    policySnapshot: slot.policySnapshot,
    refundHbar: result.refundHbar,
    refundTxId: result.txIds.transferToTreasury ?? result.txIds.audit,
  });
  const receipt = {
    title: "Telegram refund release completed",
    statusLabel: "Refunded",
    actionLabel: "Telegram release + test HBAR refund",
    actorLabel: personLabel(actor),
    currentState:
      "Telegram Concierge approved a scoped release. The booking right was closed and a real testnet HBAR refund was sent.",
    receiptId: grant.claims.grantId,
    action: "cancel_release_refund" as const,
    actor,
    actorAccountId,
    serial,
    refundHbar: result.refundHbar,
    approvalId: grant.claims.grantId,
    approvalGrantId: grant.claims.grantId,
    txId: result.txIds.transferToTreasury ?? undefined,
    releaseTxId: result.txIds.transferToTreasury ?? undefined,
    burnTxId: result.txIds.burn,
    auditTxId: result.txIds.audit,
    hashscanUrl: releaseHashscanUrl,
    releaseHashscanUrl,
    burnHashscanUrl: result.hashscanUrls.burn,
    createdAt,
    occurredAt: createdAt,
    policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
    policySnapshot: slot.policySnapshot,
    agentTrace: trace,
    agentProof,
  };
  await upsertRecoveryReceipt(receipt, "telegram_cancel_release_refund");
  return {
    mutated: true,
    messages: [
      `Approved and completed refund release for Ref #${serial}.`,
      `Refund: ${result.refundHbar.toFixed(2)} HBAR testnet.`,
      `Proof: ${releaseHashscanUrl ?? result.hashscanUrls.audit}`,
      `Receipt: ${appBaseUrl}/resale/${serial}?mode=recovery`,
    ],
  };
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  options: TelegramHandleOptions
): Promise<TelegramHandleResult> {
  const text = update.message?.text ?? "";
  const chatId = update.message?.chat?.id != null ? String(update.message.chat.id) : null;
  const command = parseTelegramCommand(text);
  if (command.kind === "show_bookings") {
    return {
      chatId,
      actor: command.actor,
      command: command.kind,
      messages: await showBookings(command.actor, options.appBaseUrl),
      mutated: false,
    };
  }
  if (command.kind === "recover_booking") {
    return {
      chatId,
      actor: command.actor,
      command: command.kind,
      messages: await recoverBooking(command.actor, options.appBaseUrl, command.serial),
      mutated: false,
    };
  }
  if (command.kind === "approve_listing") {
    const approval = await approveListing(
      command.actor,
      options.appBaseUrl,
      command.serial,
      !!options.allowMutations
    );
    return {
      chatId,
      actor: command.actor,
      command: command.kind,
      messages: approval.messages,
      mutated: approval.mutated,
    };
  }
  if (command.kind === "approve_refund") {
    const approval = await approveRefund(
      command.actor,
      options.appBaseUrl,
      command.serial,
      !!options.allowMutations
    );
    return {
      chatId,
      actor: command.actor,
      command: command.kind,
      messages: approval.messages,
      mutated: approval.mutated,
    };
  }
  return {
    chatId,
    actor: command.actor,
    command: command.kind,
    messages: [
      "YourTurn Concierge commands:",
      "show my bookings",
      "I can't attend",
      "recover booking ref 123",
      "approve listing ref 123",
      "approve refund ref 123",
    ],
    mutated: false,
  };
}
