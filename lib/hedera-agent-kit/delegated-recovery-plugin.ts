import {
  AgentMode,
  BaseTool,
  HederaAgentAPI,
  ToolDiscovery,
  handleTransaction,
  type Context,
  type Plugin,
  type RawTransactionResponse,
} from "@hashgraph/hedera-agent-kit";
import { AccountId, Client, Transaction } from "@hiero-ledger/sdk";
import { z } from "zod";
import {
  buildApprovedSerialTransfer,
  buildSerialScopedNftAllowance,
  buildSerialScopedNftRevocation,
  type SerialScopedNftAuthority,
} from "../hedera/delegated-nft-authority.ts";

export const YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL =
  "yourturn_delegated_recovery_approve_nft_serial";
export const YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL =
  "yourturn_delegated_recovery_revoke_nft_serial";
export const YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL =
  "yourturn_delegated_recovery_transfer_nft_serial";

const authorityParameters = z
  .object({
    tokenId: z.string().min(1),
    serial: z.number().int().positive(),
    ownerAccountId: z.string().min(1),
    spenderAccountId: z.string().min(1),
  })
  .strict();

const transferParameters = authorityParameters
  .extend({
    receiverAccountId: z.string().min(1),
  })
  .strict();

type AuthorityParams = z.infer<typeof authorityParameters>;
type TransferParams = z.infer<typeof transferParameters>;

function canonicalAccountId(value: string): string {
  return AccountId.fromString(value).toString();
}

function requireContextPayer(context: Context, expectedAccountId: string): void {
  if (!context.accountId) {
    throw new Error("delegated_recovery_missing_context_account");
  }
  if (canonicalAccountId(context.accountId) !== canonicalAccountId(expectedAccountId)) {
    throw new Error("delegated_recovery_payer_mismatch");
  }
}

function approvalPostProcess(response: RawTransactionResponse): string {
  return `Serial-scoped NFT allowance approved. Transaction ID: ${response.transactionId}`;
}

function revocationPostProcess(response: RawTransactionResponse): string {
  return `Serial-scoped NFT allowance revoked. Transaction ID: ${response.transactionId}`;
}

function transferPostProcess(response: RawTransactionResponse): string {
  return `Delegated serial transfer completed. Transaction ID: ${response.transactionId}`;
}

/**
 * HAK v4.0.0 transaction-style tool for one BOOKED NFT serial only.
 *
 * The repo is intentionally locked to HAK 4.0.0, where BaseTransactionTool is
 * not yet exported. BaseTool already provides the seven-stage hook/policy
 * lifecycle; secondaryAction delegates to HAK handleTransaction so
 * AgentMode.RETURN_BYTES freezes and serializes without signing or submitting.
 */
class ApproveDelegatedSerialTool extends BaseTool<unknown, AuthorityParams> {
  method = YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL;
  name = "Prepare serial-scoped delegated recovery allowance";
  description =
    "Prepare an HTS NFT allowance for exactly one booking-right serial. Collection-wide/all-serial authority is not accepted.";
  parameters: any = authorityParameters;

  async normalizeParams(params: unknown, context: Context): Promise<AuthorityParams> {
    const parsed = authorityParameters.parse(params);
    requireContextPayer(context, parsed.ownerAccountId);
    return parsed;
  }

  async coreAction(params: AuthorityParams) {
    return buildSerialScopedNftAllowance(params);
  }

  async secondaryAction(transaction: any, client: Client, context: Context) {
    return handleTransaction(transaction, client, context, approvalPostProcess);
  }
}

class RevokeDelegatedSerialTool extends BaseTool<unknown, AuthorityParams> {
  method = YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL;
  name = "Prepare serial-scoped delegated recovery revocation";
  description =
    "Prepare removal of delegated authority for exactly one booking-right NFT serial.";
  parameters: any = authorityParameters;

  async normalizeParams(params: unknown, context: Context): Promise<AuthorityParams> {
    const parsed = authorityParameters.parse(params);
    requireContextPayer(context, parsed.ownerAccountId);
    return parsed;
  }

  async coreAction(params: AuthorityParams) {
    return buildSerialScopedNftRevocation(params);
  }

  async secondaryAction(transaction: any, client: Client, context: Context) {
    return handleTransaction(transaction, client, context, revocationPostProcess);
  }
}

class TransferDelegatedSerialTool extends BaseTool<unknown, TransferParams> {
  method = YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL;
  name = "Prepare delegated booking-right serial transfer";
  description =
    "Prepare an approved-spender HTS NFT transfer for exactly one delegated booking-right serial.";
  parameters: any = transferParameters;

