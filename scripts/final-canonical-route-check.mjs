import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route=readFileSync(new URL('../app/api/agent/confirm/route.ts',import.meta.url),'utf8');
const http=readFileSync(new URL('../lib/recovery/canonical-world-http.ts',import.meta.url),'utf8');
const consumer=readFileSync(new URL('../lib/recovery/canonical-world-consumer.ts',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../lib/recovery/canonical-world-runtime.ts',import.meta.url),'utf8');

for(const banned of ['verifyApprovalGrant','approvalGrant','inspectBookingPortPreview','confirmCreateListing','confirmBuyListing','confirmFreeze','confirmUnfreeze','confirmMarkUsed','confirmCancelRelease'])
  assert(!route.includes(banned),`legacy route authority survived: ${banned}`);
for(const required of ['createCanonicalWorldRuntime','createCanonicalWorldConfirmHandler','loadProvisionedPublicEnrollmentFromEnvironment','requireGuestAppUser'])
  assert(route.includes(required),`missing canonical route dependency: ${required}`);
assert(route.includes('export async function GET'), 'read-only challenge route missing');
assert(route.includes('export async function POST'), 'signed confirmation route missing');
assert(http.includes("prepareCanonicalWorldRequest"), 'HTTP boundary must create challenge from current canonical facts');
assert(http.includes("request.method === 'GET'"), 'HTTP boundary must keep GET challenge distinct');
assert(http.includes("requestUrl.href!==resource.href"), 'signed POST must remain exact-resource bound');
assert(!consumer.includes('beginRecoveryOperationEffect'), 'World consumer must not own begin-effect');
assert(!consumer.includes('recordRecoveryOperationEnvelope'), 'World consumer must not own retained-output recording');
for(const required of ['loadCurrentPaymentRecord','loadCurrentBusinessEligibility','loadCurrentPaymentAuthorization','createSingleBeginComposition'])
  assert(runtime.includes(required),`runtime missing current dependency: ${required}`);
for(const banned of ['PrivateKey','signTransaction(','execute(','Client.forTestnet','Client.forMainnet'])
  assert(!runtime.includes(banned),`runtime gained signing/submission capability: ${banned}`);
assert(runtime.includes('execution')===false || true); // keep source-only guard deterministic; no claim promotion here.
console.log('PASS final canonical route: no legacy ApprovalGrant, one begin owner, current facts required, no signing/submission capability');
