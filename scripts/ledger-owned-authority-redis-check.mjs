// Credential-free qualification against disposable loopback Redis. Synthetic
// public test key, local EIP-712 only: no device, app route or chain operation.
import { writeFileSync } from "node:fs";
import { loadRecoveryOperationAuthority } from "../lib/ledger/recovery-operation-authority.ts";
import { claimRecoveryOperation, beginRecoveryOperationEffect, recordRecoveryOperationEnvelope, completeRecoveryOperation } from "../lib/ledger/recovery-mandate-operation.ts";
import assert from "node:assert/strict";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { Wallet } from "ethers";
import { buildRecoveryMandateTypedData } from "../lib/ledger/recovery-mandate.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";
import { storePreparedRecoveryMandate, activatePreparedRecoveryMandate, loadActiveRecoveryMandate, preparedRecoveryMandateKey } from "../lib/ledger/recovery-mandate-state.ts";
import { currentMandateKey, readCurrentMandate, revokeCurrentMandate, swapCurrentMandate } from "../lib/ledger/recovery-mandate-current.ts";

const port = Number(process.env.LEDGER_TEST_REDIS_PORT ?? 6379);
assert(Number.isInteger(port) && port > 0 && port < 65536);
let evalCount = 0;
function command(args) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let buffer = Buffer.alloc(0);
    const done = (error, value) => { socket.destroy(); error ? reject(error) : resolve(value); };
    socket.setTimeout(5000, () => done(new Error("Disposable Redis timeout")));
    socket.on("error", reject);
    socket.on("connect", () => socket.write(`*${args.length}\r\n` + args.map(v => { const s=String(v); return `$${Buffer.byteLength(s)}\r\n${s}\r\n`; }).join("")));
    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]); const end = buffer.indexOf("\r\n"); if (end < 0) return;
      const body = buffer.subarray(1, end).toString(), type = buffer[0];
      if (type === 45) return done(new Error(body));
      if (type === 43) return done(null, body);
      if (type === 58) return done(null, Number(body));
      if (type === 36) { const size = Number(body); if (size === -1) return done(null, null); if (buffer.length >= end+size+4) return done(null, buffer.subarray(end+2, end+2+size).toString()); }
    });
  });
}
assert.equal(await command(["PING"]), "PONG");
const redisVersion = (await command(["INFO", "server"])).match(/redis_version:([^\r\n]+)/)?.[1];
const store = {
  get: key => command(["GET",key]),
  set: (key,value,o={}) => command(["SET",key,value,...(o.nx?["NX"]:[]),...(o.ex?["EX",o.ex]:[])]),
  eval: (script,keys,args) => { evalCount++; return command(["EVAL",script,keys.length,...keys,...args]); },
};
const run = randomUUID(), owner = `fixture-${run}`;
const wallet = new Wallet("0x" + "11".repeat(32));
const now = BigInt(Math.floor(Date.now()/1000));
const serial = BigInt(Number.parseInt(run.replaceAll("-","").slice(0,10),16));
let index = 0;
const make = (overrides={}) => ({ mandateId:`${run}-${++index}`, nonce:`${run}-nonce-${index}`, ownerId:owner,
  ledgerSignerAddress:wallet.address, agentId:"yourturn-concierge", bookingTokenId:"0.0.700001", bookingSerial:serial,
  allowedAction:"resale", minimumRecoveryAtomicUnits:BigInt(40_000_000), settlementAsset:"0.0.429274",
  expiresAt:now+BigInt(3600), issuedAt:now-BigInt(5), cancellationAllowed:false,...overrides });
const prepare = m => storePreparedRecoveryMandate({store,mandate:m,ownerId:owner});
async function activate(m, options={}) {
  const typed = buildRecoveryMandateTypedData(m);
  const signature = await wallet.signTypedData(typed.domain,typed.types,typed.value);
  return activatePreparedRecoveryMandate({store,authorityBoundaryStore:store,replayStore:createRedisRecoveryMandateReplayStore(store),
    mandateId:m.mandateId,ownerId:owner,signature,revalidateMutableAuthority:async()=>{},...options});
}
const load = (m,extra={}) => loadActiveRecoveryMandate({store,authorityBoundaryStore:store,mandateId:m.mandateId,ownerId:owner,revalidateMutableAuthority:async()=>{},...extra});
const revoke = (m,digest,extra={}) => revokeCurrentMandate({store,token:m.bookingTokenId,serial:m.bookingSerial,ownerId:owner,mandateId:m.mandateId,digest,...extra});
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log("PASS "+name);}
const intentHash="ab".repeat(32);
const m=make();await prepare(m);const active=await activate(m);
const authority={store,authorityBoundaryStore:store,mandateId:m.mandateId,ownerId:owner,revalidateMutableAuthority:async()=>{}};
let op;
await check("real activated mandate claim owns odd version; read-only loader checks it",async()=>{
 const claim=await claimRecoveryOperation({authority,operationId:run+"-operation",intentHash,resolveIntent:async()=>({intentHash,agentId:m.agentId,action:"resale"})});assert.equal(claim.claimed,true);op=claim.record;
 const before=evalCount;const result=await loadRecoveryOperationAuthority({store,operation:op,revalidateMutableAuthority:async()=>{}});assert.equal(result.executionPermit,false);assert.equal(result.mandate.minimumRecoveryAtomicUnits,BigInt(40000000));assert.equal(evalCount,before);await assert.rejects(load(m));
});
await check("actual begin-effect transition can consume owned authority check once",async()=>{
 const previous=op;op=await beginRecoveryOperationEffect(store,op,async current=>{const r=await loadRecoveryOperationAuthority({store,operation:current,revalidateMutableAuthority:async()=>{}});assert.equal(r.executionPermit,false);return intentHash;});
 assert.equal(op.phase,"effect-started");await assert.rejects(loadRecoveryOperationAuthority({store,operation:previous,revalidateMutableAuthority:async()=>{}}));await assert.rejects(beginRecoveryOperationEffect(store,op,async()=>intentHash));
});
await check("effect-started read does not reissue permit or change Redis",async()=>{
 const before=evalCount;const r=await loadRecoveryOperationAuthority({store,operation:op,revalidateMutableAuthority:async()=>{}});assert.equal(r.executionPermit,false);assert.equal(evalCount,before);
});
await check("revocation during current mutable read denies owned authority",async()=>{
 await assert.rejects(loadRecoveryOperationAuthority({store,operation:op,revalidateMutableAuthority:async()=>{await revoke(m,active.verified.digest);}}));
});
await check("receipt-only completion remains available after revocation without authority",async()=>{
 op=await recordRecoveryOperationEnvelope(store,op,"synthetic-tx-"+run,"cd".repeat(32));
 op=await completeRecoveryOperation(store,op,async current=>({transactionId:current.transactionId,receiptDigest:"ef".repeat(32)}));assert.equal(op.phase,"completed");
 await assert.rejects(loadRecoveryOperationAuthority({store,operation:op,revalidateMutableAuthority:async()=>{}}));
});
writeFileSync("ledger-owned-authority-evidence.json",JSON.stringify({sourceSha:process.env.YT_SOURCE_SHA,status:"PASS",evidenceClass:"CI_DISPOSABLE_REAL_REDIS_SYNTHETIC",redisVersion,checks:checks.length,evalCount,cases:checks,realCredentialsLoaded:false,deviceUsed:false,chainTransactions:0},null,2));
console.log(JSON.stringify({status:"PASS",checks:checks.length,evalCount,redisVersion}));
