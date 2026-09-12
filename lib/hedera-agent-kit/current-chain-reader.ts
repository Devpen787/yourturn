import { ECDH } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { PublicKey } from "@hiero-ledger/sdk";

/** Public indexed observations only. This is NOT the canonical execution resolver:
 * provider rules, signed mandates, registry bindings and consensus-time rechecks
 * must be supplied separately. Mirror can lag even when a recent record exists.
 * Schema: https://testnet.mirrornode.hedera.com/api/v1/docs/openapi.yml
 */
export const TESTNET_MIRROR_ORIGIN = "https://testnet.mirrornode.hedera.com";
export const TESTNET_USDC = "0.0.429274";
const INT64_MAX = BigInt("9223372036854775807");
const MAX_BODY_BYTES = 131072;
const MAX_READ_WINDOW_MS = 5000;
const MAX_INDEX_AGE_MS = 30000;
export class CurrentChainReadDenied extends Error {
  constructor(public readonly code: string) { super(code); this.name = "CurrentChainReadDenied"; }
}
const deny = (code: string): never => { throw new CurrentChainReadDenied(code); };
type Obj = Record<string, unknown>;
function object(value: unknown): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value)) return deny("MALFORMED_RESPONSE");
  return value as Obj;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^0\.0\.[1-9][0-9]{0,18}$/.test(value) || BigInt(value.slice(4)) > INT64_MAX) return deny("INVALID_ENTITY_ID");
  return value;
}
function integer(value: unknown, positive = false): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) return deny("UNSAFE_INTEGER");
    value = String(value);
  }
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > INT64_MAX || (positive && value === "0")) return deny("INVALID_INTEGER");
  return value;
}
function stamp(value: unknown): number {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,10}\.[0-9]{9}$/.test(value)) return deny("INVALID_TIMESTAMP");
  const [sec, nano] = value.split(".");
  const ms = Number(BigInt(sec) * BigInt(1000) + BigInt(nano) / BigInt(1000000));
  if (!Number.isSafeInteger(ms)) return deny("INVALID_TIMESTAMP");
  return ms;
}
function exactKeys(value: Obj, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) deny("UNSUPPORTED_FEE_METADATA");
}
export type ChainFeeMetadata = {
  tokenId: string; treasuryAccountId: string; feeScheduleKey: null;
  fixedFees: []; fractionalFees: [];
  royaltyFees: { numerator: string; denominator: string; collectorAccountId: string; allCollectorsAreExempt: boolean; fallbackFee: null }[];
};
function token(value: unknown, tokenId: string, nft: boolean) {
  const v = object(value);
  if (v.token_id !== tokenId || v.type !== (nft ? "NON_FUNGIBLE_UNIQUE" : "FUNGIBLE_COMMON") ||
    v.deleted !== false || !["NOT_APPLICABLE", "UNPAUSED"].includes(String(v.pause_status)) ||
    integer(v.decimals) !== (nft ? "0" : "6")) deny("TOKEN_STATE_UNSUPPORTED");
  if (v.fee_schedule_key !== null) deny("MUTABLE_FEE_SCHEDULE");
  // Missing fee families are valid only for the other token type, per Mirror's
  // TokenCustomFees schema and its current JSON. Never discard a nonempty family.
  const fees = object(v.custom_fees);
  exactKeys(fees, ["created_timestamp", "fixed_fees", "fractional_fees", "royalty_fees"]);
  stamp(fees.created_timestamp);
  if (!Array.isArray(fees.fixed_fees) || fees.fixed_fees.length !== 0) deny("UNSUPPORTED_FIXED_FEES");
  const fractional = fees.fractional_fees;
  const royalty = fees.royalty_fees;
  if ((nft && fractional !== undefined && (!Array.isArray(fractional) || fractional.length !== 0)) ||
    (!nft && (!Array.isArray(fractional) || fractional.length !== 0))) deny("UNSUPPORTED_FRACTIONAL_FEES");
  if ((nft && !Array.isArray(royalty)) || (!nft && royalty !== undefined && (!Array.isArray(royalty) || royalty.length !== 0))) deny("UNSUPPORTED_ROYALTY_FEES");
  const royalties = (royalty ?? []) as unknown[];
  if (royalties.length > 1) deny("UNSUPPORTED_ROYALTY_FEES");
  const royaltyFees = royalties.map(raw => {
    const r = object(raw); exactKeys(r, ["amount", "collector_account_id", "all_collectors_are_exempt", "fallback_fee"]);
    const amount = object(r.amount); exactKeys(amount, ["numerator", "denominator"]);
    const numerator = integer(amount.numerator, true), denominator = integer(amount.denominator, true);
    if (BigInt(numerator) > BigInt(denominator) || typeof r.all_collectors_are_exempt !== "boolean" || r.fallback_fee !== null) deny("UNSUPPORTED_ROYALTY_FEES");
    return { numerator, denominator, collectorAccountId: id(r.collector_account_id), allCollectorsAreExempt: r.all_collectors_are_exempt as boolean, fallbackFee: null };
  });
  const feeMetadata: ChainFeeMetadata = { tokenId, treasuryAccountId: id(v.treasury_account_id), feeScheduleKey: null, fixedFees: [], fractionalFees: [], royaltyFees };
  // Freeze/KYC metadata must be present; relationship status must agree with it.
  for (const key of ["freeze_key", "kyc_key", "pause_key"]) if (v[key] !== null) {
    const descriptor = object(v[key]);
    if (Object.keys(descriptor).some(k => !["_type", "key"].includes(k)) ||
      !((descriptor._type === "ED25519" && typeof descriptor.key === "string" && /^[a-fA-F0-9]{64}$/.test(descriptor.key)) ||
        (descriptor._type === "ECDSA_SECP256K1" && typeof descriptor.key === "string" && /^(02|03)[a-fA-F0-9]{64}$/.test(descriptor.key)))) deny("TOKEN_KEY_METADATA_UNSUPPORTED");
  }
  if ((v.pause_key === null) !== (v.pause_status === "NOT_APPLICABLE")) deny("TOKEN_STATE_UNSUPPORTED");
  return { tokenId, decimals: nft ? 0 : 6, customFeeCount: royaltyFees.length, feeScheduleKey: null, feeMetadata,
    freezeKeyPresent: v.freeze_key !== null, kycKeyPresent: v.kyc_key !== null,
    modifiedTimestamp: String(v.modified_timestamp), modifiedAtMs: stamp(v.modified_timestamp) };
}
export type ChainReadSelection = {
  bookingTokenId: string; serial: number; holderAccountId: string;
  fundingAccountId: string; receiverAccountId: string; executorAccountId: string;
  settlementTokenId: string; requiredFundingAtomicUnits: string;
};
export type CurrentChainReaderOptions = {
  /** Trusted test dependency. Never accept fetch/clock implementations from HTTP. */
  fetch?: typeof fetch; now?: () => number;
};

