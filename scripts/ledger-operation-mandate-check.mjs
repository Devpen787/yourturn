// Credential-free qualification against disposable loopback Redis. Synthetic
// public test key, local EIP-712 only: no device, app route or chain operation.
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
const op = await import('../lib/ledger/recovery-mandate-operation.ts');
const intentHash='aa'.repeat(32);
let operationIndex=0;
const claim=(m,extra={})=>op.claimRecoveryOperation({authority:{store,authorityBoundaryStore:store,mandateId:m.mandateId,ownerId:owner,revalidateMutableAuthority:async()=>{}},operationId:`${run}-op-${++operationIndex}`,intentHash,resolveIntent:async()=>({intentHash,agentId:m.agentId,action:'resale'}),...extra});
async function active(){const m=make({bookingSerial:serial+BigInt(++index)});await prepare(m);await activate(m);return m;}
const checks=[];
async function check(name,fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }


await check("claim race serializes distinct operations and exact duplicate returns no new claim",async()=>{
 const m=await active();const operationId=`${run}-same`;const race=await Promise.allSettled([claim(m,{operationId}),claim(m,{operationId})]);
 assert.equal(race.filter(r=>r.status==='fulfilled'&&r.value.claimed).length,1);
 const winner=race.find(r=>r.status==='fulfilled'&&r.value.claimed).value.record;
 const replay=await claim(m,{operationId});assert.equal(replay.claimed,false);assert.deepEqual(replay.record,winner);
 await assert.rejects(claim(m));await assert.rejects(claim(m,{operationId,intentHash:'bb'.repeat(32)}));
 await assert.rejects(op.readRecoveryOperation({store,operationId,ownerId:'other',intentHash}));
 await op.abandonUnstartedRecoveryOperation(store,winner);
});
await check("changed current authority or resolved intent cannot claim",async()=>{
 const m=await active();const current=await readCurrentMandate(store,m.bookingTokenId,m.bookingSerial);
 await assert.rejects(claim(m,{resolveIntent:async()=>({intentHash,agentId:'wrong-agent',action:'resale'})}));
 await assert.rejects(claim(m,{resolveIntent:async()=>{await revoke(m,current.digest);return {intentHash,agentId:m.agentId,action:'resale'};}}));
});
await check("one effect permit; unknown result remains fenced and cannot regenerate bytes",async()=>{
 const m=await active();const {record}=await claim(m);
 const race=await Promise.allSettled([op.beginRecoveryOperationEffect(store,record,async()=>intentHash),op.beginRecoveryOperationEffect(store,record,async()=>intentHash)]);
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);const started=race.find(r=>r.status==='fulfilled').value;
 await assert.rejects(op.beginRecoveryOperationEffect(store,started,async()=>intentHash));
 await assert.rejects(op.abandonUnstartedRecoveryOperation(store,started));
 await assert.rejects(op.completeRecoveryOperation(store,started,async()=>({transactionId:'invented',receiptDigest:'cc'.repeat(32)})));
 await assert.rejects(load(m));assert.equal(await store.get(`bookedrights:ledger:authority-version:${m.bookingSerial}`),String(started.ownedVersion));
});
await check("revoke before effect prevents execution but permits no-effect termination",async()=>{
 const m=await active();const {record}=await claim(m);const current=await readCurrentMandate(store,m.bookingTokenId,m.bookingSerial);await revoke(m,current.digest);
 await assert.rejects(op.beginRecoveryOperationEffect(store,record,async()=>intentHash));
 const ended=await op.abandonUnstartedRecoveryOperation(store,record);assert.equal(ended.phase,'no-effect');
});
await check("immutable envelope and receipt remain bound through revocation and completed replay",async()=>{
 const m=await active();const {record}=await claim(m);const started=await op.beginRecoveryOperationEffect(store,record,async()=>intentHash);
 const output=await op.recordRecoveryOperationEnvelope(store,started,'fixture-tx-1','bb'.repeat(32));
 await assert.rejects(op.recordRecoveryOperationEnvelope(store,output,'fixture-tx-2','cc'.repeat(32)));
 await assert.rejects(op.completeRecoveryOperation(store,output,async()=>({transactionId:'other',receiptDigest:'dd'.repeat(32)})));
 const current=await readCurrentMandate(store,m.bookingTokenId,m.bookingSerial);await revoke(m,current.digest);
 const done=await op.completeRecoveryOperation(store,output,async()=>({transactionId:output.transactionId,receiptDigest:'dd'.repeat(32)}));
 assert.equal(done.phase,'completed');assert.equal(await store.get(`bookedrights:ledger:authority-version:${m.bookingSerial}`),String(done.ownedVersion+1));
 const replay=await claim(m,{operationId:done.operationId});assert.equal(replay.claimed,false);assert.deepEqual(replay.record,done);
 await assert.rejects(op.beginRecoveryOperationEffect(store,done,async()=>intentHash));
});
await check("changed intent at effect boundary and unexpected Redis results fail closed",async()=>{
 const m=await active();const {record}=await claim(m);
 await assert.rejects(op.beginRecoveryOperationEffect(store,record,async()=>'ff'.repeat(32)));
 for(const bad of [null,undefined,'1',{},[1],false])await assert.rejects(op.beginRecoveryOperationEffect({...store,eval:async()=>bad},record,async()=>intentHash));
 await op.abandonUnstartedRecoveryOperation(store,record);
});
await check("actual lease expiry fences stale worker; takeover cannot repeat started effect",async()=>{
 const revoked=await active();const unstarted=(await claim(revoked)).record;
 const pointer=await readCurrentMandate(store,revoked.bookingTokenId,revoked.bookingSerial);await revoke(revoked,pointer.digest);
 const m=await active();const {record}=await claim(m);const started=await op.beginRecoveryOperationEffect(store,record,async()=>intentHash);
 await assert.rejects(op.takeOverRecoveryOperation(store,started));
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,started.leaseUntil*1000-Date.now()+100)));
 const ended=await op.abandonUnstartedRecoveryOperation(store,unstarted);assert.equal(ended.phase,'no-effect');
 assert.equal(await store.get(`bookedrights:ledger:authority-version:${revoked.bookingSerial}`),String(unstarted.ownedVersion+1));
 await assert.rejects(op.beginRecoveryOperationEffect(store,unstarted,async()=>intentHash));
 await assert.rejects(op.recordRecoveryOperationEnvelope(store,started,'stale-tx','bb'.repeat(32)));
 const resumed=await op.takeOverRecoveryOperation(store,started);assert.notEqual(resumed.fence,started.fence);
 await assert.rejects(op.beginRecoveryOperationEffect(store,resumed,async()=>intentHash));
 await assert.rejects(op.recordRecoveryOperationEnvelope(store,started,'stale-tx','bb'.repeat(32)));
 const output=await op.recordRecoveryOperationEnvelope(store,resumed,'same-original-tx','bb'.repeat(32));
 await op.completeRecoveryOperation(store,output,async()=>({transactionId:output.transactionId,receiptDigest:'cc'.repeat(32)}));
});
console.log(JSON.stringify({schemaVersion:1,evidenceClass:'CI_LOCAL_REAL_REDIS',redisVersion,checks:checks.length,evalCount,device:false,appRoute:false,chainTransaction:false}));
