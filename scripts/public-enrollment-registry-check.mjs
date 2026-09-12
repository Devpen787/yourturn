import assert from "node:assert/strict";
import { createPublicEnrollmentRegistry } from "../lib/policy/public-enrollment-registry.ts";
import { publishProviderPolicy, loadPublishedProviderPolicy } from "../lib/policy/published-provider-policy.ts";
const NOW=1700000000000;
const scope={providerId:"studio-fixture",tokenId:"0.0.7001",serial:7};
const provider=()=>({kind:"provider",...scope,issuerId:"issuer-fixture",version:"1",expiresAtMs:NOW+60000,revokedAtMs:null});
const agent=()=>({kind:"agent",ownerId:"owner-fixture",internalAgentId:"agent-fixture",version:"1",holderAccountId:"0.0.7002",worldRequester:"0x"+"ab".repeat(20),hederaExecutorAccountId:"0.0.7003",resourceUri:"https://fixture.example/api/agent/confirm",expiresAtMs:NOW+60000,revokedAtMs:null});
const manifest=(records=[provider(),agent()])=>({schemaVersion:1,version:"1",issuedAtMs:NOW-1000,expiresAtMs:NOW+120000,revokedAtMs:null,records});
const registry=(m=manifest(),now=()=>NOW)=>createPublicEnrollmentRegistry(m,{now});
let count=0;async function check(name,fn){await fn();count++;console.log(`PASS ${name}`);}
await check("exact provider adapter and agent public provenance",async()=>{const r=registry();assert.deepEqual(await r.resolveProvider(scope),{...scope,issuerId:"issuer-fixture",version:"1"});const a=await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"});assert.equal(a.worldRequester,agent().worldRequester);assert.equal(a.provenance.executionAuthority,false);assert.equal(a.provenance.source,"SERVER_PROVISIONED_PUBLIC_MANIFEST");assert.match(a.provenance.manifestDigest,/^[a-f0-9]{64}$/);assert(!("allowedAction" in a));assert(!("mandateId" in a));});
await check("empty configured manifest resolves null without defaults",async()=>{const r=registry(manifest([]));assert.equal(await r.resolveProvider(scope),null);assert.equal(await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"}),null);});
await check("unknown scope and owner-agent pair resolve null",async()=>{const r=registry();assert.equal(await r.resolveProvider({...scope,serial:8}),null);assert.equal(await r.resolveProvider({...scope,providerId:"other"}),null);assert.equal(await r.resolveAgent({ownerId:"other",internalAgentId:"agent-fixture"}),null);});
await check("input manifest detached from caller before use",async()=>{const m=manifest(),r=registry(m),digest=r.provenance.manifestDigest;m.records[0].issuerId="attacker";m.records[1].worldRequester="0x"+"cd".repeat(20);m.records=[];assert.equal((await r.resolveProvider(scope)).issuerId,"issuer-fixture");assert.equal((await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"})).worldRequester,agent().worldRequester);assert.equal(r.provenance.manifestDigest,digest);});
await check("registry methods and returned records are deeply frozen",async()=>{const r=registry(),p=await r.resolveProvider(scope),a=await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"});assert(Object.isFrozen(r)&&Object.isFrozen(p)&&Object.isFrozen(a)&&Object.isFrozen(a.provenance));assert.throws(()=>{p.issuerId="attacker";});assert.throws(()=>{a.provenance.executionAuthority=true;});assert.throws(()=>{r.resolveProvider=async()=>p;});});
await check("caller lookup object cannot override record",async()=>{await assert.rejects(registry().resolveProvider({...scope,issuerId:"attacker"}),/SHAPE/);await assert.rejects(registry().resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture",worldRequester:"0x"+"cd".repeat(20)}),/SHAPE/);});
await check("colon-containing owner and agent keys cannot collide",async()=>{const a={...agent(),ownerId:"a:b",internalAgentId:"c"},b={...agent(),ownerId:"a",internalAgentId:"b:c",worldRequester:"0x"+"cd".repeat(20)};const r=registry(manifest([a,b]));assert.equal((await r.resolveAgent({ownerId:"a:b",internalAgentId:"c"})).worldRequester,a.worldRequester);assert.equal((await r.resolveAgent({ownerId:"a",internalAgentId:"b:c"})).worldRequester,b.worldRequester);});
await check("different exact provider/token/serial scopes remain independent",async()=>{const b={...provider(),providerId:"studio-fixture:extra",tokenId:"0.0.7004",serial:Number.MAX_SAFE_INTEGER};const r=registry(manifest([provider(),b]));assert.equal((await r.resolveProvider({providerId:b.providerId,tokenId:b.tokenId,serial:b.serial})).issuerId,b.issuerId);assert.equal(await r.resolveProvider({...scope,serial:Number.MAX_SAFE_INTEGER}),null);});
for(const [name,records] of [
 ["identical provider duplicates",[provider(),provider()]],
 ["conflicting provider owner",[provider(),{...provider(),issuerId:"other"}]],
 ["same booking assigned to another provider",[provider(),{...provider(),providerId:"other"}]],
 ["expired provider cannot fallback to duplicate",[{...provider(),expiresAtMs:NOW-1},provider()]],
 ["revoked provider cannot fallback to duplicate",[{...provider(),revokedAtMs:NOW},provider()]],
 ["identical agent duplicates",[agent(),agent()]],
 ["conflicting agent mapping",[agent(),{...agent(),hederaExecutorAccountId:"0.0.7010"}]],
])await check(name,()=>{assert.throws(()=>registry(manifest(records)),/DUPLICATE_OR_CONFLICTING/);});
for(const [name,mutate] of [
 ["missing manifest",()=>null],["missing records",m=>{delete m.records;return m;}],["unknown manifest schema",m=>({...m,schemaVersion:2})],
 ["unknown manifest field",m=>({...m,allowAll:true})],["too many records",m=>({...m,records:Array.from({length:257},provider)})],
 ["empty manifest version",m=>({...m,version:""})],["numeric manifest version",m=>({...m,version:1})],["leading zero version",m=>({...m,version:"01"})],
 ["version beyond int64",m=>({...m,version:"9223372036854775808"})],["negative record version",m=>{m.records[0].version="-1";return m;}],
 ["zero record version",m=>{m.records[0].version="0";return m;}],["unknown record kind",m=>{m.records[0].kind="owner";return m;}],
 ["missing issuer",m=>{delete m.records[0].issuerId;return m;}],["issuer whitespace",m=>{m.records[0].issuerId=" issuer ";return m;}],
 ["provider path injection",m=>{m.records[0].providerId="../../provider";return m;}],["unexpected provider permission",m=>{m.records[0].action="any";return m;}],
 ["zero token",m=>{m.records[0].tokenId="0.0.0";return m;}],["noncanonical token",m=>{m.records[0].tokenId="0.0.01";return m;}],
 ["token int64 overflow",m=>{m.records[0].tokenId="0.0.9223372036854775808";return m;}],["zero serial",m=>{m.records[0].serial=0;return m;}],
 ["unsafe serial",m=>{m.records[0].serial=Number.MAX_SAFE_INTEGER+1;return m;}],["string serial",m=>{m.records[0].serial="7";return m;}],
 ["zero requester",m=>{m.records[1].worldRequester="0x"+"00".repeat(20);return m;}],["malformed requester",m=>{m.records[1].worldRequester="0xabc";return m;}],
 ["malformed executor",m=>{m.records[1].hederaExecutorAccountId="0x123";return m;}],["holder equals executor",m=>{m.records[1].hederaExecutorAccountId=m.records[1].holderAccountId;return m;}],
 ["agent action widening",m=>{m.records[1].allowedAction="resale";return m;}],["future manifest issue",m=>({...m,issuedAtMs:NOW+1})],
 ["inverted manifest validity",m=>({...m,expiresAtMs:m.issuedAtMs})],["unsafe timestamp",m=>({...m,expiresAtMs:Number.MAX_SAFE_INTEGER+1})],
 ["null record expiry",m=>{m.records[0].expiresAtMs=null;return m;}],["record exceeds manifest expiry",m=>{m.records[0].expiresAtMs=m.expiresAtMs+1;return m;}],
 ["future scheduled revocation unsupported",m=>{m.records[0].revokedAtMs=NOW+1;return m;}],["missing explicit revocation",m=>{delete m.records[0].revokedAtMs;return m;}],
 ["future manifest revocation",m=>({...m,revokedAtMs:NOW+1})],
])await check(`${name} fails closed`,()=>{assert.throws(()=>registry(mutate(manifest())));});
for(const value of ["http://example.com/api/agent/confirm","https://user:pass@example.com/api/agent/confirm","https://fixture.example/api/agent/confirm?q=1","https://fixture.example/api/agent/confirm#x","https://fixture.example/api/agent/preview","https://fixture.example/api/agent/confirm/","https://fixture.example:443/api/agent/confirm","https://fixture.example/a/../api/agent/confirm","ftp://localhost/api/agent/confirm"])
await check(`reject resource ${value}`,()=>{assert.throws(()=>registry(manifest([{...agent(),resourceUri:value}])),/INVALID_AGENT_RESOURCE/);});
await check("exact HTTP loopback resource accepted",async()=>{for(const host of ["127.0.0.1","localhost","[::1]"]){const uri=`http://${host}:3000/api/agent/confirm`,r=registry(manifest([{...agent(),resourceUri:uri}]));assert.equal((await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"})).resourceUri,uri);}});
await check("mixed-case EVM public identity normalizes exactly",async()=>{const r=registry(manifest([{...agent(),worldRequester:"0x"+"aB".repeat(20)}]));assert.equal((await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"})).worldRequester,agent().worldRequester);});
await check("record expiry is exclusive and never falls back",async()=>{let now=NOW;const r=registry(manifest(),()=>now);assert(await r.resolveProvider(scope));now=NOW+60000;assert.equal(await r.resolveProvider(scope),null);assert.equal(await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"}),null);});
await check("expired manifest has no usable entries",async()=>{const m=manifest();m.issuedAtMs=NOW-120000;m.expiresAtMs=NOW;m.records.forEach(r=>{r.expiresAtMs=NOW;});assert.equal(await registry(m).resolveProvider(scope),null);});
await check("revoked record and revoked manifest are inactive",async()=>{const m=manifest();m.records[0].revokedAtMs=NOW;const r=registry(m);assert.equal(await r.resolveProvider(scope),null);assert(await r.resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"}));m.revokedAtMs=NOW;assert.equal(await registry(m).resolveAgent({ownerId:"owner-fixture",internalAgentId:"agent-fixture"}),null);});
await check("observed clock rollback cannot resurrect expired registration",async()=>{let now=NOW;const r=registry(manifest(),()=>now);now=NOW+60000;assert.equal(await r.resolveProvider(scope),null);now=NOW;await assert.rejects(r.resolveProvider(scope),/CLOCK_REGRESSED/);});
await check("invalid runtime clock denies even unknown entry",async()=>{let now=NOW;const r=registry(manifest(),()=>now);now=NaN;await assert.rejects(r.resolveProvider({...scope,serial:8}),/INVALID_ENROLLMENT_TIME/);});
await check("real cleared provider module consumes exact registry callback (model storage)",async()=>{
 let now=NOW;const r=registry(manifest(),()=>now),memory=new Map();
 const store={get:async key=>memory.get(key)??null,eval:async(_script,keys,args)=>{const[version,previous,json]=args,raw=memory.get(keys[0])??null;if(raw===null){if(version!==0||previous!=="")return -1;}else{try{assert.deepEqual(JSON.parse(raw),JSON.parse(previous));}catch{return -1;}}const next=JSON.parse(json);next.publishedAtMs=now;const value=JSON.stringify(next);memory.set(keys[0],value);return value;}};
 const dependencies={store,resolveEnrollment:r.resolveProvider,now:()=>now};
 const policy={state:"ALLOW",minimumRecoveryAtomicUnits:"30000000",royalty:{numerator:"5",denominator:"100",collectorAccountId:"0.0.7010"},transferCutoffMs:NOW+90000,validUntilMs:NOW+100000};
 const p=await publishProviderPolicy({...dependencies,issuerId:"issuer-fixture",scope,expectedVersion:0,policy});assert.equal(p.enrollmentVersion,"1");assert.equal((await loadPublishedProviderPolicy({...dependencies,scope})).version,1);
 await assert.rejects(publishProviderPolicy({...dependencies,issuerId:"wrong",scope,expectedVersion:1,policy}),/ISSUER_NOT_ENROLLED_OWNER/);
 now=NOW+60000;await assert.rejects(loadPublishedProviderPolicy({...dependencies,scope}));
 assert.equal(JSON.parse([...memory.values()][0]).version,1); // Policy remains stored; expired enrollment cannot authorize it.
});
console.log(JSON.stringify({kind:"SYNTHETIC_MANIFEST_AND_MODEL_STORAGE_ONLY",passed:count,realProvisioning:false,productionWrites:false,executionAuthority:false}));