export async function readCurrentRecoveryChain(selection: ChainReadSelection, options: CurrentChainReaderOptions = {}) {
  const s = structuredClone(selection);
  for (const value of [s.bookingTokenId, s.holderAccountId, s.fundingAccountId, s.receiverAccountId, s.executorAccountId]) id(value);
  if (s.settlementTokenId !== TESTNET_USDC || s.bookingTokenId === TESTNET_USDC || s.fundingAccountId !== s.receiverAccountId ||
    new Set([s.holderAccountId, s.fundingAccountId, s.executorAccountId]).size !== 3 ||
    !Number.isSafeInteger(s.serial) || s.serial < 1) deny("UNSUPPORTED_ROLE_SELECTION");
  integer(s.requiredFundingAtomicUnits, true);
  const fetcher = options.fetch ?? fetch, now = options.now ?? Date.now;
  const startedAtMs = now();
  const checkWindow = () => {
    const time = now();
    if (!Number.isSafeInteger(time) || !Number.isSafeInteger(startedAtMs) || time < startedAtMs || time - startedAtMs > MAX_READ_WINDOW_MS) deny("READ_WINDOW_EXPIRED");
    return time;
  };
  checkWindow();
  const observations: { path: string; fetchedAtMs: number }[] = [];
  async function get(path: string): Promise<Obj> {
    checkWindow();
    const url = new URL(path, TESTNET_MIRROR_ORIGIN);
    if (url.origin !== TESTNET_MIRROR_ORIGIN || !url.pathname.startsWith("/api/v1/") || url.username || url.password || url.hash) deny("UNSAFE_MIRROR_URL");
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const expired = new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new CurrentChainReadDenied("MIRROR_TIMEOUT")); }, 2500); });
    try {
      const work = (async () => {
        const response = await fetcher(url.href, { method: "GET", redirect: "error", credentials: "omit", cache: "no-store", headers: { accept: "application/json" }, signal: controller.signal });
        if (!response.ok || (response.url && response.url !== url.href) || !response.headers.get("content-type")?.split(";")[0].trim().endsWith("/json")) deny("MIRROR_RESPONSE_INVALID");
        const length = response.headers.get("content-length");
        if (length !== null && (!/^[0-9]+$/.test(length) || Number(length) > MAX_BODY_BYTES)) deny("MIRROR_BODY_TOO_LARGE");
        if (!response.body) deny("MIRROR_RESPONSE_INVALID");
        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = []; let bytes = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            bytes += part.value.length;
            if (bytes > MAX_BODY_BYTES) deny("MIRROR_BODY_TOO_LARGE");
            chunks.push(part.value);
          }
        } catch (error) { void reader.cancel(); throw error; }
        const data = object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        observations.push({ path, fetchedAtMs: checkWindow() });
        return data;
      })();
      return await Promise.race([work, expired]);
    } catch (error) {
      if (error instanceof CurrentChainReadDenied) throw error;
      return deny("MIRROR_UNAVAILABLE_OR_MALFORMED");
    } finally { clearTimeout(timeout!); controller.abort(); }
  }
  function terminalItems(v: Obj, key: string): unknown[] {
    // Exact equality queries have at most one row. A continuation implies an
    // incomplete or widened answer. Do not follow even same-origin pagination.
    if (object(v.links).next !== null || !Array.isArray(v[key]) || (v[key] as unknown[]).length > 1) return deny("INCOMPLETE_EXACT_QUERY");
    return v[key] as unknown[];
  }
  async function indexWatermark() {
    const result = await get("/api/v1/transactions?limit=1&order=desc");
    if (!Array.isArray(result.transactions) || result.transactions.length !== 1) deny("INDEX_WATERMARK_MISSING");
    const timestamp = object((result.transactions as unknown[])[0]).consensus_timestamp;
    const ms = stamp(timestamp), current = checkWindow();
    if (ms > current || current - ms > MAX_INDEX_AGE_MS) deny("INDEX_WATERMARK_STALE");
    return { consensusTimestamp: String(timestamp), indexedAtLeastThroughMs: ms };
  }
  async function account(accountId: string, nativeKey: boolean) {
    const v = await get(`/api/v1/accounts/${accountId}?transactions=false`);
    if (v.account !== accountId || v.deleted !== false || typeof v.receiver_sig_required !== "boolean") deny("ACCOUNT_STATE_UNSUPPORTED");
    if (!nativeKey) return { accountId, receiverSignatureRequired: v.receiver_sig_required, publicKey: null };
    const key = object(v.key);
    if (Object.keys(key).some(k => !["_type", "key"].includes(k)) || typeof key.key !== "string") deny("NATIVE_SINGLE_KEY_REQUIRED");
    let publicKey: string;
    try {
      if (key._type === "ED25519" && /^[a-fA-F0-9]{64}$/.test(key.key as string)) publicKey = PublicKey.fromStringED25519(key.key as string).toString();
      else if (key._type === "ECDSA_SECP256K1" && /^(02|03)[a-fA-F0-9]{64}$/.test(key.key as string)) {
        ECDH.convertKey(key.key as string, "secp256k1", "hex", "hex", "compressed");
        publicKey = PublicKey.fromStringECDSA(key.key as string).toString();
      }
      else return deny("NATIVE_SINGLE_KEY_REQUIRED");
    } catch { return deny("NATIVE_SINGLE_KEY_REQUIRED"); }
    return { accountId, receiverSignatureRequired: v.receiver_sig_required, publicKey };
  }
  async function relationship(accountId: string, metadata: ReturnType<typeof token>) {
    const rows = terminalItems(await get(`/api/v1/accounts/${accountId}/tokens?token.id=${metadata.tokenId}&limit=100`), "tokens");
    if (rows.length !== 1) deny("TOKEN_ASSOCIATION_MISSING");
    const r = object(rows[0]);
    if (r.token_id !== metadata.tokenId || r.decimals !== metadata.decimals ||
      r.freeze_status !== (metadata.freezeKeyPresent ? "UNFROZEN" : "NOT_APPLICABLE") ||
      r.kyc_status !== (metadata.kycKeyPresent ? "GRANTED" : "NOT_APPLICABLE") ||
      typeof r.automatic_association !== "boolean") deny("TOKEN_RELATIONSHIP_UNUSABLE");
    stamp(r.created_timestamp);
    return { accountId, tokenId: metadata.tokenId, balanceAtomicUnits: integer(r.balance), decimals: metadata.decimals, freezeStatus: String(r.freeze_status), kycStatus: String(r.kyc_status) };
  }
  async function facts() {
    const [bookingRaw, usdcRaw, nft, fundingAccount, holder, executor, allowances] = await Promise.all([
      get(`/api/v1/tokens/${s.bookingTokenId}`), get(`/api/v1/tokens/${TESTNET_USDC}`),
      get(`/api/v1/tokens/${s.bookingTokenId}/nfts/${s.serial}`), account(s.fundingAccountId, true),
      account(s.holderAccountId, false), account(s.executorAccountId, false),
      get(`/api/v1/accounts/${s.holderAccountId}/allowances/nfts?owner=true&account.id=${s.executorAccountId}&token.id=${s.bookingTokenId}&limit=100`),
    ]);
    const booking = token(bookingRaw, s.bookingTokenId, true), settlement = token(usdcRaw, TESTNET_USDC, false);
    if (nft.token_id !== s.bookingTokenId || nft.serial_number !== s.serial || nft.account_id !== s.holderAccountId || nft.deleted !== false ||
      nft.spender !== s.executorAccountId || nft.delegating_spender !== null) deny("EXACT_SERIAL_ALLOWANCE_REQUIRED");
    stamp(nft.modified_timestamp);
    const rows = terminalItems(allowances, "allowances");
    for (const raw of rows) {
      const r = object(raw), range = object(r.timestamp);
      if (r.owner !== s.holderAccountId || r.spender !== s.executorAccountId || r.token_id !== s.bookingTokenId ||
        r.approved_for_all !== false || range.to !== null) deny("BROAD_OR_UNSUPPORTED_NFT_ALLOWANCE");
      stamp(range.from);
    }
    if (holder.receiverSignatureRequired) deny("ADDITIONAL_HOLDER_SIGNATURE_REQUIRED");
    const [holderBooking, receiverBooking, fundingUsdc, holderUsdc, ...collectorUsdc] = await Promise.all([
      relationship(s.holderAccountId, booking), relationship(s.receiverAccountId, booking),
      relationship(s.fundingAccountId, settlement), relationship(s.holderAccountId, settlement),
      ...booking.feeMetadata.royaltyFees.map(r => relationship(r.collectorAccountId, settlement)),
    ]);
    if (BigInt(holderBooking.balanceAtomicUnits) < BigInt(1) || BigInt(fundingUsdc.balanceAtomicUnits) < BigInt(s.requiredFundingAtomicUnits)) deny("INSUFFICIENT_OBSERVED_BALANCE");
    return { selection: s, fundingAccount, holder, executor, tokens: { booking, settlement },
      bookingAllowance: { tokenId: s.bookingTokenId, serial: s.serial, ownerAccountId: s.holderAccountId, spenderAccountId: s.executorAccountId, approvedForAll: false as const },
      nftModifiedTimestamp: String(nft.modified_timestamp),
      relationships: { holderBooking, receiverBooking, fundingUsdc, holderUsdc, collectorUsdc } };
  }
  const before = await indexWatermark();
  const first = await facts();
  const second = await facts();
  if (!isDeepStrictEqual(first, second)) deny("INDEXED_STATE_CHANGED_DURING_READ");
  const after = await indexWatermark();
  if (after.indexedAtLeastThroughMs < before.indexedAtLeastThroughMs) deny("INDEX_WATERMARK_REGRESSED");
  const completedAtMs = checkWindow();
  return { kind: "TESTNET_MIRROR_INDEXED_OBSERVATION" as const, consensusSynchronous: false as const,
    canonicalExecutionResolver: false as const, startedAtMs, completedAtMs, maxReadWindowMs: MAX_READ_WINDOW_MS,
    maxIndexAgeMs: MAX_INDEX_AGE_MS, indexWatermarks: { before, after }, observations, ...second };
}
