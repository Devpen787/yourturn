import assert from 'node:assert/strict';
import { createPublicEnrollmentRegistry } from '../lib/policy/public-enrollment-registry.ts';
import { loadProvisionedPublicEnrollmentFromEnvironment, PUBLIC_ENROLLMENT_ENV } from '../lib/policy/public-enrollment-server-config.ts';

const now=Date.now();
const manifest={schemaVersion:1,version:'9',issuedAtMs:now-1000,expiresAtMs:now+60_000,revokedAtMs:null,records:[
 {kind:'provider',providerId:'provider-1',tokenId:'0.0.700001',serial:1,issuerId:'issuer-1',version:'1',expiresAtMs:now+50_000,revokedAtMs:null},
 {kind:'agent',ownerId:'owner-1',internalAgentId:'agent-1',version:'1',holderAccountId:'0.0.700002',worldRequester:'0x1111111111111111111111111111111111111111',hederaExecutorAccountId:'0.0.700003',resourceUri:'https://example.test/api/agent/confirm',expiresAtMs:now+50_000,revokedAtMs:null},
]};
const digest=createPublicEnrollmentRegistry(manifest).provenance.manifestDigest;
const env={
 [PUBLIC_ENROLLMENT_ENV.manifest]:JSON.stringify(manifest),
 [PUBLIC_ENROLLMENT_ENV.version]:'9',
 [PUBLIC_ENROLLMENT_ENV.digest]:digest,
 [PUBLIC_ENROLLMENT_ENV.minimumVersion]:'9',
};
const loaded=loadProvisionedPublicEnrollmentFromEnvironment(env);
assert.equal(loaded.provenance.manifestVersion,'9');assert.equal(loaded.provenance.manifestDigest,digest);
for(const key of [PUBLIC_ENROLLMENT_ENV.manifest,PUBLIC_ENROLLMENT_ENV.version,PUBLIC_ENROLLMENT_ENV.digest]){
 const bad={...env};delete bad[key];assert.throws(()=>loadProvisionedPublicEnrollmentFromEnvironment(bad),new RegExp(`MISSING_${key}`));
}
assert.throws(()=>loadProvisionedPublicEnrollmentFromEnvironment({...env,[PUBLIC_ENROLLMENT_ENV.digest]:'0'.repeat(64)}),/PROVISIONING_DIGEST_MISMATCH/);
assert.throws(()=>loadProvisionedPublicEnrollmentFromEnvironment({...env,[PUBLIC_ENROLLMENT_ENV.minimumVersion]:'10'}),/PROVISIONING_VERSION_ROLLBACK/);
assert.throws(()=>loadProvisionedPublicEnrollmentFromEnvironment({...env,[PUBLIC_ENROLLMENT_ENV.manifest]:'not-json'}),/INVALID_PUBLIC_ENROLLMENT_JSON/);
console.log('PASS public enrollment server config: exact JSON/version/digest required, no defaults, rollback blocked');
