import {
  BaseTool,
  untypedQueryOutputParser,
  type Plugin,
} from "@hashgraph/hedera-agent-kit";
import { z } from "zod";

const DEFAULT_MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";
const DEFAULT_STATUS = "https://status.hedera.com/api/v2/status.json";
const accountIdSchema = z.string().regex(/^0\.0\.\d+$/);
const tokenIdSchema = z.string().regex(/^0\.0\.\d+$/);

export const YOURTURN_STUDIO_INVENTORY_TOOL = "yourturn_studio_inventory_tool";
export const YOURTURN_STUDIO_BOOKING_HOLDER_TOOL = "yourturn_studio_booking_holder_tool";
export const YOURTURN_STUDIO_RECEIVE_READINESS_TOOL = "yourturn_studio_receive_readiness_tool";
export const YOURTURN_STUDIO_POLICY_TOOL = "yourturn_studio_policy_tool";
export const YOURTURN_STUDIO_RESALE_RECEIPT_TOOL = "yourturn_studio_resale_receipt_tool";
export const YOURTURN_STUDIO_NETWORK_HEALTH_TOOL = "yourturn_studio_network_health_tool";

export const YOURTURN_STUDIO_OPS_TOOL_METHODS = [
  YOURTURN_STUDIO_INVENTORY_TOOL,
  YOURTURN_STUDIO_BOOKING_HOLDER_TOOL,
  YOURTURN_STUDIO_RECEIVE_READINESS_TOOL,
  YOURTURN_STUDIO_POLICY_TOOL,
  YOURTURN_STUDIO_RESALE_RECEIPT_TOOL,
  YOURTURN_STUDIO_NETWORK_HEALTH_TOOL,
] as const;

type FetchJson = (url: string) => Promise<any>;

export type StudioOpsPolicy = {
  providerId: string;
  version: string;
  active: boolean;
  bookingTokenId: string;
  settlementTokenId: string;
  transferMode: "default_frozen_hip551";
  [key: string]: unknown;
};

export type StudioOpsSources = {
  mirrorBaseUrl?: string;
  statusUrl?: string;
  fetchJson?: FetchJson;
  loadProviderPolicy?: (providerId: string, version?: string) => Promise<StudioOpsPolicy | null>;
  nowMs?: () => number;
};

async function defaultFetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`studio_ops_http_${response.status}:${url}`);
  return response.json();
}

function mirrorTransactionId(value: string): string {
  const match = /^(0\.0\.\d+)@(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error("studio_ops_invalid_transaction_id");
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function tokenRelationship(body: any, tokenId: string): any | null {
  const matches = (body?.tokens ?? []).filter((item: any) => item?.token_id === tokenId);
  if (matches.length > 1) throw new Error(`studio_ops_ambiguous_token_relationship:${tokenId}`);
  return matches[0] ?? null;
}

function kycOkay(value: unknown): boolean {
  return value === "GRANTED" || value === "NOT_APPLICABLE";
}

function parseConsensusTimestampMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d+)\.(\d{1,9})$/.exec(value);
  if (!match) return null;
  const seconds = Number(match[1]);
  const nanos = Number(match[2].padEnd(9, "0"));
  if (!Number.isSafeInteger(seconds) || !Number.isFinite(nanos)) return null;
  return seconds * 1000 + nanos / 1_000_000;
}

