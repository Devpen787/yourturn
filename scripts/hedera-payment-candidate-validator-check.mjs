import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createCurrentPaymentCandidateValidator } from '../lib/hedera-agent-kit/current-payment-candidate-validator.ts';
import { currentPaymentCandidateDigest } from '../lib/hedera-agent-kit/current-payment-record.ts';
import { activeRecoveryMandateKey } from '../lib/ledger/recovery-mandate-state.ts';
import { currentMandateKey, serializeCurrentMandate } from '../lib/ledger/recovery-mandate-current.ts';
import { recoveryMandateAuthorityVersionKey } from '../lib/ledger/recovery-mandate-authority-boundary.ts';
import { publishedProviderPolicyKey } from '../lib/policy/published-provider-policy.ts';
import { resolveRecoveryRoyalty } from '../lib/hedera-agent-kit/recovery-royalty.ts';
import net from 'node:net';

const NOW=Math.floor(Date.now()/1000)*1000, STAMP=`${NOW/1000-1}.000000000`;
const sha=value=>createHash('sha256').update(value).digest('hex');
const REAL_REDIS=process.argv.includes('--redis');
const REDIS_PORT=Number(process.env.YT_PAYMENT_VALIDATOR_REDIS_PORT??16379);
function command(args){return new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port:REDIS_PORT});let body=Buffer.alloc(0);const finish=(error,value)=>{socket.destroy();error?reject(error):resolve(value);};socket.setTimeout(5000,()=>finish(Error('Redis timeout')));socket.on('error',reject);socket.on('connect',()=>socket.write(`*${args.length}\r\n`+args.map(value=>{const text=String(value);return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;}).join('')));socket.on('data',chunk=>{body=Buffer.concat([body,chunk]);const line=body.indexOf('\r\n');if(line<0)return;const type=body[0],head=body.subarray(1,line).toString();if(type===45)return finish(Error(head));if(type===43)return finish(null,head);if(type===58)return finish(null,Number(head));if(type===36){const size=Number(head);if(size===-1)return finish(null,null);if(body.length>=line+size+4)return finish(null,body.subarray(line+2,line+2+size).toString());}});});}

