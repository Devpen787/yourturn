import assert from "node:assert/strict";
import { PublicKey } from "@hiero-ledger/sdk";
import { readCurrentRecoveryChain, CurrentChainReadDenied, TESTNET_MIRROR_ORIGIN } from "../lib/hedera-agent-kit/current-chain-reader.ts";
const NOW = 1700000000000;
const STAMP = "1699999999.000000000";
const s = { bookingTokenId: "0.0.7001", serial: 7, holderAccountId: "0.0.7002", fundingAccountId: "0.0.7003", receiverAccountId: "0.0.7003", executorAccountId: "0.0.7004", settlementTokenId: "0.0.429274", requiredFundingAtomicUnits: "45000000" };
const token = (nft) => ({ token_id: nft ? s.bookingTokenId : s.settlementTokenId, type: nft ? "NON_FUNGIBLE_UNIQUE" : "FUNGIBLE_COMMON", deleted: false, pause_status: "NOT_APPLICABLE", decimals: nft ? "0" : "6", treasury_account_id: "0.0.7010", fee_schedule_key: null, freeze_key: null, kyc_key: null, pause_key: null, modified_timestamp: STAMP, custom_fees: { created_timestamp: STAMP, fixed_fees: [], ...(nft ? { royalty_fees: [] } : { fractional_fees: [] }) } });
const key = { _type: "ED25519", key: "22".repeat(32) }; // Public synthetic fixture bytes; no signing key.
function fixture(path) {
  const u = new URL(path);
  if (u.pathname === "/api/v1/transactions") return { transactions: [{ consensus_timestamp: STAMP }] };
  if (u.pathname.endsWith("/nfts/7")) return { token_id: s.bookingTokenId, serial_number: 7, account_id: s.holderAccountId, deleted: false, spender: s.executorAccountId, delegating_spender: null, modified_timestamp: STAMP };
  if (u.pathname.endsWith("/allowances/nfts")) return { allowances: [], links: { next: null } };
  if (u.pathname.startsWith("/api/v1/tokens/")) return token(u.pathname.endsWith(s.bookingTokenId));
  if (u.pathname.endsWith("/tokens")) {
    const booking = u.searchParams.get("token.id") === s.bookingTokenId;
    return { tokens: [{ token_id: booking ? s.bookingTokenId : s.settlementTokenId, balance: booking ? 1 : 45000000, decimals: booking ? 0 : 6, freeze_status: "NOT_APPLICABLE", kyc_status: "NOT_APPLICABLE", created_timestamp: STAMP, automatic_association: false }], links: { next: null } };
  }
  return { account: u.pathname.split("/").at(-1), deleted: false, receiver_sig_required: false, key };
}
const response = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
function mock(mutate = () => {}, override) {
  const calls = [];
  const counts = new Map();
  const fetch = async (url, init) => {
    const u = new URL(url);
    assert.equal(u.origin, TESTNET_MIRROR_ORIGIN); assert.equal(init.method, "GET"); assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit"); assert(init.signal);
    calls.push(url); counts.set(url, (counts.get(url) ?? 0) + 1);
    const value = structuredClone(fixture(url));
    mutate(value, u, counts.get(url));
    return override ? override(value, u) : response(value);
  };
  return { fetch, calls };
}
let pass = 0;
async function check(name, body) { await body(); pass++; console.log(`PASS ${name}`); }
async function denied(mutate, code, selection = s, options = {}) {
  const m = mock(mutate);
  await assert.rejects(readCurrentRecoveryChain(selection, { now: () => NOW, fetch: m.fetch, ...options }), e => e instanceof CurrentChainReadDenied && e.code === code);
  return m;
}
const isBooking = u => u.pathname === `/api/v1/tokens/${s.bookingTokenId}`;
const isFund = u => u.pathname === `/api/v1/accounts/${s.fundingAccountId}`;
await check("single native key, exact serial allowance, stable two-pass facts", async () => {
  const m = mock(); const r = await readCurrentRecoveryChain(s, { fetch: m.fetch, now: () => NOW });
  assert.equal(r.kind, "TESTNET_MIRROR_INDEXED_OBSERVATION"); assert.equal(r.canonicalExecutionResolver, false); assert.equal(r.consensusSynchronous, false);
  assert.equal(r.bookingAllowance.approvedForAll, false); assert.equal(r.fundingAccount.publicKey, PublicKey.fromStringED25519(key.key).toString());
  assert.equal(r.relationships.fundingUsdc.balanceAtomicUnits, "45000000"); assert.equal(m.calls.length, 24); assert.equal(r.observations.length, 24);
});
await check("ECDSA normalization returns exact public key", async () => {
  const m = mock((v,u) => { if(isFund(u)) v.key = { _type: "ECDSA_SECP256K1", key: "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798" }; });
  const r = await readCurrentRecoveryChain(s, { fetch:m.fetch, now:()=>NOW }); assert(r.fundingAccount.publicKey);
});
await check("owner-selected single royalty metadata preserved and collector association read", async () => {
  const m = mock((v,u) => { if(isBooking(u)) v.custom_fees.royalty_fees = [{ amount:{numerator:1,denominator:20},collector_account_id:"0.0.7011",all_collectors_are_exempt:false,fallback_fee:null }]; });
  const r = await readCurrentRecoveryChain(s,{fetch:m.fetch,now:()=>NOW});
  assert.deepEqual(r.tokens.booking.feeMetadata.royaltyFees,[{numerator:"1",denominator:"20",collectorAccountId:"0.0.7011",allCollectorsAreExempt:false,fallbackFee:null}]);
  assert.equal(r.relationships.collectorUsdc.length,1);
});
for (const [name, field, value] of [["holder moved","account_id","0.0.7999"],["spender absent","spender",null],["spender wrong","spender","0.0.7999"],["delegated broad spender","delegating_spender",s.executorAccountId],["serial mismatch","serial_number",8],["deleted NFT","deleted",true]]) await check(name,()=>denied((v,u)=>{if(u.pathname.endsWith("/nfts/7"))v[field]=value;},"EXACT_SERIAL_ALLOWANCE_REQUIRED"));
await check("changed serial authority across passes",()=>denied((v,u,n)=>{if(u.pathname.endsWith("/nfts/7")&&n===2)v.modified_timestamp="1699999998.000000000";},"INDEXED_STATE_CHANGED_DURING_READ"));
await check("changed funding key across passes",()=>denied((v,u,n)=>{if(isFund(u)&&n===2)v.key.key="11".repeat(32);},"INDEXED_STATE_CHANGED_DURING_READ"));
for(const type of ["KEY_LIST","THRESHOLD_KEY","CONTRACT_ID","RSA_3072"])await check(`unsupported ${type}`,()=>denied((v,u)=>{if(isFund(u))v.key={_type:type,key:"11".repeat(32)};},"NATIVE_SINGLE_KEY_REQUIRED"));
await check("invalid ECDSA curve point",()=>denied((v,u)=>{if(isFund(u))v.key={_type:"ECDSA_SECP256K1",key:"02"+"ff".repeat(32)};},"NATIVE_SINGLE_KEY_REQUIRED"));
await check("malformed native key",()=>denied((v,u)=>{if(isFund(u))v.key.key="abcd";},"NATIVE_SINGLE_KEY_REQUIRED"));
await check("account identity mismatch",()=>denied((v,u)=>{if(isFund(u))v.account=s.holderAccountId;},"ACCOUNT_STATE_UNSUPPORTED"));
await check("deleted funding account",()=>denied((v,u)=>{if(isFund(u))v.deleted=true;},"ACCOUNT_STATE_UNSUPPORTED"));
await check("holder receiver signature requires unsupported signer",()=>denied((v,u)=>{if(u.pathname===`/api/v1/accounts/${s.holderAccountId}`)v.receiver_sig_required=true;},"ADDITIONAL_HOLDER_SIGNATURE_REQUIRED"));
for(const [name,mutate,code] of [
 ["missing association",v=>{v.tokens=[];},"TOKEN_ASSOCIATION_MISSING"],
 ["insufficient funding",v=>{v.tokens[0].balance=44999999;},"INSUFFICIENT_OBSERVED_BALANCE"],
 ["unsafe integer balance",v=>{v.tokens[0].balance=Number.MAX_SAFE_INTEGER+1;},"UNSAFE_INTEGER"],
 ["frozen relationship",v=>{v.tokens[0].freeze_status="FROZEN";},"TOKEN_RELATIONSHIP_UNUSABLE"],
 ["revoked KYC",v=>{v.tokens[0].kyc_status="REVOKED";},"TOKEN_RELATIONSHIP_UNUSABLE"],
 ["unknown KYC",v=>{delete v.tokens[0].kyc_status;},"TOKEN_RELATIONSHIP_UNUSABLE"],
 ["wrong decimals",v=>{v.tokens[0].decimals=8;},"TOKEN_RELATIONSHIP_UNUSABLE"],
 ["wrong association token",v=>{v.tokens[0].token_id=s.bookingTokenId;},"TOKEN_RELATIONSHIP_UNUSABLE"],
 ["duplicate association",v=>{v.tokens.push(v.tokens[0]);},"INCOMPLETE_EXACT_QUERY"],
 ["cross-origin continuation",v=>{v.links.next="https://example.com/credentials";},"INCOMPLETE_EXACT_QUERY"],
 ["same-origin widened continuation",v=>{v.links.next=`/api/v1/accounts/${s.fundingAccountId}/tokens?token.id=gt:0.0.1`;},"INCOMPLETE_EXACT_QUERY"],
 ["missing pagination terminal",v=>{delete v.links;},"MALFORMED_RESPONSE"],
]) await check(name,()=>denied((v,u)=>{if(u.pathname===`/api/v1/accounts/${s.fundingAccountId}/tokens`&&u.searchParams.get("token.id")===s.settlementTokenId)mutate(v);},code));
await check("explicit unfrozen KYC granted accepted with token keys",async()=>{
 const m=mock((v,u)=>{if(u.pathname===`/api/v1/tokens/${s.settlementTokenId}`){v.freeze_key=key;v.kyc_key=key;}if(u.pathname.endsWith("/tokens")&&u.searchParams.get("token.id")===s.settlementTokenId){v.tokens[0].freeze_status="UNFROZEN";v.tokens[0].kyc_status="GRANTED";}});
 await readCurrentRecoveryChain(s,{fetch:m.fetch,now:()=>NOW});
});
await check("approved for all denies even with exact serial spender",()=>denied((v,u)=>{if(u.pathname.endsWith("/allowances/nfts"))v.allowances=[{owner:s.holderAccountId,spender:s.executorAccountId,token_id:s.bookingTokenId,approved_for_all:true,timestamp:{from:STAMP,to:null}}];},"BROAD_OR_UNSUPPORTED_NFT_ALLOWANCE"));
await check("allowance query role mismatch",()=>denied((v,u)=>{if(u.pathname.endsWith("/allowances/nfts"))v.allowances=[{owner:s.fundingAccountId,spender:s.executorAccountId,token_id:s.bookingTokenId,approved_for_all:false,timestamp:{from:STAMP,to:null}}];},"BROAD_OR_UNSUPPORTED_NFT_ALLOWANCE"));
for(const [name,mutate,code] of [
 ["mutable fees",v=>{v.fee_schedule_key=key;},"MUTABLE_FEE_SCHEDULE"],
 ["missing complete fees",v=>{delete v.custom_fees;},"MALFORMED_RESPONSE"],
 ["unknown custom fee family",v=>{v.custom_fees.extra_fees=[];},"UNSUPPORTED_FEE_METADATA"],
 ["nonempty fixed fee",v=>{v.custom_fees.fixed_fees=[{}];},"UNSUPPORTED_FIXED_FEES"],
 ["nonempty fractional fee",v=>{v.custom_fees.fractional_fees=[{}];},"UNSUPPORTED_FRACTIONAL_FEES"],
 ["missing royalty array",v=>{delete v.custom_fees.royalty_fees;},"UNSUPPORTED_ROYALTY_FEES"],
 ["deleted token",v=>{v.deleted=true;},"TOKEN_STATE_UNSUPPORTED"],
 ["paused token",v=>{v.pause_status="PAUSED";},"TOKEN_STATE_UNSUPPORTED"],
 ["wrong token",v=>{v.token_id="0.0.999";},"TOKEN_STATE_UNSUPPORTED"],
 ["missing freeze metadata",v=>{delete v.freeze_key;},"MALFORMED_RESPONSE"],
]) await check(name,()=>denied((v,u)=>{if(isBooking(u))mutate(v);},code));
await check("royalty fallback denied",()=>denied((v,u)=>{if(isBooking(u))v.custom_fees.royalty_fees=[{amount:{numerator:1,denominator:10},collector_account_id:"0.0.7009",all_collectors_are_exempt:false,fallback_fee:{amount:1}}];},"UNSUPPORTED_ROYALTY_FEES"));
await check("unofficial USDC rejects before any GET",async()=>{const m=mock();await assert.rejects(readCurrentRecoveryChain({...s,settlementTokenId:"0.0.999"},{fetch:m.fetch,now:()=>NOW}),/UNSUPPORTED_ROLE_SELECTION/);assert.equal(m.calls.length,0);});
await check("third party funding rejected",()=>denied(()=>{},"UNSUPPORTED_ROLE_SELECTION",{...s,receiverAccountId:"0.0.7999"}));
await check("unsafe serial rejected",()=>denied(()=>{},"UNSUPPORTED_ROLE_SELECTION",{...s,serial:Number.MAX_SAFE_INTEGER+1}));
await check("stale indexed watermark",()=>denied((v,u)=>{if(u.pathname==="/api/v1/transactions")v.transactions[0].consensus_timestamp="1699999900.000000000";},"INDEX_WATERMARK_STALE"));
await check("future indexed watermark",()=>denied((v,u)=>{if(u.pathname==="/api/v1/transactions")v.transactions[0].consensus_timestamp="1700000001.000000000";},"INDEX_WATERMARK_STALE"));
await check("regressed indexed watermark",()=>denied((v,u,n)=>{if(u.pathname==="/api/v1/transactions"&&n===2)v.transactions[0].consensus_timestamp="1699999998.000000000";},"INDEX_WATERMARK_REGRESSED"));
await check("read window expiry",async()=>{let tick=0;await denied(()=>{},"READ_WINDOW_EXPIRED",s,{now:()=>NOW+tick++*1000});});
await check("HTTP error unavailable",async()=>{const m=mock(()=>{},()=>new Response("{}",{status:503}));await assert.rejects(readCurrentRecoveryChain(s,{fetch:m.fetch,now:()=>NOW}),/MIRROR_RESPONSE_INVALID/);});
await check("redirected response denied",async()=>{const m=mock(()=>{},()=>{const r=response({});Object.defineProperty(r,"url",{value:"https://example.com/"});return r;});await assert.rejects(readCurrentRecoveryChain(s,{fetch:m.fetch,now:()=>NOW}),/MIRROR_RESPONSE_INVALID/);});
await check("stream body byte limit",async()=>{const m=mock(()=>{},()=>new Response(" ".repeat(131073),{headers:{"content-type":"application/json"}}));await assert.rejects(readCurrentRecoveryChain(s,{fetch:m.fetch,now:()=>NOW}),/MIRROR_BODY_TOO_LARGE/);});
await check("invalid JSON",async()=>{const m=mock(()=>{},()=>new Response("not json",{headers:{"content-type":"application/json"}}));await assert.rejects(readCurrentRecoveryChain(s,{fetch:m.fetch,now:()=>NOW}),/MIRROR_UNAVAILABLE_OR_MALFORMED/);});
await check("fetch timeout even when transport ignores abort",async()=>{await assert.rejects(readCurrentRecoveryChain(s,{fetch:async()=>new Promise(()=>{}),now:()=>NOW}),/MIRROR_TIMEOUT/);});
console.log(JSON.stringify({kind:"MOCK_PUBLIC_GETS_ONLY",passed:pass,liveTransactions:false,canonicalResolver:false}));
