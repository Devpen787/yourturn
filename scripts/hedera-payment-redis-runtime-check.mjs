import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { PrivateKey } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedUsdcRecovery } from "../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import { buildExactPaymentProposal, RedisPaymentOperationStore, PAYMENT_RESERVATION_LUA } from "../lib/hedera-agent-kit/exact-payment-authorization.ts";

// Never inherit real service credentials. Run under env -i as in the workflow.
// This process configures ONLY its own loopback test transport with a public marker.
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
const redisPort = Number(process.env.YT_TEST_REDIS_PORT ?? 16379);
assert.ok(Number.isInteger(redisPort) && redisPort > 1024 && redisPort < 65536);
const prefix = `yt-runtime-test:${randomUUID()}:`;
let evalCount = 0;
let mode = "normal";
let afterEval = () => {};
const keysWritten = new Set();

// Tiny RESP transport to a REAL disposable Redis process. It never emulates Lua.
function redisCommand(command) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({host:"127.0.0.1", port:redisPort});
    let buffer = Buffer.alloc(0);
    const finish = (error, value) => { socket.destroy(); error ? reject(error) : resolve(value); };
    socket.setTimeout(4000, () => finish(new Error("test Redis timeout")));
    socket.on("error", reject);
    socket.on("connect", () => socket.write(`*${command.length}\r\n` + command.map(v => {
      const str = String(v); return `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
    }).join("")));
    socket.on("data", data => {
      buffer = Buffer.concat([buffer,data]);
      const end = buffer.indexOf("\r\n"); if (end < 0) return;
      const type = String.fromCharCode(buffer[0]); const body = buffer.subarray(1,end).toString();
      if (type === "-") return finish(new Error(body));
      if (type === "+") return finish(null,body);
      if (type === ":") return finish(null,Number(body));
      if (type === "$") {
        const size=Number(body); if (size === -1) return finish(null,null);
        if (buffer.length >= end+2+size+2) return finish(null,buffer.subarray(end+2,end+2+size).toString());
      }
    });
  });
}
assert.equal(await redisCommand(["PING"]),"PONG");
const redisVersion = (await redisCommand(["INFO","server"])).match(/redis_version:([^\r\n]+)/)?.[1];
assert.ok(redisVersion);

// Loopback adapter reproduces only Upstash's wire protocol. Real @upstash/redis,
// getRedis, RedisPaymentOperationStore and exact production Lua remain unchanged.
const server=createServer(async (req,res) => {
  try {
    assert.equal(req.headers.authorization,"Bearer public-loopback-test-marker");
    let raw=""; for await (const part of req) raw += part;
    const body=JSON.parse(raw); const pipeline=req.url === "/pipeline";
    const commands=pipeline ? body : [body]; const responses=[];
    for (const command of commands) {
      assert.equal(String(command[0]).toUpperCase(),"EVAL");
      assert.equal(command[1],PAYMENT_RESERVATION_LUA);
      assert.equal(command[2],3);
      for (const key of command.slice(3,6)) {
        assert.ok(decodeURIComponent(key).includes(prefix)); keysWritten.add(key);
      }
      if (mode === "disconnect") { req.socket.destroy(); return; }
      if (mode === "error") { responses.push({error:"isolated Redis unavailable"}); continue; }
      if (mode === "undefined") { responses.push({}); continue; }
      if (mode === "unexpected") { responses.push({result:Buffer.from("unexpected").toString("base64")}); continue; }
      const result=await redisCommand(command); evalCount++; afterEval();
      responses.push({result:typeof result === "string" ? Buffer.from(result).toString("base64") : result});
    }
    res.setHeader("Content-Type","application/json"); res.end(JSON.stringify(pipeline ? responses : responses[0]));
  } catch { res.statusCode=500; res.end(JSON.stringify({error:"test transport assertion or Redis failure"})); }
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
process.env.KV_REST_API_URL=`http://127.0.0.1:${server.address().port}`;
process.env.KV_REST_API_TOKEN="public-loopback-test-marker";

// Public deterministic test keys + already-expired 2023 transaction IDs. No live
// account keys, dotenv, operator, query, execute, network funds, or submit.
const bob = PrivateKey.fromStringED25519("11".repeat(32));
const stranger = PrivateKey.fromStringED25519("22".repeat(32));
const NOW = 1700000000000;
const USDC = "0.0.429274";
const ids = { maya: "0.0.7002", bob: "0.0.7003", agent: "0.0.7004", other: "0.0.7005" };
function fixture() {
  return {
    resolvedAtMs: NOW,
    delegation: {
      delegationId: `${prefix}mandate-active-40`, delegatedAgentAccountId: ids.agent, spenderAccountId: ids.agent,
      tokenId: "0.0.7001", serial: 7, holderAccountId: ids.maya,
      allowedActions: ["RECOVER"], minimumRecovery: { asset: { kind: "HTS", tokenId: USDC }, atomicUnits: "40000000" },
      expiresAtMs: NOW + 600000, cancellationAllowed: true, providerPolicyId: "studio-a", revokedAtMs: null,
    },
    invocation: {
      agentAccountId: ids.agent, currentHolderAccountId: ids.maya, action: "RECOVER", nonce: `${prefix}operation-1`,
      providerPolicy: { id: "studio-a", state: "ALLOW" },
      recovery: { asset: { kind: "HTS", tokenId: USDC }, atomicUnits: "45000000" }, receiverAccountId: ids.bob,
    },
    buyerAccountId: ids.bob,
    commitment: {
      domain: "yourturn:hedera:testnet:exact-payment:v1", commitmentId: `${prefix}payment-1`, operationId: `${prefix}operation-1`,
      delegationId: `${prefix}mandate-active-40`, quoteId: "quote-45", quoteHash: "ab".repeat(32),
      providerPolicyId: "studio-a", providerPolicyVersion: "v1", bookingTokenId: "0.0.7001", serial: 7,
      holderAccountId: ids.maya, delegatedAgentAccountId: ids.agent, settlementSourceAccountId: ids.bob,
      receiverAccountId: ids.bob, settlementRecipientAccountId: ids.maya, transactionFeePayerAccountId: ids.agent,
      settlementTokenId: USDC, settlementDecimals: 6, settlementAmountAtomicUnits: "45000000",
      transactionId: `${ids.agent}@1700000000.000000000`, nodeAccountId: "0.0.3", transactionValidDurationSeconds: 120,
      maxTransactionFeeTinybars: "200000000", expiresAtMs: NOW + 120000,
    },
    quote: { id: "quote-45", hash: "ab".repeat(32), expiresAtMs: NOW + 120000 },
    providerPolicy: { id: "studio-a", version: "v1", state: "ALLOW", validUntilMs: NOW + 600000, minimumRecoveryAtomicUnits: null },
    fundingAccount: { accountId: ids.bob, publicKey: bob.publicKey.toString(), tokenId: USDC, decimals: 6, availableAtomicUnits: "45000000" },
    tokens: { booking:{tokenId:"0.0.7001",customFeeCount:0,feeScheduleKey:null}, settlement:{tokenId:USDC,customFeeCount:0,feeScheduleKey:null} },
    bookingAllowance:{tokenId:"0.0.7001",serial:7,ownerAccountId:ids.maya,spenderAccountId:ids.agent,approvedForAll:false},
    paymentRevokedAtMs: null,
  };
}
async function authorize(state, key = bob) {
  let signatureHex;
  await buildExactPaymentProposal(state.commitment).signWith(key.publicKey, async body => {
    signatureHex = Buffer.from(key.sign(body)).toString("hex");
    return Buffer.from(signatureHex, "hex");
  });
  return { signatureHex };
}

const checks=[];
async function test(name,fn) { await fn(); checks.push(name); }
function denied(result,reason) {
  assert.equal(result.ok,false); assert.equal(result.transactionBytesProduced,false);
  assert.equal("envelope" in result,false); assert.equal("paymentAuthorization" in result,false);
  if(reason) assert.equal(result.decision.reason,reason);
}
let sequence=0;
function fresh() {
  const state=fixture(); const suffix=String(++sequence);
  state.commitment.operationId += suffix; state.invocation.nonce=state.commitment.operationId;
  state.commitment.commitmentId += suffix;
  return state;
}
async function run(state,auth,now=()=>NOW) {
  // Crucial: NO operationStore injection. Exercise the production default.
  return preparePolicyAuthorizedUsdcRecovery({operationId:state.commitment.operationId,
    paymentAuthorization:auth ?? await authorize(state),resolveState:async()=>state,now});
}
try {
  await test("real default adapter EVAL returns first bytes, duplicate returns no second bytes",async()=>{
    const s=fresh(), a=await authorize(s); assert.equal((await run(s,a)).ok,true);
    denied(await run(s,a),"IDEMPOTENT_REPLAY");
  });
  await test("reused commitment on new operation fails closed without partial key reservation",async()=>{
    const s=fresh(); assert.equal((await run(s)).ok,true);
    s.commitment.operationId += "new"; s.invocation.nonce=s.commitment.operationId;
    denied(await run(s),"NONCE_CONFLICT");
    assert.equal(await redisCommand(["EXISTS",`ethonline:hedera:payment:v1:operation:${s.commitment.operationId}`]),0);
  });
  await test("new commitment cannot reopen existing operation",async()=>{
    const s=fresh(); assert.equal((await run(s)).ok,true); s.commitment.commitmentId += "new";
    denied(await run(s),"NONCE_CONFLICT");
    assert.equal(await redisCommand(["EXISTS",`ethonline:hedera:payment:v1:commitment:${s.commitment.commitmentId}`]),0);
  });
  await test("16 concurrent duplicate default-adapter calls yield exactly one envelope",async()=>{
    const s=fresh(),a=await authorize(s); const results=await Promise.all(Array.from({length:16},()=>run(s,a)));
    assert.equal(results.filter(r=>r.ok).length,1);
    results.filter(r=>!r.ok).forEach(r=>denied(r,"IDEMPOTENT_REPLAY"));
  });
  for (const failure of ["error","undefined","unexpected","disconnect"]) {
    await test(`REST/Redis ${failure} yields no bytes`,async()=>{
      mode=failure; try { denied(await run(fresh()),"REPLAY_STORE_UNAVAILABLE"); } finally { mode="normal"; }
    });
  }
  await test("expiry during actual Redis reservation yields no bytes; tombstones survive",async()=>{
    const s=fresh(), a=await authorize(s); let now=NOW;
    afterEval=()=>{now=NOW+120001;};
    try { denied(await run(s,a,()=>now),"EXECUTION_STATE_STALE"); } finally { afterEval=()=>{}; }
    denied(await run(s,a),"IDEMPOTENT_REPLAY");
  });
  await test("time-stale resolver after actual reservation yields no bytes",async()=>{
    const s=fresh(),a=await authorize(s);let now=NOW;afterEval=()=>{now=NOW+5001;};
    try {denied(await run(s,a,()=>now),"EXECUTION_STATE_STALE");}finally{afterEval=()=>{};}
    denied(await run(s,a),"IDEMPOTENT_REPLAY");
  });
  await test("all successful durable tombstones have no expiry",async()=>{
    let persistent=0;
    for (const key of keysWritten) { const ttl=await redisCommand(["TTL",key]); assert.ok(ttl === -1 || ttl === -2);if(ttl === -1)persistent++; }
    assert.ok(persistent>=15);
  });
  await test("unconfigured default adapter fails closed",async()=>{
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    denied(await run(fresh()),"REPLAY_STORE_UNAVAILABLE");
  });
  assert.ok(evalCount>=25);
  const evidence={status:"PASS",evidenceClass:"CI/LOCAL_REAL_REDIS_TEST_TRANSPORT",redisVersion,
    adapter:"unchanged default RedisPaymentOperationStore -> getRedis -> @upstash/redis -> actual EVAL",
    transport:"loopback test implementation of Upstash REST wire protocol; not hosted Upstash qualification",
    sourceSha:process.env.YT_SOURCE_SHA??"local-uncommitted",checks:checks.length,assertions:checks,actualEvalCalls:evalCount,
    liveTransactionsSigned:0,liveTransactionsSubmitted:0,realCredentialsLoaded:false,
    limits:["No hosted/deployed Redis credential used","No chain resolver or external signer qualification","No LIVE/TESTNET or integration claim"]};
  writeFileSync("hedera-payment-redis-runtime-evidence.json",JSON.stringify(evidence,null,2)+"\n");
  console.log(JSON.stringify(evidence,null,2));
} finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
