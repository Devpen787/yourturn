import {
  AccountId,
  Hbar,
  HbarUnit,
  ScheduleCreateTransaction,
  ScheduleId,
  ScheduleInfoQuery,
  Timestamp,
  TransferTransaction,
} from "@hashgraph/sdk";
import type { DemoActor } from "@/lib/hedera/client";
import {
  getActorCredentials,
  getClient,
  getTreasuryAccountId,
} from "@/lib/hedera/client";
import { getHashscanScheduleUrl, getHashscanTxUrl } from "@/lib/hedera/hashscan";
import type { ScheduleAutomationProof } from "@/lib/types/automation";

function optionalString(value: { toString(): string } | string | null | undefined) {
  return value == null ? undefined : value.toString();
}

export async function createScheduledRecoveryPayment(args: {
  payerActor: Exclude<DemoActor, "issuer">;
  amountHbar: number;
  serial: number;
  executeAfterSeconds?: number;
}): Promise<ScheduleAutomationProof> {
  const client = getClient();
  const payer = getActorCredentials(args.payerActor);
  const recipient = getTreasuryAccountId();
  const amount = Hbar.from(args.amountHbar, HbarUnit.Hbar);
  const executeAfter = new Date(
    Date.now() + Math.max(30, args.executeAfterSeconds ?? 90) * 1000
  );
  const memo = `YourTurn scheduled recovery payment #${args.serial}`;
  const transfer = new TransferTransaction()
    .addHbarTransfer(payer.accountId, amount.negated())
    .addHbarTransfer(recipient, amount);

  let schedule = new ScheduleCreateTransaction()
    .setScheduledTransaction(transfer)
    .setPayerAccountId(payer.accountId)
    .setAdminKey(payer.privateKey.publicKey)
    .setScheduleMemo(memo.slice(0, 100))
    .setExpirationTime(Timestamp.fromDate(executeAfter))
    .setWaitForExpiry(true)
    .freezeWith(client);
  schedule = await schedule.sign(payer.privateKey);
  const response = await schedule.execute(client);
  const receipt = await response.getReceipt(client);
  if (!receipt.scheduleId) {
    throw new Error("ScheduleCreateTransaction did not return scheduleId");
  }
  return {
    scheduleId: receipt.scheduleId.toString(),
    scheduledTransactionId: optionalString(receipt.scheduledTransactionId),
    createTxId: response.transactionId.toString(),
    createHashscanUrl: getHashscanTxUrl(response.transactionId.toString()),
    scheduleHashscanUrl: getHashscanScheduleUrl(receipt.scheduleId.toString()),
    memo,
    amountHbar: args.amountHbar,
    payerAccountId: payer.accountId.toString(),
    recipientAccountId: AccountId.fromString(recipient.toString()).toString(),
    executeAfter: executeAfter.toISOString(),
    waitForExpiry: true,
    status: "scheduled",
  };
}

export async function getScheduleExecutionStatus(scheduleId: string): Promise<{
  status: "scheduled" | "executed" | "deleted" | "unknown";
  executedAt?: string;
  memo?: string;
}> {
  const client = getClient();
  const info = await new ScheduleInfoQuery()
    .setScheduleId(ScheduleId.fromString(scheduleId))
    .execute(client);
  if (info.executed) {
    return {
      status: "executed",
      executedAt: info.executed.toDate().toISOString(),
      memo: optionalString(info.scheduleMemo),
    };
  }
  if (info.deleted) {
    return {
      status: "deleted",
      memo: optionalString(info.scheduleMemo),
    };
  }
  return {
    status: "scheduled",
    memo: optionalString(info.scheduleMemo),
  };
}
