import assert from 'node:assert/strict';
import { resolveCanonicalRecoveryProjection, canonicalProjectionDigest } from '../lib/ledger/canonical-recovery-projection.ts';
import { activeRecoveryMandateKey } from '../lib/ledger/recovery-mandate-state.ts';
import { currentMandateKey, serializeCurrentMandate } from '../lib/ledger/recovery-mandate-current.ts';
import { recoveryMandateAuthorityVersionKey } from '../lib/ledger/recovery-mandate-authority-boundary.ts';
const now=BigInt(Math.floor(Date.now()/1000));
function fixture(){
 const m={mandateId:'fixture-mandate',ownerId:'fixture-maya',agentId:'yourturn-concierge',bookingTokenId:'0.0.7001',bookingSerial:'7',allowedAction:'resale',minimumRecoveryAtomicUnits:'40000000',settlementAsset:'0.0.429274',expiresAt:(now+BigInt(3600)).toString(),issuedAt:now.toString(),cancellationAllowed:false,nonce:'fixture-nonce',ledgerSignerAddress:'0x'+'11'.repeat(20)};
 const r={state:'active',ownerId:m.ownerId,activatedAt:new Date().toISOString(),mandate:m,digest:'0x'+'aa'.repeat(32),recoveredSignerAddress:m.ledgerSignerAddress,authorityStateVersion:0,currentGeneration:1};
 const b={version:'v1',ownerId:m.ownerId,holderAccountId:'0.0.7002',internalAgentId:m.agentId,worldRequester:'0x'+'22'.repeat(20),hederaExecutorAccountId:'0.0.7003',resourceUri:'https://fixture.invalid/api/agent/confirm'};
 let pointer={schemaVersion:1,generation:1,state:'active',ownerId:m.ownerId,mandateId:m.mandateId,digest:r.digest},version=0,revalidations=0;
 const store={get:async key=>key===activeRecoveryMandateKey(m.mandateId)?r:key===currentMandateKey(m.bookingTokenId,BigInt(7))?serializeCurrentMandate(pointer):key===recoveryMandateAuthorityVersionKey(BigInt(7))?version:null,eval:async()=>{throw new Error('Read-only qualification');}};
 const input={authority:{store,authorityBoundaryStore:store,mandateId:m.mandateId,ownerId:m.ownerId,revalidateMutableAuthority:async()=>{revalidations++;}},operationId:'fixture-operation',resolveAgentBinding:async()=>b};
 return {m,r,b,input,revoke:()=>pointer={...pointer,state:'revoked'},mutateVersion:()=>version++,revalidations:()=>revalidations};
}
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
await test('guarded source, explicit seconds/ms and positive atomic units',async()=>{const f=fixture(),p=await resolveCanonicalRecoveryProjection(f.input);assert.equal(f.revalidations(),3);assert.equal(p.expiresAtMs,Number(f.m.expiresAt)*1000);assert.equal(p.minimumRecoveryAtomicUnits,'40000000');assert.equal(p.executionAction,'RECOVER');assert.equal(p.cancellationAllowed,false);assert.equal(p.worldRequester,f.b.worldRequester);assert(Object.isFrozen(p));assert.match(canonicalProjectionDigest(p),/^[a-f0-9]{64}$/);});
for(const [name,mutate] of [
 ['zero minimum',f=>f.m.minimumRecoveryAtomicUnits='0'],['negative minimum',f=>f.m.minimumRecoveryAtomicUnits='-1'],
 ['unsafe time conversion',f=>f.m.expiresAt='9007199254740992'],['expired authority',f=>f.m.expiresAt='1'],
 ['unsupported currency',f=>f.m.settlementAsset='HBAR'],['unsupported action',f=>f.m.allowedAction='cancel_release'],
 ['cancellation widening',f=>f.m.cancellationAllowed=true],['wrong owner mapping',f=>f.b.ownerId='other'],
 ['wrong internal agent',f=>f.b.internalAgentId='other'],['missing requester',f=>f.b.worldRequester=''],
 ['zero requester',f=>f.b.worldRequester='0x'+'00'.repeat(20)],['wrong resource path',f=>f.b.resourceUri='https://fixture.invalid/api/other'],
 ['resource query ambiguity',f=>f.b.resourceUri+='?action=other'],['external plaintext resource',f=>f.b.resourceUri='http://fixture.invalid/api/agent/confirm'],
 ['holder executor collision',f=>f.b.hederaExecutorAccountId=f.b.holderAccountId],['extra authority object',f=>f.b.approvalGrant={}],
 ['revoked pointer',f=>f.revoke()],['odd mutation version',f=>f.mutateVersion()],
])await test(name,async()=>{const f=fixture();mutate(f);await assert.rejects(resolveCanonicalRecoveryProjection(f.input));});
await test('mapping changes between reads fail closed',async()=>{const f=fixture();let calls=0;f.input.resolveAgentBinding=async()=>({...f.b,version:++calls===1?'v1':'v2'});await assert.rejects(resolveCanonicalRecoveryProjection(f.input));});
await test('revocation during binding resolution fails closed',async()=>{const f=fixture();f.input.resolveAgentBinding=async()=>{f.revoke();return f.b;};await assert.rejects(resolveCanonicalRecoveryProjection(f.input));});
await test('revocation during final binding read fails closed',async()=>{const f=fixture();let calls=0;f.input.resolveAgentBinding=async()=>{if(++calls===2)f.revoke();return f.b;};await assert.rejects(resolveCanonicalRecoveryProjection(f.input));});
await test('missing registry binding fails closed',async()=>{const f=fixture();f.input.resolveAgentBinding=async()=>null;await assert.rejects(resolveCanonicalRecoveryProjection(f.input));});
await test('digest binds each projected authority and mapping field',async()=>{const f=fixture(),p=await resolveCanonicalRecoveryProjection(f.input),d=canonicalProjectionDigest(p);for(const k of Object.keys(p))assert.notEqual(canonicalProjectionDigest({...p,[k]:String(p[k])+'changed'}),d,k);});
console.log(JSON.stringify({status:'PASS',checks,evidenceClass:'CI_LOCAL_CONTRACT',worldVerification:false,chainResolver:false,device:false}));
