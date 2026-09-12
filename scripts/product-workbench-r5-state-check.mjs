import assert from 'node:assert/strict';
import { INITIAL_HOLDER_FIXTURE, reduceHolderFixture, readHolderFixture, assertFixtureMandateTime, FIXTURE_MANDATE_EXPIRES_AT_MS, fixtureScenarioTimeMs } from '../app/product-preview/holder-fixture-state.ts';
function approved(){let s={...INITIAL_HOLDER_FIXTURE};for(const a of [{type:'acknowledge',value:true},{type:'begin-approval'},{type:'approval-result',result:'approved'}])s=reduceHolderFixture(s,a);return s;}
let checks=0;
for(const result of ['approved','rejected','cancelled']){
 let s=approved();for(const a of [{type:'select-minimum',value:30},{type:'begin-approval'},{type:'approval-result',result}])s=reduceHolderFixture(s,a);
 s=reduceHolderFixture(s,{type:'offer',amount:result==='approved'?32:45});s=reduceHolderFixture(s,{type:'recover'});
 assert.equal(s.settledMinimum,result==='approved'?30:40);assert.equal(readHolderFixture(JSON.stringify(s)).settledMinimum,s.settledMinimum);assert.deepEqual(reduceHolderFixture(s,{type:'recover'}),s);checks++;
}
let pending=approved();pending=reduceHolderFixture(pending,{type:'select-minimum',value:30});pending=reduceHolderFixture(pending,{type:'begin-approval'});pending=reduceHolderFixture(pending,{type:'offer',amount:45});pending=reduceHolderFixture(pending,{type:'recover'});assert.equal(pending.settledMinimum,40);checks++;
assertFixtureMandateTime(FIXTURE_MANDATE_EXPIRES_AT_MS-1);checks++;
for(const time of [FIXTURE_MANDATE_EXPIRES_AT_MS,FIXTURE_MANDATE_EXPIRES_AT_MS+1,NaN,Infinity]){assert.throws(()=>assertFixtureMandateTime(time));checks++;}
assert.equal(fixtureScenarioTimeMs(INITIAL_HOLDER_FIXTURE),Date.parse('2026-09-11T17:00:00+02:00'));checks++;
const corrupt={...pending,settledMinimum:30.5};assert.throws(()=>readHolderFixture(JSON.stringify(corrupt)));checks++;
const legacy={...pending};delete legacy.settledMinimum;assert.equal(readHolderFixture(JSON.stringify(legacy)).settledMinimum,undefined);checks++;
console.log(JSON.stringify({status:'PASS',checks,evidenceClass:'FIXTURE',renderedExpiredJourney:false}));
