// Dedicated disposable storage only. No credentials, real issuer, HTTP route,
// public chain writes or production Redis. Model mode never claims real EVAL.
import assert from "node:assert/strict";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { publishProviderPolicy, loadPublishedProviderPolicy, publishedProviderPolicyKey } from "../lib/policy/published-provider-policy.ts";
const model = process.argv.includes("--model");
if (!model) assert.equal(process.env.YT_PROVIDER_POLICY_REDIS_TEST,"loopback-disposable");
const port = Number(process.env.YT_PROVIDER_POLICY_REDIS_PORT ?? 16381);
assert(Number.isInteger(port)&&port>1024&&port<65536);
let evalCount=0; const memory=new Map();
function command(args) {
  if(model) {
    const [c,key,value]=args;
    if(c==="GET") return Promise.resolve(memory.get(key)??null);
    if(c==="SET") {memory.set(key,value);return Promise.resolve("OK");}
    if(c==="PTTL") return Promise.resolve(memory.has(key)?-1:-2);
    throw new Error(`unsupported model command ${c}`);
  }
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:"127.0.0.1",port});let buffer=Buffer.alloc(0);
    const done=(error,value)=>{socket.destroy();error?reject(error):resolve(value);};
    socket.setTimeout(5000,()=>done(new Error("Disposable Redis timeout")));socket.on("error",reject);
    socket.on("connect",()=>socket.write(`*${args.length}\r\n`+args.map(v=>{const s=String(v);return `$${Buffer.byteLength(s)}\r\n${s}\r\n`;}).join("")));
    socket.on("data",chunk=>{buffer=Buffer.concat([buffer,chunk]);const end=buffer.indexOf("\r\n");if(end<0)return;
      const body=buffer.subarray(1,end).toString(),type=buffer[0];
      if(type===45)return done(new Error(body));if(type===43)return done(null,body);if(type===58)return done(null,Number(body));
      if(type===36){const size=Number(body);if(size===-1)return done(null,null);if(buffer.length>=end+size+4)return done(null,buffer.subarray(end+2,end+2+size).toString());}
    });
  });
}
if(!model)assert.equal(await command(["PING"]),"PONG");
const redisVersion=model?null:(await command(["INFO","server"])).match(/redis_version:([^\r\n]+)/)?.[1];
const store={get:key=>command(["GET",key]),eval:async(script,keys,args)=>{
 evalCount++;
 if(!model)return command(["EVAL",script,keys.length,...keys,...args]);
 const [version,previous,json,maxValidity]=args;const raw=memory.get(keys[0])??null;
 if(raw!==null){let value;try{value=JSON.parse(raw);}catch{return -1;}try{assert.deepEqual(value,JSON.parse(previous));}catch{return -1;}if(value.version!==version)return -1;}
 else if(version!==0||previous!=="")return -1;
 const next=JSON.parse(json);if(next.version!==version+1)return -2;const now=Date.now();
 if(next.transferCutoffMs<=now||next.validUntilMs<=now||next.validUntilMs-now>maxValidity)return -3;
 next.publishedAtMs=now;const encoded=JSON.stringify(next);memory.set(keys[0],encoded);return encoded;
}};
const run=randomUUID();let sequence=0;
const newScope=()=>({providerId:`provider-${run}-${++sequence}`,tokenId:"0.0.7001",serial:7});
const issuerId=`issuer-${run}`;
const enroll=s=>({...s,issuerId,version:"enrollment-v1"});
const resolveEnrollment=async s=>enroll(s);
const draft=(overrides={})=>({state:"ALLOW",minimumRecoveryAtomicUnits:"40000000",royalty:{numerator:"1",denominator:"10",collectorAccountId:"0.0.7010"},transferCutoffMs:Date.now()+60000,validUntilMs:Date.now()+120000,...overrides});
const publish=(scope,expectedVersion,policy=draft(),extra={})=>publishProviderPolicy({issuerId,scope,expectedVersion,policy,store,resolveEnrollment,...extra});
const load=(scope,extra={})=>loadPublishedProviderPolicy({scope,store,resolveEnrollment,...extra});
const checks=[];async function check(name,fn){await fn();checks.push(name);console.log(`PASS ${name}`);}
const base=newScope();let first;
await check("enrolled initial publish and current exact read",async()=>{first=await publish(base,0);assert.equal(first.version,1);assert.deepEqual(await load(base),first);assert.equal(await command(["PTTL",publishedProviderPolicyKey(base)]),-1);});
await check("unknown provider policy does not fall back",async()=>{await assert.rejects(load(newScope()),/PUBLISHED_POLICY_MISSING/);});
await check("unauthorized issuer preserves current record",async()=>{const before=await store.get(publishedProviderPolicyKey(base));await assert.rejects(publish(base,1,draft(),{issuerId:"stranger"}),/ISSUER_NOT_ENROLLED_OWNER/);assert.equal(await store.get(publishedProviderPolicyKey(base)),before);});
await check("wrong enrollment scope denies",async()=>{await assert.rejects(publish(newScope(),0,draft(),{resolveEnrollment:async s=>({...enroll(s),serial:8})}),/ENROLLMENT_SCOPE_MISMATCH/);});
await check("missing mandatory enrollment denies",async()=>{await assert.rejects(publish(newScope(),0,draft(),{resolveEnrollment:null}),/TRUSTED_ENROLLMENT_REQUIRED/);});
await check("missing enrolled owner denies",async()=>{await assert.rejects(publish(newScope(),0,draft(),{resolveEnrollment:async()=>null}));});
await check("two stale concurrent publishers have one winner",async()=>{const result=await Promise.allSettled([publish(base,1,draft({minimumRecoveryAtomicUnits:"30000000"})),publish(base,1,draft({minimumRecoveryAtomicUnits:"35000000"}))]);assert.equal(result.filter(r=>r.status==="fulfilled").length,1);assert.equal((await load(base)).version,2);});
await check("replayed publish is conflict not another version",async()=>{const before=await store.get(publishedProviderPolicyKey(base));await assert.rejects(publish(base,1),/VERSION_CONFLICT/);assert.equal(await store.get(publishedProviderPolicyKey(base)),before);});
for(const [name,change] of [
 ["negative floor",{minimumRecoveryAtomicUnits:"-1"}],["numeric floor",{minimumRecoveryAtomicUnits:40}],["fractional floor",{minimumRecoveryAtomicUnits:"1.2"}],["leading zero floor",{minimumRecoveryAtomicUnits:"01"}],
 ["int64 overflow floor",{minimumRecoveryAtomicUnits:"9223372036854775808"}],["undefined floor",{minimumRecoveryAtomicUnits:undefined}],
 ["invalid state",{state:"PAUSED"}],["zero denominator",{royalty:{numerator:"1",denominator:"0",collectorAccountId:"0.0.7010"}}],
 ["over 100 percent royalty",{royalty:{numerator:"2",denominator:"1",collectorAccountId:"0.0.7010"}}],
 ["negative royalty",{royalty:{numerator:"-1",denominator:"10",collectorAccountId:"0.0.7010"}}],
 ["numeric royalty",{royalty:{numerator:1,denominator:"10",collectorAccountId:"0.0.7010"}}],
 ["nonzero royalty missing collector",{royalty:{numerator:"1",denominator:"10",collectorAccountId:null}}],
 ["zero royalty with collector",{royalty:{numerator:"0",denominator:"1",collectorAccountId:"0.0.7010"}}],
 ["bad collector",{royalty:{numerator:"1",denominator:"10",collectorAccountId:"0xabc"}}],
 ["fraction overflow",{royalty:{numerator:"1",denominator:"9223372036854775808",collectorAccountId:"0.0.7010"}}],
 ["unsafe cutoff",{transferCutoffMs:Number.MAX_SAFE_INTEGER+1}],["past cutoff",{transferCutoffMs:1}],
 ["expiry precedes cutoff",{validUntilMs:Date.now()+100}],["policy beyond bounded validity",{validUntilMs:Date.now()+367*86400000}],
 ["unexpected draft field",{unreviewedPermission:true}],
])await check(`${name} leaves published facts unchanged`,async()=>{const before=await store.get(publishedProviderPolicyKey(base));await assert.rejects(publish(base,2,draft(change)));assert.equal(await store.get(publishedProviderPolicyKey(base)),before);});
await check("explicit zero fee and explicit null minimum",async()=>{const s=newScope();const r=await publish(s,0,draft({minimumRecoveryAtomicUnits:null,royalty:{numerator:"0",denominator:"1",collectorAccountId:null}}));assert.equal((await load(s)).minimumRecoveryAtomicUnits,null);assert.equal(r.royalty.numerator,"0");});
await check("business owner may publish 100 percent and non-reduced rational",async()=>{const s=newScope();await publish(s,0,draft({royalty:{numerator:"100",denominator:"100",collectorAccountId:"0.0.7010"}}));assert.equal((await load(s)).royalty.numerator,"100");});
await check("explicit BLOCK replaces ALLOW without fallback",async()=>{const r=await publish(base,2,draft({state:"BLOCK"}));assert.equal(r.version,3);assert.equal((await load(base)).state,"BLOCK");});
await check("REVIEW remains REVIEW",async()=>{await publish(base,3,draft({state:"REVIEW"}));assert.equal((await load(base)).state,"REVIEW");});
await check("enrollment changed while reading prevents publish",async()=>{let n=0;const s=newScope();await assert.rejects(publish(s,0,draft(),{resolveEnrollment:async x=>({...enroll(x),version:++n===1?"v1":"v2"})}),/ENROLLMENT_CHANGED/);assert.equal(await store.get(publishedProviderPolicyKey(s)),null);});
await check("existing enrollment cannot silently migrate",async()=>{await assert.rejects(publish(base,4,draft(),{resolveEnrollment:async x=>({...enroll(x),version:"v2"})}),/ENROLLMENT_MISMATCH/);await assert.rejects(load(base,{resolveEnrollment:async x=>({...enroll(x),issuerId:"other-owner"})}),/ENROLLMENT_MISMATCH/);});
await check("load enrollment change across reads denies",async()=>{let n=0;await assert.rejects(load(base,{resolveEnrollment:async x=>({...enroll(x),version:++n===1?"enrollment-v1":"v2"})}),/ENROLLMENT_CHANGED/);});
await check("storage unavailable has no fallback",async()=>{await assert.rejects(load(base,{store:{...store,get:async()=>{throw new Error("unavailable");}}}),/unavailable/);});
await check("corrupt persisted JSON is not overwritten at version zero",async()=>{const s=newScope();await command(["SET",publishedProviderPolicyKey(s),"not-json"]);await assert.rejects(load(s),/CORRUPT/);await assert.rejects(publish(s,0),/CORRUPT/);assert.equal(await store.get(publishedProviderPolicyKey(s)),"not-json");});
await check("scope/enrollment corrupt persisted record denies",async()=>{const s=newScope();const r=await publish(s,0);await command(["SET",publishedProviderPolicyKey(s),JSON.stringify({...r,tokenId:"0.0.999"})]);await assert.rejects(load(s),/ENROLLMENT_CORRUPT/);});
await check("changed published version during double read denies",async()=>{let n=0;await assert.rejects(load(base,{store:{...store,get:async key=>{const raw=await store.get(key);return ++n===2?JSON.stringify({...JSON.parse(raw),state:"ALLOW"}):raw;}}}),/CHANGED_DURING_READ/);});
await check("Redis TIME expiry during dispatch preserves predecessor",async()=>{const before=await store.get(publishedProviderPolicyKey(base));const cutoff=Date.now()+250;await assert.rejects(publish(base,4,draft({transferCutoffMs:cutoff,validUntilMs:cutoff+1000}),{store:{...store,eval:async(...a)=>{await new Promise(r=>setTimeout(r,400));return store.eval(...a);}}}),/EXPIRED_AT_COMMIT/);assert.equal(await store.get(publishedProviderPolicyKey(base)),before);});
await check("expired record retains version and allows explicit successor only",async()=>{const s=newScope(), cutoff=Date.now()+250;await publish(s,0,draft({transferCutoffMs:cutoff,validUntilMs:cutoff+1000}));await new Promise(r=>setTimeout(r,400));await assert.rejects(load(s),/EXPIRED_OR_FUTURE/);assert.equal(await command(["PTTL",publishedProviderPolicyKey(s)]),-1);await assert.rejects(publish(s,0),/VERSION_CONFLICT/);assert.equal((await publish(s,1)).version,2);});
await check("timeout after committed SET reports unknown and replay cannot duplicate",async()=>{const s=newScope();await assert.rejects(publish(s,0,draft(),{store:{...store,eval:async(...a)=>{await store.eval(...a);throw new Error("response lost");}}}),/OUTCOME_UNKNOWN/);assert.equal((await load(s)).version,1);await assert.rejects(publish(s,0),/VERSION_CONFLICT/);});
await check("enrollment changes after commit returns unknown and denies current load",async()=>{const s=newScope();let version="enrollment-v1";const resolveEnrollment=async x=>({...enroll(x),version});await assert.rejects(publish(s,0,draft(),{resolveEnrollment,store:{...store,eval:async(...a)=>{const r=await store.eval(...a);version="v2";return r;}}}),/OUTCOME_UNKNOWN/);await assert.rejects(load(s,{resolveEnrollment}),/ENROLLMENT_MISMATCH/);});
await check("full safe integer serial and version survive Lua serialization",async()=>{const s={...newScope(),serial:Number.MAX_SAFE_INTEGER};const r=await publish(s,0);assert.equal(r.serial,Number.MAX_SAFE_INTEGER);const next={...r,version:Number.MAX_SAFE_INTEGER-3};await command(["SET",publishedProviderPolicyKey(s),JSON.stringify(next)]);const published=await publish(s,next.version);assert.equal(published.version,Number.MAX_SAFE_INTEGER-2);assert.equal((await load(s)).version,Number.MAX_SAFE_INTEGER-2);});
await check("Upstash-style automatic JSON deserialization remains compatible",async()=>{const s=newScope();const auto={...store,get:async key=>{const v=await store.get(key);return v===null?null:JSON.parse(v);},eval:async(...a)=>{const r=await store.eval(...a);return typeof r==="string"?JSON.parse(r):r;}};await publish(s,0,draft(),{store:auto});await publish(s,1,draft({state:"BLOCK"}),{store:auto});assert.equal((await load(s,{store:auto})).state,"BLOCK");});
const evidence={kind:model?"LOCAL_MODEL_ONLY":"DISPOSABLE_REAL_REDIS",sourceSha:process.env.YT_SOURCE_SHA??"uncommitted-local",redisVersion,passed:checks.length,evalCount,checks,productionWrites:false,canonicalResolver:false};
if(!model)writeFileSync("provider-policy-redis-evidence.json",JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence));