function fixture(realRedis=false){
 const operationId='payment-operation', mandateId='payment-mandate';
 const mandate={mandateId,ownerId:'owner',agentId:'agent',bookingTokenId:'0.0.7001',bookingSerial:'7',allowedAction:'resale',minimumRecoveryAtomicUnits:'40000000',settlementAsset:'0.0.429274',expiresAt:String(NOW/1000+300),issuedAt:String(NOW/1000-60),cancellationAllowed:false,nonce:'payment-nonce',ledgerSignerAddress:'0x'+'12'.repeat(20)};
 const active={state:'active',ownerId:mandate.ownerId,activatedAt:new Date(NOW-1000).toISOString(),mandate,digest:'0x'+'aa'.repeat(32),recoveredSignerAddress:mandate.ledgerSignerAddress,authorityStateVersion:0,currentGeneration:1};
 let pointer={schemaVersion:1,generation:1,state:'active',ownerId:mandate.ownerId,mandateId,digest:active.digest}, authorityVersion=0;
 const binding={version:'1',ownerId:mandate.ownerId,holderAccountId:'0.0.7002',internalAgentId:mandate.agentId,worldRequester:'0x'+'21'.repeat(20),hederaExecutorAccountId:'0.0.7004',resourceUri:'https://fixture.invalid/api/agent/confirm'};
 const policy={schemaVersion:1,version:1,providerId:'provider',tokenId:mandate.bookingTokenId,serial:7,issuerId:'issuer',enrollmentVersion:'1',enrollmentFingerprint:sha(JSON.stringify(['provider',mandate.bookingTokenId,7,'issuer','1'])),publishedAtMs:NOW-1000,state:'ALLOW',minimumRecoveryAtomicUnits:'40000000',royalty:{numerator:'1',denominator:'10',collectorAccountId:'0.0.7011'},transferCutoffMs:NOW+220000,validUntilMs:NOW+250000};
 const metadata={tokenId:mandate.bookingTokenId,treasuryAccountId:'0.0.7010',feeScheduleKey:null,fixedFees:[],fractionalFees:[],royaltyFees:[{numerator:'1',denominator:'10',collectorAccountId:'0.0.7011',allCollectorsAreExempt:false,fallbackFee:null}]};
 const commitment={domain:'yourturn:hedera:testnet:exact-payment:v2',commitmentId:'payment-commitment',operationId,delegationId:mandateId,quoteId:'payment-quote',quoteHash:'ab'.repeat(32),providerPolicyId:policy.providerId,providerPolicyVersion:'1',bookingTokenId:mandate.bookingTokenId,serial:7,holderAccountId:binding.holderAccountId,delegatedAgentAccountId:binding.hederaExecutorAccountId,settlementSourceAccountId:'0.0.7003',receiverAccountId:'0.0.7003',settlementRecipientAccountId:binding.holderAccountId,transactionFeePayerAccountId:binding.hederaExecutorAccountId,settlementTokenId:'0.0.429274',settlementDecimals:6,settlementAmountAtomicUnits:'45000000',transactionId:`0.0.7004@${NOW/1000}.000000000`,nodeAccountId:'0.0.3',transactionValidDurationSeconds:120,maxTransactionFeeTinybars:'100000000',expiresAtMs:NOW+120000,economics:null};
 commitment.economics=resolveRecoveryRoyalty({grossAtomicUnits:commitment.settlementAmountAtomicUnits,holderAccountId:commitment.holderAccountId,buyerAccountId:commitment.receiverAccountId,bookingTokenId:commitment.bookingTokenId,policy:policy.royalty,metadata});
 const candidate={schemaVersion:1,version:'1',ownerId:'owner',operationId,providerId:'provider',quote:{id:commitment.quoteId,hash:commitment.quoteHash,expiresAtMs:NOW+180000},commitment,revokedAtMs:null};
 const eligibility={schemaVersion:1,version:'1',ownerId:'owner',operationId,tokenId:mandate.bookingTokenId,serial:7,holderAccountId:binding.holderAccountId,buyerAccountId:commitment.receiverAccountId,status:'HELD',acquirerEligible:true,validUntilMs:NOW+190000};
 const manifest={schemaVersion:1,version:'1',issuedAtMs:NOW-1000,expiresAtMs:NOW+290000,revokedAtMs:null,records:[{kind:'provider',providerId:'provider',tokenId:mandate.bookingTokenId,serial:7,issuerId:'issuer',version:'1',expiresAtMs:NOW+280000,revokedAtMs:null},{kind:'agent',...binding,kind:'agent',expiresAtMs:NOW+270000,revokedAtMs:null}]};
 const publisher={publisherId:'issuer',ownerId:'owner'};
 let clock=NOW, policyGets=0, eligibilityReads=0, revalidations=0, fetches=0;
 const counts=new Map();
 const f={operationId,mandate,active,binding,policy,metadata,commitment,candidate,eligibility,manifest,publisher,
   mutatePolicy:()=>{},mutateEligibility:()=>{},mutateAuthority:()=>{},mutateMirror:()=>{},
   setClock:value=>clock=value,setPointer:value=>pointer=value,setAuthorityVersion:value=>authorityVersion=value,
   counts:()=>({policyGets,eligibilityReads,revalidations,fetches})};
 const authorityStore={get:async key=>{
   if(realRedis)return command(['GET',key]);
   if(key===activeRecoveryMandateKey(mandateId))return active;
   if(key===currentMandateKey(mandate.bookingTokenId,BigInt(mandate.bookingSerial)))return serializeCurrentMandate(pointer);
   if(key===recoveryMandateAuthorityVersionKey(BigInt(mandate.bookingSerial)))return authorityVersion;
   return null;
 },eval:async()=>assert.fail('validator authority source must remain read-only')};
 const token=nft=>({token_id:nft?mandate.bookingTokenId:'0.0.429274',type:nft?'NON_FUNGIBLE_UNIQUE':'FUNGIBLE_COMMON',deleted:false,pause_status:'NOT_APPLICABLE',decimals:nft?'0':'6',treasury_account_id:metadata.treasuryAccountId,fee_schedule_key:null,freeze_key:null,kyc_key:null,pause_key:null,modified_timestamp:STAMP,custom_fees:{created_timestamp:STAMP,fixed_fees:[],...(nft?{royalty_fees:metadata.royaltyFees.map(r=>({amount:{numerator:r.numerator,denominator:r.denominator},collector_account_id:r.collectorAccountId,all_collectors_are_exempt:r.allCollectorsAreExempt,fallback_fee:null}))}:{fractional_fees:[]})}});
 const fetch=async(url,init)=>{
   fetches++;const u=new URL(url), n=(counts.get(u.href)??0)+1;counts.set(u.href,n);
   assert.equal(u.origin,'https://testnet.mirrornode.hedera.com');assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
   let value;
   if(u.pathname==='/api/v1/transactions')value={transactions:[{consensus_timestamp:STAMP}]};
   else if(u.pathname.endsWith('/allowances/nfts'))value={allowances:[],links:{next:null}};
   else if(u.pathname.endsWith('/nfts/7'))value={token_id:mandate.bookingTokenId,serial_number:7,account_id:binding.holderAccountId,deleted:false,spender:binding.hederaExecutorAccountId,delegating_spender:null,modified_timestamp:STAMP};
   else if(u.pathname.endsWith('/tokens')){const nft=u.searchParams.get('token.id')===mandate.bookingTokenId;value={tokens:[{token_id:nft?mandate.bookingTokenId:'0.0.429274',balance:nft?'1':'45000000',decimals:nft?0:6,freeze_status:'NOT_APPLICABLE',kyc_status:'NOT_APPLICABLE',created_timestamp:STAMP,automatic_association:false}],links:{next:null}};}
   else if(u.pathname.startsWith('/api/v1/tokens/'))value=token(u.pathname.endsWith(mandate.bookingTokenId));
   else {const account=u.pathname.split('/').at(-1);value={account,deleted:false,receiver_sig_required:false,key:{_type:'ED25519',key:(account===binding.hederaExecutorAccountId?'33':'22').repeat(32)}};}
   f.mutateMirror(value,u,n,fetches);
   return new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
 };
 const policyKey=publishedProviderPolicyKey({providerId:'provider',tokenId:mandate.bookingTokenId,serial:7});
 const dependencies={operationId,publicEnrollmentManifest:manifest,authority:{store:authorityStore,authorityBoundaryStore:authorityStore,mandateId,ownerId:mandate.ownerId,revalidateMutableAuthority:async()=>{revalidations++;f.mutateAuthority(revalidations);}},readCurrentEligibility:async()=>{eligibilityReads++;f.mutateEligibility(eligibilityReads);return eligibility;},policyStore:{get:async key=>{assert.equal(key,policyKey);policyGets++;f.mutatePolicy(policyGets);return realRedis?command(['GET',key]):JSON.stringify(policy);},eval:async()=>assert.fail('validator provider source must remain read-only')},chainOptions:{fetch},now:()=>clock};
  f.dependencies=dependencies;
 let preloaded=false;
  f.validate=async(overrides={})=>{
   if(realRedis&&!preloaded){
     assert.equal(await command(['PING']),'PONG');
     await command(['SET',activeRecoveryMandateKey(mandateId),JSON.stringify(active)]);
     await command(['SET',currentMandateKey(mandate.bookingTokenId,BigInt(mandate.bookingSerial)),serializeCurrentMandate(pointer)]);
     await command(['SET',recoveryMandateAuthorityVersionKey(BigInt(mandate.bookingSerial)),String(authorityVersion)]);
     await command(['SET',policyKey,JSON.stringify(policy)]);
     preloaded=true;
   }
   const validator=createCurrentPaymentCandidateValidator(dependencies);
   let candidateDigest;
   try { candidateDigest=currentPaymentCandidateDigest(candidate); }
   catch { candidateDigest='00'.repeat(32); }
   return validator({publisher,candidate,candidateDigest,...overrides});
 };
 f.recomputeEconomics=()=>commitment.economics=resolveRecoveryRoyalty({grossAtomicUnits:commitment.settlementAmountAtomicUnits,holderAccountId:commitment.holderAccountId,buyerAccountId:commitment.receiverAccountId,bookingTokenId:commitment.bookingTokenId,policy:policy.royalty,metadata});
 return f;
}

