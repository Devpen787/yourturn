import assert from 'node:assert/strict';
import { createPublicEnrollmentRegistry } from '../lib/policy/public-enrollment-registry.ts';
import { provisionPublicEnrollmentManifest } from '../lib/policy/public-enrollment-provisioning.ts';

const now=2_000_000_000_000;
const manifest={schemaVersion:1,version:'7',issuedAtMs:now-1000,expiresAtMs:now+60_000,revokedAtMs:null,records:[
 {kind:'provider',providerId:'provider-1',tokenId:'0.0.700001',serial:1,issuerId:'issuer-1',version:'3',expiresAtMs:now+50_000,revokedAtMs:null},
 {kind:'agent',ownerId:'owner-1',internalAgentId:'agent-1',version:'4',holderAccountId:'0.0.700002',worldRequester:'0x1111111111111111111111111111111111111111',hederaExecutorAccountId:'0.0.700003',resourceUri:'https://example.test/api/agent/confirm',expiresAtMs:now+50_000,revokedAtMs:null},
]};
const digest=createPublicEnrollmentRegistry(manifest,{now:()=>now}).provenance.manifestDigest;
const ok=provisionPublicEnrollmentManifest({manifest,reviewed:{version:'7',manifestDigest:digest},minimumAcceptedVersion:'7',now:()=>now});
assert.equal(ok.provenance.manifestDigest,digest);assert(Object.isFrozen(ok));assert(Object.isFrozen(ok.manifest));
await assert.rejects(async()=>provisionPublicEnrollmentManifest({manifest,reviewed:{version:'7',manifestDigest:'0'.repeat(64)},now:()=>now}),/PROVISIONING_DIGEST_MISMATCH/);
await assert.rejects(async()=>provisionPublicEnrollmentManifest({manifest,reviewed:{version:'6',manifestDigest:digest},now:()=>now}),/PROVISIONING_VERSION_MISMATCH/);
await assert.rejects(async()=>provisionPublicEnrollmentManifest({manifest,reviewed:{version:'7',manifestDigest:digest},minimumAcceptedVersion:'8',now:()=>now}),/PROVISIONING_VERSION_ROLLBACK/);
const changed=structuredClone(manifest);changed.records[1].hederaExecutorAccountId='0.0.700004';
await assert.rejects(async()=>provisionPublicEnrollmentManifest({manifest:changed,reviewed:{version:'7',manifestDigest:digest},now:()=>now}),/PROVISIONING_DIGEST_MISMATCH/);
console.log('PASS public enrollment provisioning: exact version/digest pin, rollback and same-version mutation denial');
