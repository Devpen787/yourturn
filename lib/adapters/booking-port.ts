import { createHmac, timingSafeEqual } from "node:crypto";
import { calcRoyalty, calcSellerNet } from "@/lib/domain/fees";
import { canBook, canResell } from "@/lib/domain/guards";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import {
  accountsEqual,
  getActorCredentials,
  type DemoActor,
  tryResolveGuestActor,
} from "@/lib/hedera/client";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import {
  getNftBySerial,
  isTokenAssociatedWithAccount,
} from "@/lib/hedera/mirror";
import {
  associateTokenToAccount,
  freezeHolder,
  getTreasuryIdString,
  primaryBookTransfer,
  resaleTransfer,
  transferNftFromHolderToTreasury,
  burnUsedSlot,
  unfreezeHolder,
} from "@/lib/hedera/token";
import {
  getLifecycleEventsForSerial,
  readSlotChainState,
  readSlotLiveState,
} from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import {
  addListing,
  deactivateListing,
  getActiveListingForSerial,
} from "@/lib/store/listings";
import { getSlotBySerial, loadSlots, updateSlotListingActive } from "@/lib/store/slots";
import type { ResaleListing } from "@/lib/types/listing";
import type { SlotRecord } from "@/lib/types/slot";
import type {
  ActionPreview,
  ApprovalProof,
  BookingActorRef,
  BookingPortAction,
  BookingPort,
  BookingPortErrorCode,
  BookingSlotView,
  ResaleListingView,
} from "@/lib/types/booking-port";

type PreviewAction =
  | {
      action: "book";
      input: { buyer: BookingActorRef; serial: number };
      expiresAt: string;
    }
  | {
      action: "create_listing";
      input: {
        seller: BookingActorRef;
        serial: number;
        askPriceHbar: number;
      };
      expiresAt: string;
    }
  | {
      action: "buy_listing";
      input: { buyer: BookingActorRef; serial: number };
      expiresAt: string;
    }
  | {
      action: "freeze";
      input: {
        issuer: BookingActorRef;
        serial: number;
        holder: BookingActorRef;
      };
      expiresAt: string;
    }
  | {
      action: "unfreeze";
      input: {
        issuer: BookingActorRef;
        serial: number;
        holder: BookingActorRef;
      };
      expiresAt: string;
    }
  | {
      action: "mark_used";
      input: { issuer: BookingActorRef; serial: number };
      expiresAt: string;
    };

type StoredResources = {
  tokenId: string;
  topicId: string;
  treasuryAccountId: string;
};

type PreparedBook = StoredResources & {
  buyerActor: DemoActor;
  buyerAccountId: string;
  serial: number;
  slot: SlotRecord;
};

type PreparedListing = StoredResources & {
  sellerAccountId: string;
  serial: number;
  askPriceHbar: number;
};

type PreparedBuy = StoredResources & {
  buyerActor: DemoActor;
  buyerAccountId: string;
  listing: ResaleListing;
};

type PreparedFreeze = StoredResources & {
  serial: number;
  holderAccountId: string;
};

type PreparedMarkUsed = StoredResources & {
  serial: number;
  currentHolderAccountId: string | null;
  currentHolderActor: "guestA" | "guestB" | null;
};

const PREVIEW_TTL_MS = 10 * 60 * 1000;

export type BookingPreviewScope = {
  action: BookingPortAction;
  actor: BookingActorRef;
  serial: number;
  expiresAt: string;
};

export class BookingPortError extends Error {
  readonly code: BookingPortErrorCode;
  readonly status: number;

  constructor(message: string, code: BookingPortErrorCode, status: number) {
    super(message);
    this.name = "BookingPortError";
    this.code = code;
    this.status = status;
  }
}

function createError(
  message: string,
  code: BookingPortErrorCode,
  status: number
): BookingPortError {
  return new BookingPortError(message, code, status);
}

