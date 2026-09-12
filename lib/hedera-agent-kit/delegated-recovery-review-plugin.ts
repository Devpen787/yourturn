import { BaseTool, type Context, type Plugin } from "@hashgraph/hedera-agent-kit";
import { z } from "zod";
import { yourTurnDelegatedRecoveryPlugin } from "./delegated-recovery-plugin.ts";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

export const YOURTURN_DELEGATED_RECOVERY_INSPECT_TOOL =
  "yourturn_delegated_recovery_inspect_booking";
export const YOURTURN_DELEGATED_RECOVERY_VERIFY_TOOL =
  "yourturn_delegated_recovery_verify_settlement";

const inspectParameters = z
  .object({
    tokenId: z.string().regex(/^0\.0\.\d+$/),
    serial: z.number().int().positive(),
  })
  .strict();

const verifyParameters = z
  .object({
    transactionId: z.string().regex(/^0\.0\.\d+@\d+\.\d+$/),
    bookingTokenId: z.string().regex(/^0\.0\.\d+$/),
    bookingSerial: z.number().int().positive(),
    expectedSenderAccountId: z.string().regex(/^0\.0\.\d+$/),
    expectedReceiverAccountId: z.string().regex(/^0\.0\.\d+$/),
    settlementTokenId: z.string().regex(/^0\.0\.\d+$/),
    settlementPayerAccountId: z.string().regex(/^0\.0\.\d+$/),
    settlementRecipientAccountId: z.string().regex(/^0\.0\.\d+$/),
    settlementAmountAtomicUnits: z.string().regex(/^[1-9][0-9]*$/),
  })
  .strict();

type InspectParams = z.infer<typeof inspectParameters>;
type VerifyParams = z.infer<typeof verifyParameters>;

function mirrorTransactionId(value: string): string {
  const match = /^(0\.0\.\d+)@(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`invalid_hedera_transaction_id:${value}`);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

async function mirrorJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`mirror_http_${response.status}:${url}`);
  return response.json();
}

class InspectDelegatedBookingTool extends BaseTool<unknown, InspectParams> {
  method = YOURTURN_DELEGATED_RECOVERY_INSPECT_TOOL;
  name = "Inspect a booking-right NFT";
  description =
    "Read the public Hedera Mirror state for one exact booking-right token serial. This tool is read-only and never signs or submits a transaction.";
  parameters: any = inspectParameters;

  async normalizeParams(params: unknown): Promise<InspectParams> {
    return inspectParameters.parse(params);
  }

  async coreAction(params: InspectParams) {
    const mirror = `${MIRROR}/tokens/${params.tokenId}/nfts/${params.serial}`;
    const nft = await mirrorJson(mirror);
    if (!nft?.account_id) throw new Error("delegated_recovery_nft_owner_missing");

    const evidence = {
      network: "testnet",
      tokenId: params.tokenId,
      serial: params.serial,
      ownerAccountId: nft.account_id,
      spenderAccountId: nft.spender ?? null,
      delegatingSpenderAccountId: nft.delegating_spender ?? null,
      mirror,
      readOnly: true,
      signed: false,
      submitted: false,
    };

    return {
      raw: evidence,
      humanMessage: `Booking ${params.tokenId} serial ${params.serial} is currently owned by ${nft.account_id}.`,
    };
  }

  async shouldSecondaryAction() {
    return false;
  }
}

class VerifyDelegatedRecoverySettlementTool extends BaseTool<unknown, VerifyParams> {
  method = YOURTURN_DELEGATED_RECOVERY_VERIFY_TOOL;
  name = "Verify a delegated recovery settlement";
  description =
    "Read one public Hedera transaction and fail closed unless it contains exactly the expected single booking NFT movement and exact two-leg fungible settlement.";
  parameters: any = verifyParameters;

  async normalizeParams(params: unknown): Promise<VerifyParams> {
    return verifyParameters.parse(params);
  }

