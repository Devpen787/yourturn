import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSingleBeginComposition } from '../lib/recovery/single-begin-composition.ts';

const claimed = Object.freeze({
  schemaVersion:1, operationId:'op-1', intentHash:'ab'.repeat(32), ownerId:'owner-1', mandateId:'mandate-1',
  token:'0.0.700001', serial:'1', agentId:'agent-1', action:'resale', pointer:'fixture', stableVersion:0,
  ownedVersion:1, expiresAt:4102444800, revision:0, fence:'fence-1', leaseUntil:4102444800,
  phase:'claimed', transactionId:null, envelopeDigest:null, receiptDigest:null,
});

function harness() {
  const events=[];
  const prepareDependencies={
    store:{}, revalidateMutableAuthority:async()=>{},
    resolveCanonicalState:async operation=>{events.push(`resolve:${operation.phase}`);return {fixture:true};},
  };
  const prepareFactory=deps=>({
    async prepareAndRetain(input){
      events.push(`prepare:${input.operation.phase}`);
      await deps.resolveCanonicalState(input.operation);
      events.push('begin-boundary');
      await deps.resolveCanonicalState(input.operation);
      events.push('retained');
      return {operation:{...input.operation,phase:'effect-started',revision:1,transactionId:'tx-1',envelopeDigest:'cd'.repeat(32)},retained:{fixture:true}};
    }
  });
  const composition=createSingleBeginComposition({prepareDependencies,prepareFactory});
  return {composition,events};
}

{
  const {composition,events}=harness();let rechecks=0;
  const result=await composition.run({operation:claimed,paymentAuthorization:{signatureHex:'11'.repeat(64)},revalidate:async operation=>{rechecks++;events.push(`world:${operation.phase}`);}});
  assert.equal(result.operation.phase,'effect-started');
  assert.equal(rechecks,2);
  assert.deepEqual(events,['prepare:claimed','world:claimed','resolve:claimed','begin-boundary','world:claimed','resolve:claimed','retained']);
}
{
  const {composition,events}=harness();
  await assert.rejects(composition.run({operation:{...claimed,phase:'effect-started'},paymentAuthorization:{signatureHex:'11'.repeat(64)},revalidate:async()=>{}}),/CLAIMED_OPERATION_REQUIRED/);
  assert.deepEqual(events,[]);
}
{
  const {composition,events}=harness();let calls=0;
  await assert.rejects(composition.run({operation:claimed,paymentAuthorization:{signatureHex:'11'.repeat(64)},revalidate:async()=>{calls++;throw Error('world stale');}}),/world stale/);
  assert.equal(calls,1);
  assert.deepEqual(events,['prepare:claimed']);
}
{
  const world=readFileSync(new URL('../lib/recovery/canonical-world-consumer.ts',import.meta.url),'utf8');
  assert(!world.includes('beginRecoveryOperationEffect'), 'World consumer must not own begin-effect');
  assert(!world.includes('recordRecoveryOperationEnvelope'), 'World consumer must not own retained-output recording');
  assert(world.includes("output.operation.phase === 'effect-started'"), 'World consumer must require downstream persisted effect-started state');
  assert(world.includes("isDeepStrictEqual(latest,output.operation)"), 'World consumer must reread authoritative operation state');
}
console.log('PASS single-begin composition seam: downstream adapter uniquely owns begin/retain and World revalidation stays load-bearing');