function requireApproval(approval: ApprovalProof): void {
  if (!approval.approvedBy.trim()) {
    throw createError("Approval is required", "VALIDATION_ERROR", 400);
  }
  if (!approval.approvedAt.trim() || Number.isNaN(Date.parse(approval.approvedAt))) {
    throw createError("Approval timestamp is required", "VALIDATION_ERROR", 400);
  }
}

function previewSecret(): string {
  return (
    process.env.BOOKED_RIGHTS_PREVIEW_SECRET ||
    process.env.HEDERA_OPERATOR_KEY ||
    process.env.HEDERA_TREASURY_KEY ||
    "booked-rights-preview-secret"
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", previewSecret()).update(payload).digest("base64url");
}

function encodePreviewToken(value: PreviewAction): string {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function decodePreviewToken(token: string): PreviewAction {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw createError("Invalid preview token", "VALIDATION_ERROR", 400);
  }
  const expected = signPayload(payload);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    throw createError("Preview token failed verification", "VALIDATION_ERROR", 400);
  }
  const decoded = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  ) as PreviewAction;
  if (Date.parse(decoded.expiresAt) < Date.now()) {
    throw createError("Preview token has expired", "CONFLICT", 409);
  }
  return decoded;
}

export function inspectBookingPortPreview(previewId: string): BookingPreviewScope {
  const preview = decodePreviewToken(previewId);
  if (preview.action === "book") {
    return {
      action: preview.action,
      actor: preview.input.buyer,
      serial: preview.input.serial,
      expiresAt: preview.expiresAt,
    };
  }
  if (preview.action === "create_listing") {
    return {
      action: preview.action,
      actor: preview.input.seller,
      serial: preview.input.serial,
      expiresAt: preview.expiresAt,
    };
  }
  if (preview.action === "buy_listing") {
    return {
      action: preview.action,
      actor: preview.input.buyer,
      serial: preview.input.serial,
      expiresAt: preview.expiresAt,
    };
  }
  if (preview.action === "freeze" || preview.action === "unfreeze") {
    return {
      action: preview.action,
      actor: preview.input.issuer,
      serial: preview.input.serial,
      expiresAt: preview.expiresAt,
    };
  }
  return {
    action: preview.action,
    actor: preview.input.issuer,
    serial: preview.input.serial,
    expiresAt: preview.expiresAt,
  };
}

async function getResources(): Promise<StoredResources> {
  const tokenId = await getStoredTokenId();
  const topicId = await getStoredTopicId();
  if (!tokenId || !topicId) {
    throw createError("Run /api/init first", "NOT_FOUND", 400);
  }
  return {
    tokenId,
    topicId,
    treasuryAccountId: getTreasuryIdString(),
  };
}

function nextExpiry(): string {
  return new Date(Date.now() + PREVIEW_TTL_MS).toISOString();
}

function actorAccountId(actor: BookingActorRef): string {
  if (actor.kind === "demoActor") {
    return getActorCredentials(actor.id).accountId.toString();
  }
  return actor.accountId;
}

function actorLabel(actor: BookingActorRef): string {
  if (actor.kind === "demoActor") return actor.id;
  return actor.accountId;
}

function tryResolveDemoActor(actor: BookingActorRef): DemoActor | null {
  if (actor.kind === "demoActor") return actor.id;
  const treasuryAccountId = getTreasuryIdString();
  if (accountsEqual(actor.accountId, treasuryAccountId)) return "issuer";
  return tryResolveGuestActor(actor.accountId);
}

function requireDemoActor(actor: BookingActorRef, label: string): DemoActor {
  const resolved = tryResolveDemoActor(actor);
  if (!resolved) {
    throw createError(
      `${label} is not one of the server-managed demo accounts.`,
      "CONFLICT",
      409
    );
  }
  return resolved;
}

function listingViewFromRecord(listing: ResaleListing): ResaleListingView {
  return {
    tokenId: listing.tokenId,
    serial: listing.serial,
    sellerAccountId: listing.sellerAccountId,
    askPriceHbar: listing.askPriceHbar,
    royaltyHbar: calcRoyalty(listing.askPriceHbar),
    sellerNetHbar: calcSellerNet(listing.askPriceHbar),
    active: listing.active,
    createdAt: listing.createdAt,
  };
}