const inventoryParameters = z
  .object({
    providerAccountId: accountIdSchema,
    bookingTokenId: tokenIdSchema,
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();

type InventoryParams = z.infer<typeof inventoryParameters>;

const holderParameters = z
  .object({
    bookingTokenId: tokenIdSchema,
    serial: z.number().int().positive(),
    expectedHolderAccountId: accountIdSchema.optional(),
  })
  .strict();

type HolderParams = z.infer<typeof holderParameters>;

const readinessParameters = z
  .object({
    receiverAccountId: accountIdSchema,
    connectedAccountId: accountIdSchema,
    bookingTokenId: tokenIdSchema,
    settlementTokenId: tokenIdSchema,
  })
  .strict();

type ReadinessParams = z.infer<typeof readinessParameters>;

const policyParameters = z
  .object({
    providerId: z.string().min(1).max(128),
    version: z.string().min(1).max(128).optional(),
  })
  .strict();

type PolicyParams = z.infer<typeof policyParameters>;

const receiptParameters = z
  .object({
    transactionId: z.string().regex(/^0\.0\.\d+@\d+\.\d+$/),
    bookingTokenId: tokenIdSchema,
    bookingSerial: z.number().int().positive(),
    sellerAccountId: accountIdSchema,
    buyerAccountId: accountIdSchema,
    settlementTokenId: tokenIdSchema,
    settlementSourceAccountId: accountIdSchema,
    settlementRecipientAccountId: accountIdSchema,
    settlementAmountAtomicUnits: z.string().regex(/^[1-9][0-9]*$/),
  })
  .strict();

type ReceiptParams = z.infer<typeof receiptParameters>;

const healthParameters = z
  .object({
    maxMirrorLagSeconds: z.number().int().min(1).max(300).default(30),
  })
  .strict();

type HealthParams = z.infer<typeof healthParameters>;

function makeReadOnlyEnvelope(raw: Record<string, unknown>, humanMessage: string) {
  return {
    raw: {
      ...raw,
      readOnly: true,
      signed: false,
      submitted: false,
      mutationAuthorized: false,
    },
    humanMessage,
  };
}

class StudioInventoryTool extends BaseTool<unknown, InventoryParams> {
  method = YOURTURN_STUDIO_INVENTORY_TOOL;
  name = "Inspect studio booking inventory";
  description = "Read one provider-scoped BOOKED collection from Hedera Mirror. No signing or mutation.";
  parameters: any = inventoryParameters;
  outputParser = untypedQueryOutputParser;

  constructor(private readonly mirrorBase: string, private readonly fetchJson: FetchJson) {
    super();
  }

  async normalizeParams(params: unknown): Promise<InventoryParams> {
    return inventoryParameters.parse(params);
  }

  async coreAction(params: InventoryParams) {
    const url = `${this.mirrorBase}/accounts/${params.providerAccountId}/nfts?token.id=${params.bookingTokenId}&limit=${params.limit}&order=desc`;
    const body = await this.fetchJson(url);
    if (!Array.isArray(body?.nfts)) throw new Error("studio_inventory_missing_nft_list");
    const nfts = body.nfts.map((nft: any) => {
      if (
        nft?.token_id !== params.bookingTokenId ||
        nft?.account_id !== params.providerAccountId ||
        !Number.isInteger(Number(nft?.serial_number))
      ) {
        throw new Error("studio_inventory_scope_mismatch");
      }
      return {
        tokenId: nft.token_id,
        serial: Number(nft.serial_number),
        holderAccountId: nft.account_id,
        spenderAccountId: nft.spender ?? null,
      };
    });
    return makeReadOnlyEnvelope(
      { providerAccountId: params.providerAccountId, bookingTokenId: params.bookingTokenId, nfts, mirror: url },
      `Read ${nfts.length} provider-owned booking serials from Mirror.`
    );
  }

  async shouldSecondaryAction() { return false; }
  async secondaryAction() { return null; }
}

class StudioBookingHolderTool extends BaseTool<unknown, HolderParams> {
  method = YOURTURN_STUDIO_BOOKING_HOLDER_TOOL;
  name = "Inspect exact booking holder";
  description = "Read the current Mirror holder for one exact booking serial and optionally enforce an expected holder.";
  parameters: any = holderParameters;
  outputParser = untypedQueryOutputParser;

  constructor(private readonly mirrorBase: string, private readonly fetchJson: FetchJson) {
    super();
  }

  async normalizeParams(params: unknown): Promise<HolderParams> {
    return holderParameters.parse(params);
  }

  async coreAction(params: HolderParams) {
    const url = `${this.mirrorBase}/tokens/${params.bookingTokenId}/nfts/${params.serial}`;
    const nft = await this.fetchJson(url);
    if (!nft?.account_id) throw new Error("studio_booking_holder_missing");
    if (nft?.token_id && nft.token_id !== params.bookingTokenId) {
      throw new Error("studio_booking_holder_token_mismatch");
    }
    if (params.expectedHolderAccountId && nft.account_id !== params.expectedHolderAccountId) {
      throw new Error("studio_booking_holder_mismatch");
    }
    return makeReadOnlyEnvelope(
      {
        bookingTokenId: params.bookingTokenId,
        serial: params.serial,
        holderAccountId: nft.account_id,
        spenderAccountId: nft.spender ?? null,
        delegatingSpenderAccountId: nft.delegating_spender ?? null,
        mirror: url,
      },
      `Booking ${params.bookingTokenId}#${params.serial} is held by ${nft.account_id}.`
    );
  }

  async shouldSecondaryAction() { return false; }
  async secondaryAction() { return null; }
}

class StudioReceiveReadinessTool extends BaseTool<unknown, ReadinessParams> {
  method = YOURTURN_STUDIO_RECEIVE_READINESS_TOOL;
  name = "Check paid-delivery receive readiness";
  description =
    "Fail-closed read-only preflight for a buyer receiving a default-frozen BOOKED serial while funding USDC. It never converts a paid flow into a pending airdrop.";
  parameters: any = readinessParameters;
  outputParser = untypedQueryOutputParser;

  constructor(private readonly mirrorBase: string, private readonly fetchJson: FetchJson) {
    super();
  }

  async normalizeParams(params: unknown): Promise<ReadinessParams> {
    const parsed = readinessParameters.parse(params);
    if (parsed.connectedAccountId !== parsed.receiverAccountId) {
      throw new Error("studio_receive_account_switch_identity_mismatch");
    }
    return parsed;
  }

  async coreAction(params: ReadinessParams) {
    const accountUrl = `${this.mirrorBase}/accounts/${params.receiverAccountId}`;
    const bookingRelationshipUrl = `${this.mirrorBase}/accounts/${params.receiverAccountId}/tokens?token.id=${params.bookingTokenId}`;
    const settlementRelationshipUrl = `${this.mirrorBase}/accounts/${params.receiverAccountId}/tokens?token.id=${params.settlementTokenId}`;
    const pendingUrl = `${this.mirrorBase}/accounts/${params.receiverAccountId}/airdrops/pending?limit=100`;

    let account: any;
    let bookingBody: any;
    let settlementBody: any;
    let pendingBody: any;
    try {
      [account, bookingBody, settlementBody, pendingBody] = await Promise.all([
        this.fetchJson(accountUrl),
        this.fetchJson(bookingRelationshipUrl),
        this.fetchJson(settlementRelationshipUrl),
        this.fetchJson(pendingUrl),
      ]);
    } catch (error) {
      return makeReadOnlyEnvelope(
        {
          receiverAccountId: params.receiverAccountId,
          readyForPaidDelivery: false,
          blockers: ["mirror_read_failed"],
          error: error instanceof Error ? error.message : String(error),
          paidFlowMayUsePendingAirdrop: false,
        },
        "Receive readiness is blocked because required Mirror facts could not be read."
      );
    }

    const blockers: string[] = [];
    if (!account?.account || account.account !== params.receiverAccountId) {
      blockers.push("account_missing_or_ambiguous");
    }
    if (account?.receiver_sig_required === true) blockers.push("receiver_signature_required");

    let bookingRelationship: any | null = null;
    let settlementRelationship: any | null = null;
    try {
      bookingRelationship = tokenRelationship(bookingBody, params.bookingTokenId);
      settlementRelationship = tokenRelationship(settlementBody, params.settlementTokenId);
    } catch (error) {
      blockers.push(error instanceof Error ? error.message : "ambiguous_token_relationship");
    }

    if (!bookingRelationship) {
      blockers.push("booking_token_not_associated");
    } else {
      if (bookingRelationship.freeze_status !== "FROZEN") {
        blockers.push("booking_not_frozen_at_rest");
      }
      if (!kycOkay(bookingRelationship.kyc_status)) blockers.push("booking_kyc_not_granted");
    }

    if (!settlementRelationship) {
      blockers.push("settlement_token_not_associated");
    } else {
      if (settlementRelationship.freeze_status === "FROZEN") blockers.push("settlement_token_frozen");
      if (!kycOkay(settlementRelationship.kyc_status)) blockers.push("settlement_kyc_not_granted");
    }

    const pending = pendingBody?.airdrops ?? pendingBody?.pending_airdrops ?? [];
    if (!Array.isArray(pending)) {
      blockers.push("pending_airdrop_state_missing");
    } else if (
      pending.some((item: any) => {
        const tokenId = item?.token_id ?? item?.token?.token_id;
        return tokenId === params.bookingTokenId || tokenId === params.settlementTokenId;
      })
    ) {
      blockers.push("relevant_pending_airdrop_exists");
    }

    const ready = blockers.length === 0;
    return makeReadOnlyEnvelope(
      {
        receiverAccountId: params.receiverAccountId,
        bookingTokenId: params.bookingTokenId,
        settlementTokenId: params.settlementTokenId,
        receiverSigRequired: account?.receiver_sig_required ?? null,
        bookingRelationship,
        settlementRelationship,
        requiresControlledBookingUnfreeze: ready,
        paidFlowMayUsePendingAirdrop: false,
        readyForPaidDelivery: ready,
        blockers,
        mirrorReads: [accountUrl, bookingRelationshipUrl, settlementRelationshipUrl, pendingUrl],
      },
      ready
        ? "Receiver is ready for the controlled paid-delivery path; BOOKED remains frozen at rest and must be unfreezed/refrozen inside the qualified batch."
        : `Paid delivery is blocked: ${blockers.join(", ")}.`
    );
  }

  async shouldSecondaryAction() { return false; }
  async secondaryAction() { return null; }
}

class StudioPolicyTool extends BaseTool<unknown, PolicyParams> {
  method = YOURTURN_STUDIO_POLICY_TOOL;
  name = "Inspect authoritative studio policy";
  description = "Read an authoritative provider policy projection through an injected server-side reader; client-supplied policy terms are not accepted.";
  parameters: any = policyParameters;
  outputParser = untypedQueryOutputParser;

  constructor(private readonly loadProviderPolicy?: StudioOpsSources["loadProviderPolicy"]) {
    super();
  }

  async normalizeParams(params: unknown): Promise<PolicyParams> {
    return policyParameters.parse(params);
  }

  async coreAction(params: PolicyParams) {
    if (!this.loadProviderPolicy) throw new Error("studio_policy_source_unavailable");
    const policy = await this.loadProviderPolicy(params.providerId, params.version);
    if (!policy) throw new Error("studio_policy_missing");
    if (policy.providerId !== params.providerId) throw new Error("studio_policy_provider_mismatch");
    if (params.version && policy.version !== params.version) throw new Error("studio_policy_version_mismatch");
    if (policy.active !== true) throw new Error("studio_policy_inactive");
    if (policy.transferMode !== "default_frozen_hip551") throw new Error("studio_policy_transfer_mode_mismatch");
    tokenIdSchema.parse(policy.bookingTokenId);
    tokenIdSchema.parse(policy.settlementTokenId);
    return makeReadOnlyEnvelope(
      { providerId: params.providerId, policy },
      `Loaded active provider policy ${policy.version} for ${params.providerId}.`
    );
  }

  async shouldSecondaryAction() { return false; }
  async secondaryAction() { return null; }
}

class StudioResaleReceiptTool extends BaseTool<unknown, ReceiptParams> {
  method = YOURTURN_STUDIO_RESALE_RECEIPT_TOOL;
  name = "Verify exact resale settlement receipt";
  description =
    "Read one successful Mirror transaction and verify the exact approved booking movement plus exact Bob-funded stable-value movement. This does not by itself prove HIP-551 outer-batch containment.";
  parameters: any = receiptParameters;
  outputParser = untypedQueryOutputParser;

  constructor(private readonly mirrorBase: string, private readonly fetchJson: FetchJson) {
    super();
  }

  async normalizeParams(params: unknown): Promise<ReceiptParams> {
    return receiptParameters.parse(params);
  }

  async coreAction(params: ReceiptParams) {
    const mirrorId = mirrorTransactionId(params.transactionId);
    const url = `${this.mirrorBase}/transactions/${mirrorId}`;
    const body = await this.fetchJson(url);
    const matches = (body?.transactions ?? []).filter((item: any) => item?.transaction_id === mirrorId);
    if (matches.length !== 1) throw new Error("studio_receipt_exact_transaction_missing_or_ambiguous");
    const transaction = matches[0];
    if (transaction.result !== "SUCCESS") throw new Error(`studio_receipt_not_success:${transaction.result}`);

    const nftTransfers = transaction.nft_transfers ?? [];
    if (nftTransfers.length !== 1) throw new Error(`studio_receipt_nft_transfer_count:${nftTransfers.length}`);
    const nft = nftTransfers[0];
    if (
      nft.token_id !== params.bookingTokenId ||
      Number(nft.serial_number) !== params.bookingSerial ||
      nft.sender_account_id !== params.sellerAccountId ||
      nft.receiver_account_id !== params.buyerAccountId ||
      nft.is_approval !== true
    ) {
      throw new Error("studio_receipt_booking_transfer_mismatch");
    }

    const tokenTransfers = transaction.token_transfers ?? [];
    if (tokenTransfers.length !== 2) throw new Error(`studio_receipt_token_transfer_count:${tokenTransfers.length}`);
    if (tokenTransfers.some((item: any) => item.token_id !== params.settlementTokenId)) {
      throw new Error("studio_receipt_settlement_token_mismatch");
    }
    const transferAccount = (item: any) => item.account ?? item.account_id;
    const amount = BigInt(params.settlementAmountAtomicUnits);
    const debit = tokenTransfers.find((item: any) => transferAccount(item) === params.settlementSourceAccountId);
    const credit = tokenTransfers.find((item: any) => transferAccount(item) === params.settlementRecipientAccountId);
    if (!debit || BigInt(debit.amount) !== -amount) throw new Error("studio_receipt_funder_mismatch");
    if (!credit || BigInt(credit.amount) !== amount) throw new Error("studio_receipt_recipient_mismatch");

    return makeReadOnlyEnvelope(
      {
        transactionId: params.transactionId,
        mirror: url,
        bookingTransfer: nft,
        settlementTransfers: tokenTransfers,
        exactBookingAndSettlementVerified: true,
        hip551BatchContainmentVerified: false,
        evidenceBoundary: "single successful settlement transaction only",
      },
      `Verified exact booking + stable-value settlement semantics for ${params.transactionId}; outer HIP-551 batch containment remains a separate evidence boundary.`
    );
  }

  async shouldSecondaryAction() { return false; }
  async secondaryAction() { return null; }
}

class StudioNetworkHealthTool extends BaseTool<unknown, HealthParams> {
  method = YOURTURN_STUDIO_NETWORK_HEALTH_TOOL;
  name = "Check Hedera and Mirror read health";
  description = "Read-only Hedera Status + Mirror freshness preflight. Any missing/degraded/stale fact blocks starting a new write preparation.";
  parameters: any = healthParameters;
  outputParser = untypedQueryOutputParser;

  constructor(
    private readonly mirrorBase: string,
    private readonly statusUrl: string,
    private readonly fetchJson: FetchJson,
    private readonly nowMs: () => number
  ) {
    super();
  }

  async normalizeParams(params: unknown): Promise<HealthParams> {
    return healthParameters.parse(params);
  }

  async coreAction(params: HealthParams) {
    const blockers: string[] = [];
    let status: any = null;
    let mirror: any = null;
    try {
      status = await this.fetchJson(this.statusUrl);
    } catch {
      blockers.push("hedera_status_unavailable");
    }
    const indicator = status?.status?.indicator;
    if (status && indicator !== "none") blockers.push(`hedera_status_${indicator ?? "unknown"}`);

    const mirrorUrl = `${this.mirrorBase}/transactions?limit=1&order=desc`;
    try {
      mirror = await this.fetchJson(mirrorUrl);
    } catch {
      blockers.push("mirror_unavailable");
    }

    const latest = mirror?.transactions?.[0]?.consensus_timestamp;
    const latestMs = parseConsensusTimestampMs(latest);
    let mirrorLagSeconds: number | null = null;
    if (mirror && latestMs === null) {
      blockers.push("mirror_freshness_missing");
    } else if (latestMs !== null) {
      mirrorLagSeconds = (this.nowMs() - latestMs) / 1000;
      if (mirrorLagSeconds < -1) blockers.push("mirror_timestamp_in_future");
      if (mirrorLagSeconds > params.maxMirrorLagSeconds) blockers.push("mirror_stale");
    }

    const safe = blockers.length === 0;
    return makeReadOnlyEnvelope(
      {
        hederaStatusIndicator: indicator ?? null,
        mirrorLatestConsensusTimestamp: latest ?? null,
        mirrorLagSeconds,
        maxMirrorLagSeconds: params.maxMirrorLagSeconds,
        safeToStartWritePreparation: safe,
        blockers,
        statusUrl: this.statusUrl,
        mirrorUrl,
      },
      safe ? "Hedera Status and Mirror freshness preflight are healthy." : `New write preparation is blocked: ${blockers.join(", ")}.`
    );
  }

  async shouldSecondaryAction() { return false; }
  async secondaryAction() { return null; }
}

export function createYourTurnStudioOpsPlugin(sources: StudioOpsSources = {}): Plugin {
  const mirrorBase = sources.mirrorBaseUrl ?? DEFAULT_MIRROR;
  const statusUrl = sources.statusUrl ?? DEFAULT_STATUS;
  const fetchJson = sources.fetchJson ?? defaultFetchJson;
  const nowMs = sources.nowMs ?? (() => Date.now());

  return {
    name: "yourturn-studio-ops-readonly-plugin",
    version: "2026.09.12",
    description:
      "Read-only Studio-Tomorrow Hedera HAK tools for provider inventory, holder truth, paid-delivery readiness, authoritative policy, settlement receipts and network health.",
    tools: () => [
      new StudioInventoryTool(mirrorBase, fetchJson),
      new StudioBookingHolderTool(mirrorBase, fetchJson),
      new StudioReceiveReadinessTool(mirrorBase, fetchJson),
      new StudioPolicyTool(sources.loadProviderPolicy),
      new StudioResaleReceiptTool(mirrorBase, fetchJson),
      new StudioNetworkHealthTool(mirrorBase, statusUrl, fetchJson, nowMs),
    ],
  };
}
