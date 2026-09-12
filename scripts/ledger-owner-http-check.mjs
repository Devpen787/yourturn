import assert from "node:assert/strict";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createRecoveryMandateOwnerHandlers } from "../lib/ledger/recovery-mandate-owner-http.ts";
import { currentMandateKey } from "../lib/ledger/recovery-mandate-current.ts";
const real = process.env.LEDGER_OWNER_REAL_REDIS === "1", port = Number(process.env.LEDGER_TEST_REDIS_PORT ?? 6379);
const touched = new Set();let evalCount=0;const cases=[];
function command(args){return new Promise((resolve,reject)=>{
 const socket=net.createConnection({host:"127.0.0.1",port});let buffer=Buffer.alloc(0);
 const done=(error,value)=>{socket.destroy();error?reject(error):resolve(value);};socket.setTimeout(4000,()=>done(new Error("Redis timeout")));socket.on("error",reject);
 socket.on("connect",()=>socket.write(`*${args.length}\r\n`+args.map(v=>{const s=String(v);return `$${Buffer.byteLength(s)}\r\n${s}\r\n`;}).join("")));
 socket.on("data",chunk=>{buffer=Buffer.concat([buffer,chunk]);const end=buffer.indexOf("\r\n");if(end<0)return;const type=buffer[0],body=buffer.subarray(1,end).toString();if(type===45)return done(new Error(body));if(type===43)return done(null,body);if(type===58)return done(null,Number(body));if(type===36){const size=Number(body);if(size===-1)return done(null,null);if(buffer.length>=end+size+4)return done(null,buffer.subarray(end+2,end+2+size).toString());}});
});}
const redisVersion=real?(assert.equal(await command(["PING"]),"PONG"),(await command(["INFO","server"])).match(/redis_version:([^\r\n]+)/)?.[1]):null;
async function fixture(){
 const run=randomUUID(),serial=BigInt(parseInt(run.replaceAll("-","").slice(0,11),16)),token="0.0.700001";
 const key=currentMandateKey(token,serial);touched.add(key);const map=new Map();
 const put=async(v)=>{if(real){if(v===null)await command(["DEL",key]);else await command(["SET",key,typeof v==="string"?v:JSON.stringify(v)]);}else{if(v===null)map.delete(key);else map.set(key,typeof v==="string"?v:JSON.stringify(v));}};
 let evaluations=0;
 const db={get:async k=>real?command(["GET",k]):map.get(k)??null,eval:async(script,keys,args)=>{evaluations++;evalCount++;if(real)return command(["EVAL",script,keys.length,...keys,...args]);const current=map.get(keys[0])??"";if(current===args[1])return 2;if(current!==args[0])return -1;map.set(keys[0],args[1]);return 1;}};
 const user={id:"fixture-"+run,email:"owner@example.invalid",appRole:"user"};let signed={...user},stored={...user},testnet=true;
 const pointer={schemaVersion:1,generation:1,state:"active",ownerId:user.id,mandateId:run,digest:"0x"+"ab".repeat(32)};await put(pointer);
 const deps={isTestnet:()=>testnet,readSignedOwner:async()=>signed,readStoredOwner:async()=>stored,store:()=>db};
 const handlers=()=>createRecoveryMandateOwnerHandlers(deps);
 const body={tokenId:token,serial:serial.toString(),mandateId:run,digest:pointer.digest};
 const get=(query=`tokenId=${token}&serial=${serial}`)=>new Request("https://fixture.invalid/api/ledger/recovery-mandate/current?"+query);
 const post=(override={},headers={})=>new Request("https://fixture.invalid/api/ledger/recovery-mandate/revoke",{method:"POST",headers:{origin:"https://fixture.invalid","content-type":"application/json",...headers},body:JSON.stringify({...body,...override})});
 return {db,key,put,pointer,body,deps,handlers,get,post,getEvals:()=>evaluations,setSigned:v=>signed=v,setStored:v=>stored=v,setTestnet:v=>testnet=v};
}
async function test(name,fn){await fn();cases.push(name);console.log("PASS "+name);}
async function status(response,code){assert.equal(response.status,code,JSON.stringify(await response.clone().json()));return response.json();}
try {
 await test("owner GET is noncached pointer observation, not authority",async()=>{const x=await fixture();const r=await x.handlers().GET(x.get());const b=await status(r,200);assert.equal(b.authorityVerified,false);assert.equal(b.executionPermit,false);assert.equal(b.current.ownerId,x.pointer.ownerId);assert.equal(r.headers.get("cache-control"),"no-store");assert.equal(x.getEvals(),0);});
 await test("same-origin owner revoke is exact and repeatable without cancelling started effects",async()=>{const x=await fixture();for(let i=0;i<2;i++){const b=await status(await x.handlers().POST(x.post()),200);assert.equal(b.current.state,"revoked");assert.equal(b.effectsCancelled,false);assert.equal(b.executionPermit,false);}assert.equal(x.getEvals(),1);});
 for(const [name,change] of [
  ["unsigned",x=>x.setSigned(null)],["missing stored user",x=>x.setStored(null)],["legacy missing role",x=>x.setStored({id:x.pointer.ownerId,email:"owner@example.invalid"})],
  ["wrong stored id",x=>x.setStored({id:"other",email:"owner@example.invalid",appRole:"user"})],["role changed",x=>x.setStored({id:x.pointer.ownerId,email:"owner@example.invalid",appRole:"issuer"})],
  ["email changed",x=>x.setStored({id:x.pointer.ownerId,email:"other@example.invalid",appRole:"user"})],["corrupt stored JSON",x=>x.setStored("{" )],
 ])await test(name+" denies GET/revoke without writes",async()=>{const x=await fixture();change(x);await status(await x.handlers().GET(x.get()),401);await status(await x.handlers().POST(x.post()),401);assert.equal(x.getEvals(),0);});
 await test("stored user unavailable fails closed without session fallback",async()=>{const x=await fixture();x.deps.readStoredOwner=async()=>{throw new Error("private storage detail");};const b=await status(await x.handlers().POST(x.post()),503);assert.equal(JSON.stringify(b).includes("private"),false);assert.equal(x.getEvals(),0);});
 for(const origin of ["https://evil.invalid","null",""])await test("cross/missing origin "+origin+" refused",async()=>{const x=await fixture();await status(await x.handlers().POST(x.post({}, {origin})),403);assert.equal(x.getEvals(),0);});
 await test("cross-site fetch metadata refused",async()=>{const x=await fixture();await status(await x.handlers().POST(x.post({}, {"sec-fetch-site":"cross-site"})),403);assert.equal(x.getEvals(),0);});
 for(const value of [false,undefined])await test("network guard "+String(value)+" denies both",async()=>{const x=await fixture();x.setTestnet(value);await status(await x.handlers().GET(x.get()),503);await status(await x.handlers().POST(x.post()),503);});
 for(const [name,body] of [["body owner",{ownerId:"other"}],["actor substitution",{actor:"guestB"}],["zero serial",{serial:"0"}],["unsafe serial",{serial:"9007199254740992"}],["numeric serial",{serial:7}],["aliased token",{tokenId:"00.0.7"}],["oversized token",{tokenId:"0.0.9999999999999999999"}],["bad digest",{digest:"bad"}]])await test(name+" rejected",async()=>{const x=await fixture();await status(await x.handlers().POST(x.post(body)),400);assert.equal(x.getEvals(),0);});
 await test("wrong content type refused",async()=>{const x=await fixture();await status(await x.handlers().POST(x.post({}, {"content-type":"text/plain"})),415);});
 await test("bounded streamed body refuses oversized input",async()=>{const x=await fixture();await status(await x.handlers().POST(x.post({mandateId:"x".repeat(5000)})),413);assert.equal(x.getEvals(),0);});
 await test("duplicate GET query refused",async()=>{const x=await fixture();await status(await x.handlers().GET(x.get(`tokenId=${x.body.tokenId}&serial=${x.body.serial}&serial=8`)),400);});
 await test("wrong owner and absence have same not-found response",async()=>{const x=await fixture();await x.put({...x.pointer,ownerId:"other"});const a=await status(await x.handlers().POST(x.post()),404);await x.put(null);const b=await status(await x.handlers().POST(x.post()),404);assert.deepEqual(a,b);assert.equal(x.getEvals(),0);});
 await test("stale mandate id/digest cannot revoke replacement",async()=>{const x=await fixture();await x.put({...x.pointer,mandateId:"replacement",generation:2});await status(await x.handlers().POST(x.post()),409);assert.equal(x.getEvals(),0);assert.equal(JSON.parse(await x.db.get(x.key)).state,"active");});
 await test("replacement racing atomic revoke survives unchanged",async()=>{const x=await fixture();const evaluate=x.db.eval;x.db.eval=async(...args)=>{await x.put({...x.pointer,mandateId:"replacement",generation:2});return evaluate(...args);};await status(await x.handlers().POST(x.post()),503);assert.equal(JSON.parse(await x.db.get(x.key)).mandateId,"replacement");assert.equal(JSON.parse(await x.db.get(x.key)).state,"active");});
 await test("lost response reports unknown, exact retry observes committed revoke",async()=>{const x=await fixture();const evaluate=x.db.eval;x.db.eval=async(...args)=>{await evaluate(...args);throw new Error("lost response");};const b=await status(await x.handlers().POST(x.post()),503);assert.equal(b.code,"REVOKE_OUTCOME_UNKNOWN_RELOAD_CURRENT");x.db.eval=evaluate;await status(await x.handlers().POST(x.post()),200);assert.equal(JSON.parse(await x.db.get(x.key)).state,"revoked");});
 await test("deactivation between identity reads denies before revoke",async()=>{const x=await fixture();let reads=0;x.deps.readStoredOwner=async()=>++reads===1?{id:x.pointer.ownerId,email:"owner@example.invalid",appRole:"user"}:null;await status(await x.handlers().POST(x.post()),401);assert.equal(x.getEvals(),0);});
 await test("concurrent exact revoke is safely repeatable",async()=>{const x=await fixture();const rs=await Promise.all(Array.from({length:12},()=>x.handlers().POST(x.post())));for(const r of rs)await status(r,200);assert.equal(JSON.parse(await x.db.get(x.key)).state,"revoked");});
 await test("corrupt pointer never becomes empty/fallback",async()=>{const x=await fixture();await x.put("{");await status(await x.handlers().GET(x.get()),503);await status(await x.handlers().POST(x.post()),503);assert.equal(x.getEvals(),0);});
 const report={sourceSha:process.env.YT_SOURCE_SHA??null,status:"PASS",evidenceClass:real?"CI_DISPOSABLE_REAL_REDIS_HTTP_HANDLERS":"LOCAL_MODEL_HTTP_HANDLERS",checks:cases.length,evalCount,redisVersion,cases,realCredentialsLoaded:false,physicalDeviceUsed:false,chainEffects:0};
 if(real)writeFileSync("ledger-owner-http-evidence.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(real)for(const key of touched)await command(["DEL",key]);}
