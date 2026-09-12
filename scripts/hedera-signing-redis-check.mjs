import assert from "node:assert/strict";
import { resolveRecoveryRoyalty } from "../lib/hedera-agent-kit/recovery-royalty.ts";
import { createServer } from "node:http";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { PrivateKey, Transaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedUsdcRecovery } from "../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import { buildExactPaymentProposal, paymentCommitmentMemo, RedisPaymentOperationStore, PAYMENT_RESERVATION_LUA } from "../lib/hedera-agent-kit/exact-payment-authorization.ts";

import { validateExternalRecoverySigning, RedisPaymentTombstoneReader, PAYMENT_TOMBSTONES_MATCH_LUA } from "../lib/hedera-agent-kit/external-signing-validation.ts";

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
      assert.ok([PAYMENT_RESERVATION_LUA,PAYMENT_TOMBSTONES_MATCH_LUA].includes(command[1]));
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


const executor=PrivateKey.fromStringED25519("33".repeat(32));
const checks=[];
async function test(name,fn){await fn();checks.push(name);console.log("PASS "+name);}
let sequence=0;
async function setup(){
 const state=fixture();const suffix=String(++sequence);state.commitment.operationId+=suffix;state.invocation.nonce=state.commitment.operationId;state.commitment.commitmentId+=suffix;
 const auth=await authorize(state);
 const prepared=await preparePolicyAuthorizedUsdcRecovery({operationId:state.commitment.operationId,paymentAuthorization:auth,resolveState:async()=>state,now:()=>NOW});
 assert.equal(prepared.ok,true,JSON.stringify(prepared));
 const current={state,executor:{accountId:ids.agent,publicKey:executor.publicKey.toString(),resolvedAtMs:NOW}};
 const args={phase:"BEFORE_SIGN",operationId:state.commitment.operationId,transactionBytesBase64:prepared.envelope.bytesBase64,paymentAuthorization:auth,resolveCurrent:async()=>current,now:()=>NOW};
 const keys=[`ethonline:hedera:payment:v1:operation:${state.commitment.operationId}`,`ethonline:hedera:payment:v1:commitment:${state.commitment.commitmentId}`,`ethonline:hedera:booking-right:${encodeURIComponent(state.delegation.delegationId)}:RECOVER:${encodeURIComponent(state.invocation.nonce)}`];
 return {state,args,keys};
}
function deny(r){assert.equal(r.ok,false,JSON.stringify(r));assert.equal("transactionBytesBase64" in r,false);}
try {
 await test("default real Redis validates existing exact tombstones before/after external synthetic signing",async()=>{
  const x=await setup();const before=await validateExternalRecoverySigning(x.args);assert.equal(before.ok,true,JSON.stringify(before));
  const tx=Transaction.fromBytes(Buffer.from(before.transactionBytesBase64,"base64"));await tx.sign(executor);
  const after=await validateExternalRecoverySigning({...x.args,phase:"BEFORE_SUBMIT",transactionBytesBase64:Buffer.from(tx.toBytes()).toString("base64")});assert.equal(after.ok,true,JSON.stringify(after));
  for(const key of x.keys){assert.equal(await redisCommand(["GET",key]),paymentCommitmentMemo(x.state.commitment));assert.equal(await redisCommand(["TTL",key]),-1);}
 });
 for(const alteration of ["missing","conflict"])for(let i=0;i<3;i++)await test(alteration+" existing tombstone "+i+" fails without repair",async()=>{
  const x=await setup();if(alteration==="missing")await redisCommand(["DEL",x.keys[i]]);else await redisCommand(["SET",x.keys[i],"other"]);
  deny(await validateExternalRecoverySigning(x.args));assert.equal(await redisCommand(["GET",x.keys[i]]),alteration==="missing"?null:"other");
 });
 await test("concurrent repeated validations do not grant execution permits or change persistent tombstones",async()=>{
  const x=await setup();const results=await Promise.all(Array.from({length:16},()=>validateExternalRecoverySigning(x.args)));
  for(const r of results){assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.executionPermit,false);}
  for(const key of x.keys){assert.equal(await redisCommand(["GET",key]),paymentCommitmentMemo(x.state.commitment));assert.equal(await redisCommand(["TTL",key]),-1);}
 });
 await test("observed revocation after real tombstone read blocks output",async()=>{
  const x=await setup();afterEval=()=>{x.state.delegation.revokedAtMs=NOW;};deny(await validateExternalRecoverySigning(x.args));afterEval=()=>{};
 });
 await test("tombstone deleted between real read passes blocks and is not restored",async()=>{
  const x=await setup();let reads=0;x.args.resolveCurrent=async()=>{if(++reads===3)await redisCommand(["DEL",x.keys[0]]);return {state:x.state,executor:{accountId:ids.agent,publicKey:executor.publicKey.toString(),resolvedAtMs:NOW}};};
  deny(await validateExternalRecoverySigning(x.args));assert.equal(await redisCommand(["GET",x.keys[0]]),null);
 });
 for(const failure of ["error","undefined","unexpected"])await test("default adapter "+failure+" fails closed",async()=>{const x=await setup();mode=failure;deny(await validateExternalRecoverySigning(x.args));mode="normal";});
 writeFileSync("hedera-signing-redis-evidence.json",JSON.stringify({sourceSha:process.env.YT_SOURCE_SHA,status:"PASS",evidenceClass:"CI/LOCAL_REAL_REDIS_SYNTHETIC",redisVersion,checks:checks.length,evalCount,cases:checks,realCredentialsLoaded:false,liveTransactionsSigned:0,submitted:0},null,2));
 console.log(JSON.stringify({status:"PASS",checks:checks.length,evalCount,redisVersion}));
} finally {
 afterEval=()=>{};mode="normal";for(const key of keysWritten)await redisCommand(["DEL",key]);await new Promise(resolve=>server.close(resolve));
}