async function slotViewFromRecord(slot: SlotRecord): Promise<BookingSlotView> {
  const topicId = await getStoredTopicId();
  const chain = await readSlotLiveState({
    tokenId: slot.tokenId,
    serial: slot.serial,
    treasuryAccountId: getTreasuryIdString(),
    topicId,
  });
  return {
    tokenId: slot.tokenId,
    serial: slot.serial,
    slotId: slot.slotId,
    title: slot.title,
    startTime: slot.startTime,
    endTime: slot.endTime,
    location: slot.location,
    primaryPriceHbar: slot.primaryPriceHbar,
    resaleAllowed: slot.resaleAllowed,
    listingActive: slot.listingActive,
    status: chain.status,
    holderAccountId: chain.holderAccountId,
  };
}

async function parseLifecycleEvents(serial: number): Promise<
  Array<Record<string, unknown> & { serial: number }>
> {
  const topicId = await getStoredTopicId();
  if (!topicId) return [];
  const tokenId = await getStoredTokenId();
  if (!tokenId) return [];
  const events = await getLifecycleEventsForSerial({ topicId, tokenId, serial });
  return events as Array<Record<string, unknown> & { serial: number }>;
}

async function prepareBook(input: {
  buyer: BookingActorRef;
  serial: number;
}): Promise<PreparedBook> {
  const resources = await getResources();
  const slot = await getSlotBySerial(input.serial);
  if (!slot) {
    throw createError("Unknown serial", "NOT_FOUND", 404);
  }
  const chain = await readSlotChainState({
    tokenId: resources.tokenId,
    serial: input.serial,
    treasuryAccountId: resources.treasuryAccountId,
  });
  if (!canBook(chain.status)) {
    throw createError("Slot is not available for booking", "CONFLICT", 409);
  }
  const buyerActor = requireDemoActor(input.buyer, "Buyer");
  if (buyerActor !== "guestA" && buyerActor !== "guestB") {
    throw createError(
      "Buyer must be one of the demo guest accounts.",
      "CONFLICT",
      409
    );
  }
  const buyerAccountId = actorAccountId(input.buyer);
  return {
    ...resources,
    buyerActor,
    buyerAccountId,
    serial: input.serial,
    slot,
  };
}

async function executeBook(input: {
  buyer: BookingActorRef;
  serial: number;
}): Promise<{ txId: string; hashscanUrl: string }> {
  const prepared = await prepareBook(input);
  const buyerCredentials = getActorCredentials(prepared.buyerActor);
  if (!(await isTokenAssociatedWithAccount(prepared.buyerAccountId, prepared.tokenId))) {
    await associateTokenToAccount(
      prepared.buyerAccountId,
      buyerCredentials.privateKey.toString(),
      prepared.tokenId
    );
  }
  const txId = await primaryBookTransfer({
    buyerAccountId: prepared.buyerAccountId,
    buyerPrivateKey: buyerCredentials.privateKey.toString(),
    serial: prepared.serial,
    priceHbar: prepared.slot.primaryPriceHbar,
    tokenIdStr: prepared.tokenId,
  });
  void (await submitLifecycleEvent(prepared.topicId, {
    eventType: "BOOKED",
    tokenId: prepared.tokenId,
    serial: prepared.serial,
    from: prepared.treasuryAccountId,
    to: prepared.buyerAccountId,
    priceHbar: prepared.slot.primaryPriceHbar,
    txId,
    timestamp: new Date().toISOString(),
  }));
  return { txId, hashscanUrl: getHashscanTxUrl(txId) };
}

