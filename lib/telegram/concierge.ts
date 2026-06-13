import { bookingPort } from "@/lib/adapters/booking-port";
import { buildRefundReleaseAgentTrace } from "@/lib/agent/concierge-agent";
import { getActorCredentials } from "@/lib/hedera/client";
import { mintApprovalGrant } from "@/lib/server/approval-grants";
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

export function parseTelegramCommand(text: string): TelegramCommand {
  const normalized = text.trim().toLowerCase();
  const actor = actorFromText(normalized);
  const serialMatch = normalized.match(/(?:ref|serial|#)\s*(\d+)/i);
  const serial = serialMatch ? Number(serialMatch[1]) : undefined;
  if (normalized.includes("approve") && normalized.includes("refund")) {
    return { kind: "approve_refund", actor, serial };
  }
  if (
    normalized.includes("can't attend") ||
    normalized.includes("cannot attend") ||
    normalized.includes("recover") ||
    normalized.includes("can't make")
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
  return [
    `Recovery ready for ${personLabel(actor)}.`,
    `Ref #${serial}: ${slot.title}`,
    `Open Concierge: ${appBaseUrl}/resale/${serial}?mode=recovery`,
    `To approve a real testnet refund from Telegram, send: approve refund ref ${serial}`,
  ];
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
    },
  });
  const actorAccountId = getActorCredentials(actor).accountId.toString();
  const releaseHashscanUrl = result.hashscanUrls.transferToTreasury ?? undefined;
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
    createdAt: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
    policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
    policySnapshot: slot.policySnapshot,
    agentTrace: trace,
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
      "approve refund ref 123",
    ],
    mutated: false,
  };
}