let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}

await test('guarded projection, actual registry/policy and two full chain reads produce strict fingerprint',async()=>{const f=fixture(REAL_REDIS),result=await f.validate();assert.match(result.authorityFingerprint,/^[a-f0-9]{64}$/);assert.equal(result.validUntilMs,f.commitment.expiresAtMs);assert.deepEqual(f.counts(),{policyGets:4,eligibilityReads:2,revalidations:6,fetches:52});assert.deepEqual(Object.keys(result).sort(),['authorityFingerprint','validUntilMs']);assert(Object.isFrozen(result));});
await test('stable facts produce stable fingerprint',async()=>{assert.equal((await fixture().validate()).authorityFingerprint,(await fixture().validate()).authorityFingerprint);});
await test('zero royalty is accepted without inferring ten percent',async()=>{const f=fixture();f.policy.royalty={numerator:'0',denominator:'1',collectorAccountId:null};f.metadata.royaltyFees=[];f.policy.minimumRecoveryAtomicUnits='40000000';f.recomputeEconomics();const result=await f.validate();assert.match(result.authorityFingerprint,/^[a-f0-9]{64}$/);assert.equal(f.commitment.economics.sellerNetAtomicUnits,'45000000');});
await test('owner-selected twenty percent is accepted when net clears both floors',async()=>{const f=fixture();f.policy.royalty.numerator='2';f.metadata.royaltyFees[0].numerator='2';f.policy.minimumRecoveryAtomicUnits='35000000';f.mandate.minimumRecoveryAtomicUnits='35000000';f.recomputeEconomics();await f.validate();assert.equal(f.commitment.economics.sellerNetAtomicUnits,'36000000');});
await test('publisher must be provider enrolled issuer',async()=>{const f=fixture();f.publisher.publisherId='other-service';await assert.rejects(f.validate(),/PAYMENT_PUBLISHER_NOT_PROVIDER_ISSUER/);});
await test('publisher provenance is snapshotted and included in fingerprint',async()=>{const a=fixture(),b=fixture();let changed=false;a.mutateAuthority=()=>{if(!changed){changed=true;a.publisher.publisherId='mutated-after-start';}};const first=await a.validate();const second=await b.validate();assert.equal(first.authorityFingerprint,second.authorityFingerprint);});
await test('server-selected operation cannot be replaced by candidate',async()=>{const f=fixture();f.candidate.operationId='other';f.commitment.operationId='other';await assert.rejects(f.validate(),/PAYMENT_OPERATION_MISMATCH/);});
await test('candidate digest mismatch denies before trusted reads',async()=>{const f=fixture();await assert.rejects(f.validate({candidateDigest:'cd'.repeat(32)}),/DIGEST_MISMATCH/);assert.deepEqual(f.counts(),{policyGets:0,eligibilityReads:0,revalidations:0,fetches:0});});
await test('whole-second inherited commitment rejects nonzero nanos',async()=>{const f=fixture();f.commitment.transactionId=`0.0.7004@${NOW/1000}.123000000`;await assert.rejects(f.validate(),/PAYMENT_CANDIDATE_INVALID/);});