async function prepareCreateListing(input: {
  seller: BookingActorRef;
  serial: number;
  askPriceHbar: number;
}): Promise<PreparedListing> {
  const resources = await getResources();
  const slot = await getSlotBySerial(input.serial);
  if (!slot) {
    throw createError("Unknown serial", "NOT_FOUND", 404);
  }
  const sellerAccountId = actorAccountId(input.seller);
  const chain = await readSlotChainState({
    tokenId: resources.tokenId,
    serial: input.serial,
    treasuryAccountId: resources.treasuryAccountId,
  });
  if (!chain.holderAccountId || !accountsEqual(chain.holderAccountId, sellerAccountId)) {
    throw createError("Only the current holder can list", "CONFLICT", 409);
  }
  if (!canResell({ status: chain.status, resaleAllowed: slot.resaleAllowed })) {
    throw createError("Slot cannot be listed for resale", "CONFLICT", 409);
  }
  const existing = await getActiveListingForSerial(input.serial);
  if (existing) {
    throw createError(
      "An active listing already exists for this serial",
      "CONFLICT",
      409
    );
  }
  return {
    ...resources,
    sellerAccountId,
    serial: input.serial,
    askPriceHbar: input.askPriceHbar,
  };
}

async function executeCreateListing(input: {
  seller: BookingActorRef;
  serial: number;
  askPriceHbar: number;
}): Promise<{
  listing: ResaleListingView;
  auditTxId: string;
  hashscanUrl: string;
}> {
  const prepared = await prepareCreateListing(input);
  const listing: ResaleListing = {
    tokenId: prepared.tokenId,
    serial: prepared.serial,
    sellerAccountId: prepared.sellerAccountId,
    askPriceHbar: prepared.askPriceHbar,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await addListing(listing);
  await updateSlotListingActive(prepared.serial, true);
  const auditTxId = await submitLifecycleEvent(prepared.topicId, {
    eventType: "LISTED",
    tokenId: prepared.tokenId,
    serial: prepared.serial,
    from: prepared.sellerAccountId,
    priceHbar: prepared.askPriceHbar,
    timestamp: new Date().toISOString(),
  });
  return {
    listing: listingViewFromRecord(listing),
    auditTxId,
    hashscanUrl: getHashscanTxUrl(auditTxId),
  };
}

async function prepareBuyListing(input: {
  buyer: BookingActorRef;
  serial: number;
}): Promise<PreparedBuy> {
  const resources = await getResources();
  const listing = await getActiveListingForSerial(input.serial);
  if (!listing || !listing.active) {
    throw createError("No active listing for this serial", "NOT_FOUND", 404);
  }
  const buyerActor = requireDemoActor(input.buyer, "Buyer");
  if (buyerActor !== "guestA" && buyerActor !== "guestB") {
    throw createError(
      "Buyer must be one of the demo guest accounts.",
      "CONFLICT",
      409
    );
  }
  const buyerAccountId = actorAccountId(input.buyer);
  if (accountsEqual(buyerAccountId, listing.sellerAccountId)) {
    throw createError("Buyer cannot be the seller", "CONFLICT", 409);
  }
  return {
    ...resources,
    buyerActor,
    buyerAccountId,
    listing,
  };
}

async function executeBuyListing(input: {
  buyer: BookingActorRef;
  serial: number;
}): Promise<{ txId: string; hashscanUrl: string }> {
  const prepared = await prepareBuyListing(input);
  const sellerActor = tryResolveDemoActor({
    kind: "hederaAccount",
    accountId: prepared.listing.sellerAccountId,
  });
  if (!sellerActor || sellerActor === "issuer") {
    throw createError("Seller is not a demo guest account", "INTERNAL_ERROR", 500);
  }
  const buyerCredentials = getActorCredentials(prepared.buyerActor);
  if (!(await isTokenAssociatedWithAccount(prepared.buyerAccountId, prepared.tokenId))) {
    await associateTokenToAccount(
      prepared.buyerAccountId,
      buyerCredentials.privateKey.toString(),
      prepared.tokenId
    );
  }
  const sellerCredentials = getActorCredentials(sellerActor);
  const txId = await resaleTransfer({
    sellerAccountId: prepared.listing.sellerAccountId,
    sellerPrivateKey: sellerCredentials.privateKey.toString(),
    buyerAccountId: prepared.buyerAccountId,
    buyerPrivateKey: buyerCredentials.privateKey.toString(),
    serial: prepared.listing.serial,
    askPriceHbar: prepared.listing.askPriceHbar,
    tokenIdStr: prepared.tokenId,
  });
  await deactivateListing(prepared.listing.serial);
  await updateSlotListingActive(prepared.listing.serial, false);
  void (await submitLifecycleEvent(prepared.topicId, {
    eventType: "RESOLD",
    tokenId: prepared.tokenId,
    serial: prepared.listing.serial,
    from: prepared.listing.sellerAccountId,
    to: prepared.buyerAccountId,
    priceHbar: prepared.listing.askPriceHbar,
    txId,
    timestamp: new Date().toISOString(),
  }));
  return { txId, hashscanUrl: getHashscanTxUrl(txId) };
}

async function prepareHolderAction(input: {
  issuer: BookingActorRef;
  serial: number;
  holder: BookingActorRef;
}): Promise<PreparedFreeze> {
  const resources = await getResources();
  const issuerActor = requireDemoActor(input.issuer, "Issuer");
  if (issuerActor !== "issuer") {
    throw createError("Only issuer can perform this action", "CONFLICT", 409);
  }
  const nft = await getNftBySerial(resources.tokenId, input.serial);
  if (!nft || nft.deleted) {
    throw createError("Serial not found or already burned", "NOT_FOUND", 404);
  }
  const mirrorHolder = nft.account_id;
  if (!mirrorHolder || accountsEqual(mirrorHolder, resources.treasuryAccountId)) {
    throw createError(
      "There is no guest holder for this serial.",
      "CONFLICT",
      409
    );
  }
  const selectedHolderAccountId = actorAccountId(input.holder);
  if (!accountsEqual(mirrorHolder, selectedHolderAccountId)) {
    throw createError(
      `Selected holder does not match Mirror holder for serial ${input.serial}. Mirror holder: ${mirrorHolder}.`,
      "CONFLICT",
      409
    );
  }
  return {
    ...resources,
    serial: input.serial,
    holderAccountId: mirrorHolder,
  };
}

async function executeFreeze(input: {
  issuer: BookingActorRef;
  serial: number;
  holder: BookingActorRef;
}): Promise<{ ok: true }> {
  const prepared = await prepareHolderAction(input);
  await freezeHolder({
    holderAccountId: prepared.holderAccountId,
    tokenIdStr: prepared.tokenId,
  });
  void (await submitLifecycleEvent(prepared.topicId, {
    eventType: "FROZEN",
    tokenId: prepared.tokenId,
    serial: prepared.serial,
    to: prepared.holderAccountId,
    timestamp: new Date().toISOString(),
  }));
  return { ok: true };
}

async function executeUnfreeze(input: {
  issuer: BookingActorRef;
  serial: number;
  holder: BookingActorRef;
}): Promise<{ ok: true }> {
  const prepared = await prepareHolderAction(input);
  await unfreezeHolder({
    holderAccountId: prepared.holderAccountId,
    tokenIdStr: prepared.tokenId,
  });
  void (await submitLifecycleEvent(prepared.topicId, {
    eventType: "UNFROZEN",
    tokenId: prepared.tokenId,
    serial: prepared.serial,
    to: prepared.holderAccountId,
    timestamp: new Date().toISOString(),
  }));
  return { ok: true };
}

async function prepareMarkUsed(input: {
  issuer: BookingActorRef;
  serial: number;
}): Promise<PreparedMarkUsed> {
  const resources = await getResources();
  const issuerActor = requireDemoActor(input.issuer, "Issuer");
  if (issuerActor !== "issuer") {
    throw createError("Only issuer can perform this action", "CONFLICT", 409);
  }
  const chain = await readSlotChainState({
    tokenId: resources.tokenId,
    serial: input.serial,
    treasuryAccountId: resources.treasuryAccountId,
  });
  if (chain.status === "USED") {
    throw createError("Serial is already burned (USED)", "CONFLICT", 409);
  }
  if (chain.status === "FROZEN") {
    throw createError(
      "Cannot mark used while holder is frozen: unfreeze first so the NFT can move to treasury for burn.",
      "CONFLICT",
      409
    );
  }
  const currentHolderActor =
    chain.holderAccountId != null ? tryResolveGuestActor(chain.holderAccountId) : null;
  return {
    ...resources,
    serial: input.serial,
    currentHolderAccountId: chain.holderAccountId,
    currentHolderActor,
  };
}

async function executeMarkUsed(input: {
  issuer: BookingActorRef;
  serial: number;
}): Promise<{ ok: true }> {
  const prepared = await prepareMarkUsed(input);
  if (prepared.currentHolderAccountId) {
    if (!prepared.currentHolderActor) {
      throw createError(
        "Holder is not Guest A or B; this MVP cannot server-sign return-to-treasury for that account.",
        "CONFLICT",
        409
      );
    }
    const holderCredentials = getActorCredentials(prepared.currentHolderActor);
    await transferNftFromHolderToTreasury({
      holderAccountId: prepared.currentHolderAccountId,
      holderPrivateKey: holderCredentials.privateKey.toString(),
      serial: prepared.serial,
      tokenIdStr: prepared.tokenId,
    });
  }
  await burnUsedSlot({
    serial: prepared.serial,
    tokenIdStr: prepared.tokenId,
  });
  void (await submitLifecycleEvent(prepared.topicId, {
    eventType: "USED",
    tokenId: prepared.tokenId,
    serial: prepared.serial,
    timestamp: new Date().toISOString(),
  }));
  return { ok: true };
}

function buildPreview<TAction extends PreviewAction["action"], TDetails>(
  action: Extract<PreviewAction, { action: TAction }>,
  summary: string,
  details: TDetails
): ActionPreview<TAction, TDetails> {
  return {
    action: action.action,
    previewId: encodePreviewToken(action),
    summary,
    details,
    expiresAt: action.expiresAt,
  };
}

export function createBookingPort(): BookingPort {
  return {
    async listSlots() {
      const slots = await loadSlots();
      return Promise.all(slots.map((slot) => slotViewFromRecord(slot)));
    },

    async getSlot(serial) {
      const slot = await getSlotBySerial(serial);
      if (!slot) return null;
      return slotViewFromRecord(slot);
    },

    async listHoldings(holder) {
      const accountId = actorAccountId(holder);
      const slots = await loadSlots();
      const views = await Promise.all(slots.map((slot) => slotViewFromRecord(slot)));
      return views.filter(
        (slot) =>
          slot.holderAccountId != null &&
          accountsEqual(slot.holderAccountId, accountId) &&
          (slot.status === "HELD" || slot.status === "FROZEN")
      );
    },

    async getListing(serial) {
      const listing = await getActiveListingForSerial(serial);
      return listing ? listingViewFromRecord(listing) : null;
    },

    async getLifecycle(serial) {
      return parseLifecycleEvents(serial);
    },

    async previewBook(input) {
      const prepared = await prepareBook(input);
      const expiresAt = nextExpiry();
      return buildPreview(
        { action: "book", input, expiresAt },
        `Book serial ${prepared.serial} for ${prepared.slot.primaryPriceHbar} ℏ as ${actorLabel(
          input.buyer
        )}.`,
        {
          serial: prepared.serial,
          buyerAccountId: prepared.buyerAccountId,
          priceHbar: prepared.slot.primaryPriceHbar,
        }
      );
    },

    async confirmBook(input) {
      requireApproval(input.approval);
      const preview = decodePreviewToken(input.previewId);
      if (preview.action !== "book") {
        throw createError("Preview token is not for book", "VALIDATION_ERROR", 400);
      }
      return executeBook(preview.input);
    },

    async previewCreateListing(input) {
      const prepared = await prepareCreateListing(input);
      const expiresAt = nextExpiry();
      return buildPreview(
        { action: "create_listing", input, expiresAt },
        `List serial ${prepared.serial} for resale at ${prepared.askPriceHbar} ℏ from ${prepared.sellerAccountId}.`,
        listingViewFromRecord({
          tokenId: prepared.tokenId,
          serial: prepared.serial,
          sellerAccountId: prepared.sellerAccountId,
          askPriceHbar: prepared.askPriceHbar,
          active: true,
          createdAt: new Date().toISOString(),
        })
      );
    },

    async confirmCreateListing(input) {
      requireApproval(input.approval);
      const preview = decodePreviewToken(input.previewId);
      if (preview.action !== "create_listing") {
        throw createError(
          "Preview token is not for create listing",
          "VALIDATION_ERROR",
          400
        );
      }
      return executeCreateListing(preview.input);
    },

    async previewBuyListing(input) {
      const prepared = await prepareBuyListing(input);
      const expiresAt = nextExpiry();
      return buildPreview(
        { action: "buy_listing", input, expiresAt },
        `Buy listed serial ${prepared.listing.serial} for ${prepared.listing.askPriceHbar} ℏ as ${actorLabel(
          input.buyer
        )}.`,
        listingViewFromRecord(prepared.listing)
      );
    },

    async confirmBuyListing(input) {
      requireApproval(input.approval);
      const preview = decodePreviewToken(input.previewId);
      if (preview.action !== "buy_listing") {
        throw createError(
          "Preview token is not for buy listing",
          "VALIDATION_ERROR",
          400
        );
      }
      return executeBuyListing(preview.input);
    },

    async previewFreeze(input) {
      const prepared = await prepareHolderAction(input);
      const expiresAt = nextExpiry();
      return buildPreview(
        { action: "freeze", input, expiresAt },
        `Freeze serial ${prepared.serial} for holder ${prepared.holderAccountId}.`,
        {
          serial: prepared.serial,
          holderAccountId: prepared.holderAccountId,
        }
      );
    },

    async confirmFreeze(input) {
      requireApproval(input.approval);
      const preview = decodePreviewToken(input.previewId);
      if (preview.action !== "freeze") {
        throw createError("Preview token is not for freeze", "VALIDATION_ERROR", 400);
      }
      return executeFreeze(preview.input);
    },

    async previewUnfreeze(input) {
      const prepared = await prepareHolderAction(input);
      const expiresAt = nextExpiry();
      return buildPreview(
        { action: "unfreeze", input, expiresAt },
        `Unfreeze serial ${prepared.serial} for holder ${prepared.holderAccountId}.`,
        {
          serial: prepared.serial,
          holderAccountId: prepared.holderAccountId,
        }
      );
    },

    async confirmUnfreeze(input) {
      requireApproval(input.approval);
      const preview = decodePreviewToken(input.previewId);
      if (preview.action !== "unfreeze") {
        throw createError(
          "Preview token is not for unfreeze",
          "VALIDATION_ERROR",
          400
        );
      }
      return executeUnfreeze(preview.input);
    },

    async previewMarkUsed(input) {
      const prepared = await prepareMarkUsed(input);
      const expiresAt = nextExpiry();
      return buildPreview(
        { action: "mark_used", input, expiresAt },
        `Mark serial ${prepared.serial} as used.`,
        {
          serial: prepared.serial,
          currentHolderAccountId: prepared.currentHolderAccountId,
        }
      );
    },

    async confirmMarkUsed(input) {
      requireApproval(input.approval);
      const preview = decodePreviewToken(input.previewId);
      if (preview.action !== "mark_used") {
        throw createError(
          "Preview token is not for mark used",
          "VALIDATION_ERROR",
          400
        );
      }
      return executeMarkUsed(preview.input);
    },
  };
}

export const bookingPort = createBookingPort();