  async normalizeParams(params: unknown, context: Context): Promise<TransferParams> {
    const parsed = transferParameters.parse(params);
    requireContextPayer(context, parsed.spenderAccountId);
    return parsed;
  }

  async coreAction(params: TransferParams) {
    const { receiverAccountId, ...authority } = params;
    return buildApprovedSerialTransfer({ authority, receiverAccountId });
  }

  async secondaryAction(transaction: any, client: Client, context: Context) {
    return handleTransaction(transaction, client, context, transferPostProcess);
  }
}

export const yourTurnDelegatedRecoveryPlugin: Plugin = {
  name: "yourturn-delegated-recovery-plugin",
  version: "2026.09.10",
  description:
    "ETHOnline-only HAK surface for serial-scoped delegated booking-right authority and non-custodial transaction preparation.",
  tools: () => [
    new ApproveDelegatedSerialTool(),
    new RevokeDelegatedSerialTool(),
    new TransferDelegatedSerialTool(),
  ],
};

export const YOURTURN_DELEGATED_RECOVERY_TOOL_METHODS = [
  YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
] as const;

export type DelegatedRecoveryToolMethod =
  (typeof YOURTURN_DELEGATED_RECOVERY_TOOL_METHODS)[number];

/**
 * Dedicated non-custodial HAK runtime. It never reads or installs a private key.
 * The context account is the external payer/signer whose wallet receives bytes.
 */
export function createDelegatedRecoveryReturnBytesRuntime(accountId: string) {
  const payerAccountId = canonicalAccountId(accountId);
  const client = Client.forTestnet();
  const context: Context = {
    mode: AgentMode.RETURN_BYTES,
    accountId: payerAccountId,
  };
  const discovery = new ToolDiscovery([yourTurnDelegatedRecoveryPlugin]);
  const tools = discovery.getAllTools(context, {
    tools: [...YOURTURN_DELEGATED_RECOVERY_TOOL_METHODS],
  });
  const api = new HederaAgentAPI(client, context, tools);
  return { api, client, context, tools };
}

export type DelegatedRecoverySigningEnvelope = {
  bytesBase64: string;
  transactionId: string;
  payerAccountId: string;
  transactionType: string;
  mode: "RETURN_BYTES";
  signed: false;
  submitted: false;
};

async function prepareReturnBytes(
  payerAccountId: string,
  method: DelegatedRecoveryToolMethod,
  params: AuthorityParams | TransferParams
): Promise<DelegatedRecoverySigningEnvelope> {
  const runtime = createDelegatedRecoveryReturnBytesRuntime(payerAccountId);
  try {
    const tool = runtime.tools.find((candidate) => candidate.method === method);
    if (!tool) throw new Error(`delegated_recovery_tool_missing:${method}`);

    const result = (await tool.execute(
      runtime.client,
      runtime.context,
      params
    )) as { bytes?: Uint8Array; raw?: { error?: string } };

    if (!(result.bytes instanceof Uint8Array)) {
      throw new Error(
        result.raw?.error ?? `delegated_recovery_return_bytes_failed:${method}`
      );
    }

    const transaction = Transaction.fromBytes(result.bytes);
    const transactionId = transaction.transactionId?.toString();
    const actualPayer = transaction.transactionId?.accountId?.toString();
    const expectedPayer = canonicalAccountId(payerAccountId);
    if (!transactionId || actualPayer !== expectedPayer) {
      throw new Error("delegated_recovery_return_bytes_payer_mismatch");
    }

    return {
      bytesBase64: Buffer.from(result.bytes).toString("base64"),
      transactionId,
      payerAccountId: expectedPayer,
      transactionType: transaction.constructor.name,
      mode: "RETURN_BYTES",
      signed: false,
      submitted: false,
    };
  } finally {
    runtime.client.close();
  }
}

export function prepareSerialAllowanceForOwner(
  authority: SerialScopedNftAuthority
): Promise<DelegatedRecoverySigningEnvelope> {
  return prepareReturnBytes(
    authority.ownerAccountId,
    YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
    authority
  );
}

export function prepareSerialRevocationForOwner(
  authority: SerialScopedNftAuthority
): Promise<DelegatedRecoverySigningEnvelope> {
  return prepareReturnBytes(
    authority.ownerAccountId,
    YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL,
    authority
  );
}

export function prepareApprovedSerialTransferForSpender(args: {
  authority: SerialScopedNftAuthority;
  receiverAccountId: string;
}): Promise<DelegatedRecoverySigningEnvelope> {
  return prepareReturnBytes(
    args.authority.spenderAccountId,
    YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
    { ...args.authority, receiverAccountId: args.receiverAccountId }
  );
}