  async coreAction(params: VerifyParams) {
    const mirrorId = mirrorTransactionId(params.transactionId);
    const mirror = `${MIRROR}/transactions/${mirrorId}`;
    const body = await mirrorJson(mirror);
    const transaction =
      (body.transactions ?? []).find((item: any) => item.transaction_id === mirrorId) ??
      body.transactions?.[0];
    if (!transaction) throw new Error("delegated_recovery_transaction_missing");
    if (transaction.result !== "SUCCESS") {
      throw new Error(`delegated_recovery_transaction_not_success:${transaction.result}`);
    }

    const nftTransfers = transaction.nft_transfers ?? [];
    if (nftTransfers.length !== 1) {
      throw new Error(`delegated_recovery_nft_transfer_count:${nftTransfers.length}`);
    }
    const nft = nftTransfers[0];
    if (
      nft.token_id !== params.bookingTokenId ||
      Number(nft.serial_number) !== params.bookingSerial ||
      nft.sender_account_id !== params.expectedSenderAccountId ||
      nft.receiver_account_id !== params.expectedReceiverAccountId ||
      nft.is_approval !== true
    ) {
      throw new Error("delegated_recovery_nft_semantics_mismatch");
    }

    const tokenTransfers = transaction.token_transfers ?? [];
    if (tokenTransfers.length !== 2) {
      throw new Error(`delegated_recovery_token_transfer_count:${tokenTransfers.length}`);
    }
    if (tokenTransfers.some((item: any) => item.token_id !== params.settlementTokenId)) {
      throw new Error("delegated_recovery_unexpected_settlement_token");
    }

    const transferAccount = (item: any) => item.account ?? item.account_id;
    const amount = BigInt(params.settlementAmountAtomicUnits);
    const payerLeg = tokenTransfers.find(
      (item: any) => transferAccount(item) === params.settlementPayerAccountId
    );
    const recipientLeg = tokenTransfers.find(
      (item: any) => transferAccount(item) === params.settlementRecipientAccountId
    );
    if (!payerLeg || BigInt(payerLeg.amount) !== -amount) {
      throw new Error("delegated_recovery_settlement_payer_mismatch");
    }
    if (!recipientLeg || BigInt(recipientLeg.amount) !== amount) {
      throw new Error("delegated_recovery_settlement_recipient_mismatch");
    }

    const evidence = {
      network: "testnet",
      transactionId: params.transactionId,
      result: transaction.result,
      mirror,
      hashscan: `https://hashscan.io/#/testnet/transaction/${mirrorId}`,
      exactlyOneBookingNftTransfer: true,
      exactlyTwoSettlementTokenEntries: true,
      bookingNftTransfer: nft,
      settlementTokenTransfers: tokenTransfers,
      readOnly: true,
      signed: false,
      submitted: false,
    };

    return {
      raw: evidence,
      humanMessage: `Verified ${params.transactionId}: one approved booking-right transfer and the exact fungible settlement are present in the same successful Hedera transaction.`,
    };
  }

  async shouldSecondaryAction() {
    return false;
  }
}

/**
 * Additive reviewer-facing plugin surface.
 *
 * The proven write tools are reused verbatim from yourTurnDelegatedRecoveryPlugin;
 * these two tools only inspect public Mirror state. No existing execution path is
 * replaced or widened.
 */
export const yourTurnDelegatedRecoveryReviewerPlugin: Plugin = {
  name: "yourturn-delegated-recovery-reviewer-plugin",
  version: "2026.09.12",
  description:
    "Read-only Hedera reviewer tools for exact booking ownership and transaction-boundary recovery verification.",
  tools: () => [new InspectDelegatedBookingTool(), new VerifyDelegatedRecoverySettlementTool()],
};

export const yourTurnDelegatedRecoveryCompletePlugin: Plugin = {
  name: "yourturn-delegated-recovery-complete-plugin",
  version: "2026.09.12",
  description:
    "YourTurn delegated-recovery HAK surface: existing non-custodial serial authority/settlement tools plus read-only public-proof tools.",
  tools: (context: Context) => [
    ...yourTurnDelegatedRecoveryPlugin.tools(context),
    ...yourTurnDelegatedRecoveryReviewerPlugin.tools(context),
  ],
};

export const YOURTURN_DELEGATED_RECOVERY_REVIEW_TOOL_METHODS = [
  YOURTURN_DELEGATED_RECOVERY_INSPECT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_VERIFY_TOOL,
] as const;