for(const [name,mutate,pattern] of [
 ['wrong authenticated owner',f=>f.publisher.ownerId='other',/OWNER/],
 ['wrong candidate owner',f=>f.candidate.ownerId='other',/OWNER/],
 ['wrong provider',f=>{f.candidate.providerId='other';f.commitment.providerPolicyId='other';},/PROVIDER/],
 ['wrong quote ID',f=>f.candidate.quote.id='other',/PAYMENT_CANDIDATE_INVALID|QUOTE/],
 ['wrong quote hash',f=>f.candidate.quote.hash='cd'.repeat(32),/PAYMENT_CANDIDATE_INVALID|QUOTE/],
 ['wrong mandate',f=>f.commitment.delegationId='other',/BOOKING_OR_MANDATE/],
 ['wrong token',f=>f.commitment.bookingTokenId='0.0.7999',/BOOKING_OR_MANDATE/],
 ['wrong serial',f=>f.commitment.serial=8,/BOOKING_OR_MANDATE/],
 ['wrong executor',f=>{f.commitment.delegatedAgentAccountId='0.0.7999';f.commitment.transactionFeePayerAccountId='0.0.7999';f.commitment.transactionId=`0.0.7999@${NOW/1000}.000000000`;},/AUTHORITY_ROLE/],
 ['third-party funder',f=>f.commitment.settlementSourceAccountId='0.0.7999',/PAYMENT_CANDIDATE_INVALID|BOB_SELF_FUNDING/],
 ['buyer-agent collision',f=>{f.commitment.settlementSourceAccountId=f.binding.hederaExecutorAccountId;f.commitment.receiverAccountId=f.binding.hederaExecutorAccountId;},/PAYMENT_CANDIDATE_INVALID|BOB_SELF_FUNDING/],
 ['wrong settlement asset',f=>f.commitment.settlementTokenId='0.0.7999',/PAYMENT_CANDIDATE_INVALID|ASSET/],
 ['provider block',f=>f.policy.state='BLOCK',/PROVIDER_POLICY_DENIED/],
 ['provider review',f=>f.policy.state='REVIEW',/PROVIDER_POLICY_DENIED/],
 ['provider version drift',f=>f.policy.version=2,/V2_PROVIDER_POLICY/],
 ['ineligible buyer',f=>f.eligibility.acquirerEligible=false,/invalid_literal|Invalid literal|ELIGIBILITY/],
 ['booking not held',f=>f.eligibility.status='CANCELLED',/invalid_literal|ELIGIBILITY/],
 ['wrong eligibility buyer',f=>f.eligibility.buyerAccountId='0.0.7999',/ELIGIBILITY/],
 ['expired eligibility',f=>f.eligibility.validUntilMs=NOW,/EXPIRES_TOO_SOON/],
 ['candidate expiry exceeds quote',f=>f.candidate.quote.expiresAtMs=NOW+100000,/PAYMENT_CANDIDATE_INVALID/],
 ['transaction duration mismatch',f=>f.commitment.expiresAtMs++,/PAYMENT_CANDIDATE_INVALID|VALIDITY/],
 ['future transaction start',f=>{f.commitment.transactionId=`0.0.7004@${NOW/1000+1}.000000000`;f.commitment.expiresAtMs=NOW+121000;},/VALIDITY/],
 ['tampered economics',f=>f.commitment.economics={...f.commitment.economics,sellerNetAtomicUnits:'45000000'},/ECONOMICS/],
 ['holder net below floor',f=>{f.mandate.minimumRecoveryAtomicUnits='41000000';},/SELLER_NET/],
 ['provider net below floor',f=>f.policy.minimumRecoveryAtomicUnits='41000000',/SELLER_NET/],
]) await test(name+' denies',async()=>{const f=fixture();mutate(f);await assert.rejects(f.validate(),pattern);});

