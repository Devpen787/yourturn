import assert from 'node:assert/strict';
import { publishCurrentBusinessEligibility, loadCurrentBusinessEligibility } from '../lib/hedera-agent-kit/current-business-eligibility.ts';

function fixture(){
  const map=new Map();let now=Date.now(),evals=0,checks=0;
  const store={
    get:async key=>map.get(key)??null,
    eval:async(_script,keys,args)=>{evals++;const key=keys[0];if(map.has(key))return 0;if(Number(args[1])<=now)return -1;map.set(key,args[0]);return 1;},
  };
  const ownerId='owner-1',operationId='op-1';
  const candidate={schemaVersion:1,version:'1',ownerId,operationId,tokenId:'0.0.700001',serial:1,holderAccountId:'0.0.700002',buyerAccountId:'0.0.700003',status:'HELD',acquirerEligible:true,validUntilMs:now+60_000};
  const publisher={publisherId:'business-source-1',ownerId};
  let sourceVersion='1',sourceValidUntilMs=now+120_000;
  const validateCurrentBusinessFacts=async input=>{checks++;assert.deepEqual(input.publisher,publisher);assert.deepEqual(input.candidate,candidate);return {sourceVersion,validUntilMs:sourceValidUntilMs};};
  return {map,store,candidate,publisher,validateCurrentBusinessFacts,now:()=>now,setNow:v=>now=v,setSourceVersion:v=>sourceVersion=v,setSourceExpiry:v=>sourceValidUntilMs=v,evals:()=>evals,checks:()=>checks,operationId,ownerId};
}

{
 const x=fixture();const saved=await publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:x.candidate,validateCurrentBusinessFacts:x.validateCurrentBusinessFacts});
 assert.deepEqual(saved,x.candidate);assert.equal(x.evals(),1);assert.equal(x.checks(),3);
 assert.deepEqual(await loadCurrentBusinessEligibility({store:x.store,now:x.now,operationId:x.operationId,authenticatedOwnerId:x.ownerId}),x.candidate);
}
{
 const x=fixture();await publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:x.candidate,validateCurrentBusinessFacts:x.validateCurrentBusinessFacts});
 await assert.rejects(publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:x.candidate,validateCurrentBusinessFacts:x.validateCurrentBusinessFacts}),/ELIGIBILITY_OPERATION_ALREADY_EXISTS/);
 assert.equal(x.evals(),1);
}
{
 const x=fixture();let calls=0;
 const changing=async()=>{calls++;return {sourceVersion:String(calls),validUntilMs:x.candidate.validUntilMs+60_000};};
 await assert.rejects(publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:x.candidate,validateCurrentBusinessFacts:changing}),/BUSINESS_ELIGIBILITY_CHANGED/);
 assert.equal(x.evals(),0);
}
{
 const x=fixture();const bad={...x.candidate,buyerAccountId:x.candidate.holderAccountId};
 await assert.rejects(publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:bad,validateCurrentBusinessFacts:x.validateCurrentBusinessFacts}),/ELIGIBILITY_ROLE_COLLISION/);
 assert.equal(x.evals(),0);
}
{
 const x=fixture();await publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:x.candidate,validateCurrentBusinessFacts:x.validateCurrentBusinessFacts});
 x.setNow(x.candidate.validUntilMs+1);
 await assert.rejects(loadCurrentBusinessEligibility({store:x.store,now:x.now,operationId:x.operationId,authenticatedOwnerId:x.ownerId}),/ELIGIBILITY_EXPIRED/);
}
{
 const x=fixture();await publishCurrentBusinessEligibility({store:x.store,now:x.now,publisher:x.publisher,expectedVersion:'0',candidate:x.candidate,validateCurrentBusinessFacts:x.validateCurrentBusinessFacts});
 await assert.rejects(loadCurrentBusinessEligibility({store:x.store,now:x.now,operationId:x.operationId,authenticatedOwnerId:'other-owner'}),/ELIGIBILITY_OWNER_OR_OPERATION_MISMATCH/);
}
console.log('PASS current business eligibility source: validated publication, immutable current read, duplicate/change/expiry/role/owner negatives');
