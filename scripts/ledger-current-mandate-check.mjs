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
const checks=[];
async function check(name,fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }

let first, second, activeFirst, activeSecond;
await check("distinct prepared IDs race to exactly one current mandate",async()=>{
  const a=make(),b=make();await prepare(a);await prepare(b);
  const race=await Promise.allSettled([activate(a),activate(b)]);
  assert.equal(race.filter(r=>r.status==="fulfilled").length,1);
  const winner=race[0].status==="fulfilled"?0:1;first=[a,b][winner];activeFirst=race[winner].value;
  assert.equal((await load(first)).record.currentGeneration,1);
  await assert.rejects(load([a,b][1-winner]));
});
await check("preparation and rejected signature preserve active 40",async()=>{
  second=make({minimumRecoveryAtomicUnits:BigInt(30_000_000)});const before=await store.get(currentMandateKey(first.bookingTokenId,serial));await prepare(second);
  await assert.rejects(activate(second,{signature:"0x00"}));
  assert.equal(await store.get(currentMandateKey(first.bookingTokenId,serial)),before);
  assert.equal((await load(first)).mandate.minimumRecoveryAtomicUnits,BigInt(40_000_000));
});
await check("approved replacement makes only exact 30 current",async()=>{
  activeSecond=await activate(second); assert.equal((await load(second)).mandate.minimumRecoveryAtomicUnits,BigInt(30_000_000));
  await assert.rejects(load(first),/unique current/);assert.equal(activeSecond.active.currentGeneration,2);
});
await check("stale ID and wrong owner cannot revoke replacement",async()=>{
  await assert.rejects(revoke(first,activeFirst.verified.digest));
  await assert.rejects(revoke(second,activeSecond.verified.digest,{ownerId:"other"}));await load(second);
});
let pending;
await check("revocation invalidates current and pending predecessor",async()=>{
  pending=make();await prepare(pending);
  const before=await revoke(second,activeSecond.verified.digest);const twice=await revoke(second,activeSecond.verified.digest);assert.deepEqual(twice,before);
  await assert.rejects(load(second),/unique current/);await assert.rejects(activate(pending),/changed since preparation/);
});
await check("replacement or revocation racing guarded load is rejected",async()=>{
  const next=make();await prepare(next);const active=await activate(next);
  await assert.rejects(load(next,{revalidateMutableAuthority:()=>revoke(next,active.verified.digest)}),/unique current/);
});
await check("same serial in another token has an independent pointer",async()=>{
  const other=make({bookingTokenId:"0.0.700002"});await prepare(other);await activate(other);await load(other);
  assert.equal((await readCurrentMandate(store,first.bookingTokenId,serial)).state,"revoked");
});
await check("legacy preparation without predecessor is rejected",async()=>{
  const m=make();await prepare(m);const key=preparedRecoveryMandateKey(m.mandateId);const record=JSON.parse(await store.get(key));delete record.expectedCurrentMandate;await store.set(key,JSON.stringify(record));await assert.rejects(activate(m),/predecessor metadata/);
});
await check("current tombstone is persistent; malformed pointers fail closed",async()=>{
  const key=currentMandateKey(first.bookingTokenId,serial);assert.equal(await command(["TTL",key]),-1);
  const m=make({bookingTokenId:"0.0.700003"});await store.set(currentMandateKey(m.bookingTokenId,serial),"{}");await assert.rejects(prepare(m),/Invalid current/);
});
await check("unexpected EVAL results never report activation success",async()=>{
  for (const bad of [null,undefined,"1",[1],{},false]) await assert.rejects(swapCurrentMandate({store:{...store,eval:async()=>bad},token:"0.0.700004",serial,expectedVersion:0,predecessor:null,next:{schemaVersion:1,generation:1,state:"active",ownerId:owner,mandateId:"fake",digest:"0x"+"22".repeat(32)},activeKey:"unused",activeValue:"unused",ttlSeconds:60}));
});
console.log(JSON.stringify({schemaVersion:1,evidenceClass:"CI_LOCAL_REAL_REDIS",redisVersion,checks:checks.length,evalCount,device:false,appRoute:false,chainTransaction:false}));