await test('provider record drift inside its repeated GET fails closed',async()=>{const f=fixture();f.mutatePolicy=n=>{if(n===2)f.policy.minimumRecoveryAtomicUnits='39999999';};await assert.rejects(f.validate(),/CHANGED_DURING_READ/);});
await test('provider drift after chain work fails final control',async()=>{const f=fixture();f.mutatePolicy=n=>{if(n===3)f.policy.minimumRecoveryAtomicUnits='39999999';};await assert.rejects(f.validate(),/CURRENT_CONTROL_FACTS_CHANGED/);});
await test('eligibility drift after chain work fails final control',async()=>{const f=fixture();f.mutateEligibility=n=>{if(n===2)f.eligibility.version='2';};await assert.rejects(f.validate(),/CURRENT_CONTROL_FACTS_CHANGED/);});
await test('Ledger current pointer drift during chain work fails closed',async()=>{const f=fixture();f.mutateMirror=(_v,_u,_n,total)=>{if(total===27)f.setPointer({...f.active,state:'revoked'});};await assert.rejects(f.validate());});
await test('chain drift inside one reader is denied by inherited reader',async()=>{const f=fixture();f.mutateMirror=(v,u,n)=>{if(u.pathname.endsWith(f.binding.hederaExecutorAccountId)&&n===2)v.key.key='44'.repeat(32);};await assert.rejects(f.validate(),/INDEXED_STATE_CHANGED/);});
await test('chain drift between complete reads is denied',async()=>{const f=fixture();f.mutateMirror=(v,u,n)=>{if(u.pathname.endsWith(f.binding.hederaExecutorAccountId)&&n>=3)v.key.key='44'.repeat(32);};await assert.rejects(f.validate(),/CHAIN_FACTS_CHANGED/);});
await test('unavailable eligibility source has no fallback',async()=>{const f=fixture();f.dependencies.readCurrentEligibility=async()=>{throw Error('eligibility offline');};await assert.rejects(f.validate(),/eligibility offline/);});
await test('unavailable provider store has no fallback',async()=>{const f=fixture();f.dependencies.policyStore.get=async()=>{throw Error('policy offline');};await assert.rejects(f.validate(),/policy offline/);});
await test('unavailable Mirror has no fallback',async()=>{const f=fixture();f.dependencies.chainOptions.fetch=async()=>{throw Error('mirror offline');};await assert.rejects(f.validate(),/MIRROR_UNAVAILABLE/);});
await test('clock rollback fails closed',async()=>{const f=fixture();f.mutateAuthority=n=>{if(n===2)f.setClock(NOW-1);};await assert.rejects(f.validate());});
await test('five-second logical window is enforced',async()=>{const f=fixture();f.mutateAuthority=n=>{if(n===2)f.setClock(NOW+5000);};await assert.rejects(f.validate(),/WINDOW_EXPIRED/);});
await test('hung trusted callback is bounded by wall clock',async()=>{const f=fixture();f.dependencies.readCurrentEligibility=async()=>new Promise(()=>{});await assert.rejects(f.validate(),/VALIDATION_TIMEOUT/);});
await test('manifest is snapshotted at construction',async()=>{const f=fixture(),validator=createCurrentPaymentCandidateValidator(f.dependencies);f.manifest.records=[];const r=await validator({publisher:f.publisher,candidate:f.candidate,candidateDigest:currentPaymentCandidateDigest(f.candidate)});assert.match(r.authorityFingerprint,/^[a-f0-9]{64}$/);});
await test('fingerprint changes with current eligibility, policy and native key facts',async()=>{const base=(await fixture().validate()).authorityFingerprint;for(const mutate of [f=>f.eligibility.version='2',f=>{f.policy.minimumRecoveryAtomicUnits=null;},f=>{f.mutateMirror=(v,u)=>{if(u.pathname.endsWith(f.binding.hederaExecutorAccountId))v.key.key='55'.repeat(32);};}]){const f=fixture();mutate(f);assert.notEqual((await f.validate()).authorityFingerprint,base);}});
await test('cleared runtime cores and patched dependency graph stay byte-identical',()=>{for(const [path,expected] of Object.entries({
 'package.json':'b4a1b1e4eaf1de2fcc54ad902094f0c6b04b1a1bd131ace12cd8077f3fb952b2',
 'package-lock.json':'6d8ce20f70a19df1f3e124fa84d39940d148d434ce0201a815d47e3852aec525',
 'lib/hedera-agent-kit/current-payment-record.ts':'3138ca2d7b8854b53a92d6ca4ed75e932c92137991e5e9c3fe09381e95aa6d14',
 'lib/hedera-agent-kit/current-chain-reader.ts':'e48efc3f9d6883e4b798169dd0be78b2301f3bb6a0cc3eec4ac7db4e09756f3a',
 'lib/hedera-agent-kit/recovery-royalty.ts':'06e9e02409a0c031aa6e1ea0ef9c9fe7be79382ff3e09c5d66924cea9cd4a862',
 'lib/ledger/canonical-recovery-projection.ts':'9380fb34128d56595cce1cb669f7a09ca9a6d7071c97bdfa19abc3ae5e648739',
 'lib/policy/public-enrollment-registry.ts':'6729cbc8f31296736ed61539a29d4cc8e6518dc2a873da8c1396e4b67be3589c',
 'lib/policy/published-provider-policy.ts':'283b972ceb6e4ba440ff2af5b507a969517cb212fb8a3d1b1ec7b1326fbdc543',
 }))assert.equal(sha(readFileSync(new URL('../'+path,import.meta.url))),expected,path);});

console.log(JSON.stringify({status:'PASS',checks,evidenceClass:REAL_REDIS?'DISPOSABLE_REAL_REDIS_GUARDED_SOURCES_AND_MOCK_PUBLIC_GET':'MOCK_PUBLIC_GET_AND_TRUSTED_STORES',mirrorGetsPerSuccess:52,validatorWrites:false,execution:false,credentials:false,device:false}));
