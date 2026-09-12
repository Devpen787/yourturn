import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { publishCurrentPaymentAuthorization, loadCurrentPaymentAuthorization } from '../lib/hedera-agent-kit/current-payment-authorization.ts';

function fixture(){
 const map=new Map();let now=2_000_000_000_000,evals=0,checks=0;
 const store={get:async k=>map.get(k)??null,eval:async(_s,keys,args)=>{evals++;if(map.has(keys[0]))return 0;if(Number(args[1])<=now)return -1;map.set(keys[0],args[0]);return 1;}};
 const ownerId='owner-1',operationId='op-1',buyerAccountId='0.0.700003';
 const record={schemaVersion:1,ownerId,operationId,commitmentDigest:createHash('sha256').update('commitment').digest('hex'),buyerAccountId,signatureHex:'11'.repeat(64),expiresAtMs:now+60_000};
 const publisher={publisherId:'buyer-session-1',ownerId,buyerAccountId};
 let fingerprint='ab'.repeat(32),validUntilMs=now+120_000;
 const validateCurrentAuthorization=async input=>{checks++;assert.deepEqual(input.publisher,publisher);assert.deepEqual(input.record,record);return {authorityFingerprint:fingerprint,validUntilMs};};
 return {map,store,now:()=>now,setNow:v=>now=v,record,publisher,validateCurrentAuthorization,setFingerprint:v=>fingerprint=v,setValidity:v=>validUntilMs=v,evals:()=>evals,checks:()=>checks,ownerId,operationId};
}
{
 const x=fixture();const published=await publishCurrentPaymentAuthorization({store:x.store,now:x.now,publisher:x.publisher,record:x.record,validateCurrentAuthorization:x.validateCurrentAuthorization});
 assert.equal(published.commitmentDigest,x.record.commitmentDigest);assert.equal(x.evals(),1);assert.equal(x.checks(),3);
 const loaded=await loadCurrentPaymentAuthorization({store:x.store,now:x.now,operationId:x.operationId,authenticatedOwnerId:x.ownerId,expectedCommitmentDigest:x.record.commitmentDigest});
 assert.equal(loaded.signatureHex,x.record.signatureHex);assert.equal(loaded.buyerAccountId,x.record.buyerAccountId);
}
{
 const x=fixture();await publishCurrentPaymentAuthorization({store:x.store,now:x.now,publisher:x.publisher,record:x.record,validateCurrentAuthorization:x.validateCurrentAuthorization});
 await assert.rejects(publishCurrentPaymentAuthorization({store:x.store,now:x.now,publisher:x.publisher,record:x.record,validateCurrentAuthorization:x.validateCurrentAuthorization}),/PAYMENT_AUTHORIZATION_ALREADY_EXISTS/);
 assert.equal(x.evals(),1);
}
{
 const x=fixture();let n=0;const changing=async()=>({authorityFingerprint:(++n===1?'ab':'cd').repeat(32),validUntilMs:x.record.expiresAtMs+60_000});
 await assert.rejects(publishCurrentPaymentAuthorization({store:x.store,now:x.now,publisher:x.publisher,record:x.record,validateCurrentAuthorization:changing}),/PAYMENT_AUTHORIZATION_AUTHORITY_CHANGED/);assert.equal(x.evals(),0);
}
{
 const x=fixture();await publishCurrentPaymentAuthorization({store:x.store,now:x.now,publisher:x.publisher,record:x.record,validateCurrentAuthorization:x.validateCurrentAuthorization});
 await assert.rejects(loadCurrentPaymentAuthorization({store:x.store,now:x.now,operationId:x.operationId,authenticatedOwnerId:x.ownerId,expectedCommitmentDigest:'cd'.repeat(32)}),/PAYMENT_AUTHORIZATION_COMMITMENT_MISMATCH/);
 x.setNow(x.record.expiresAtMs+1);await assert.rejects(loadCurrentPaymentAuthorization({store:x.store,now:x.now,operationId:x.operationId,authenticatedOwnerId:x.ownerId,expectedCommitmentDigest:x.record.commitmentDigest}),/PAYMENT_AUTHORIZATION_EXPIRED/);
}
{
 const x=fixture();const badPublisher={...x.publisher,buyerAccountId:'0.0.700004'};
 await assert.rejects(publishCurrentPaymentAuthorization({store:x.store,now:x.now,publisher:badPublisher,record:x.record,validateCurrentAuthorization:x.validateCurrentAuthorization}),/PAYMENT_AUTHORIZATION_PUBLISHER_MISMATCH/);assert.equal(x.evals(),0);
}
console.log('PASS durable payment authorization: immutable publication, exact commitment binding, buyer/owner scope, drift/duplicate/expiry negatives');
