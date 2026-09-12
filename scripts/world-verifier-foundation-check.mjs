import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Wallet } from 'ethers';
import { formatSIWEMessage, parseAgentkitHeader, verifyAgentkitSignature } from '@worldcoin/agentkit';
import { verifyWorldAgentRequest } from '../lib/world-agentkit/server-verifier.ts';

let checks = 0;
async function test(name, fn) { await fn(); checks++; console.log('PASS ' + name); }
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const digest = s => createHash('sha256').update(s).digest('hex');
await test('exact qualified source and inherited contract retained', () => {
  for (const [p, hash] of Object.entries({
    'lib/world-agentkit/server-verifier.ts': '562896914488f35e6414e13684f60ec779f369ab87e147ee97a93738a2f4be7c',
    'lib/world-agentkit/trust-boundary.ts': 'a370780f76f214bcadbfe18b0a04e78ac39269798d3e8399f2a95561e55715fb',
    'lib/world-agentkit/nonce-store.ts': 'd38df9e65b07c5e235c4a4c6512b22a689df6cef219a7ceec4664086c358352f',
    'scripts/world-agent-contract-check.mjs': '7b28dd0e7b6ce4d05624b519a79be210ee307b51bcce93cb4feaa412da100840',
  })) assert.equal(digest(read(p)), hash, p);
});
await test('all inherited locked versions and integrity plus overrides preserved', () => {
  const lock = JSON.parse(read('package-lock.json'));
  const added = new Set([
    'node_modules/@worldcoin/agentkit', 'node_modules/@worldcoin/agentkit-core',
    'node_modules/@worldcoin/agentkit-core/node_modules/@noble/curves',
    'node_modules/@worldcoin/agentkit-core/node_modules/@noble/hashes',
    'node_modules/@worldcoin/agentkit-core/node_modules/zod',
  ]);
  const rows = Object.keys(lock.packages).filter(k => k && !added.has(k)).sort().map(k => {
    const v = lock.packages[k]; return [k, v.version ?? null, v.resolved ?? null, v.integrity ?? null];
  });
  assert.equal(digest(JSON.stringify(rows)), '135a291f6ca73b538f317e1bc2f286cd788703e96a24ad155c05d2f0cb7b911a');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['@worldcoin/agentkit'], '0.2.1');
  assert.equal(lock.packages['node_modules/@worldcoin/agentkit'].version, '0.2.1');
  assert.equal(lock.packages['node_modules/@worldcoin/agentkit-core'].version, '0.2.1');
  assert.deepEqual(pkg.overrides, {
    pino: '8.17.2', nanoid: '^3.3.19', 'js-yaml': '^4.3.2', axios: '^1.20.0',
    browserslist: '^4.28.9', viem: '^2.56.3', '@hashgraph/hedera-agent-kit': { ws: '^8.21.3' },
    '@walletconnect/jsonrpc-ws-connection': { ws: '7.5.11' },
  });
});

// Public deterministic test-only key, never an enrolled or funded identity.
const wallet = new Wallet('0x' + '11'.repeat(32));
const resource = 'https://fixture.invalid/api/agent/confirm';
function store() {
  const used = new Set();
  const key = x => JSON.stringify([x.resourceUri, x.nonce]);
  return { used, async isFresh(x) { return !used.has(key(x)); }, async consume(x) {
    if (used.has(key(x))) return false; used.add(key(x)); return true;
  } };
}
async function header(overrides = {}) {
  const now = Date.now();
  const info = { domain: 'fixture.invalid', uri: resource, statement: 'Synthetic qualification only',
    version: '1', nonce: 'fixtureNonce0001', issuedAt: new Date(now).toISOString(),
    expirationTime: new Date(now + 120_000).toISOString(), resources: [resource],
    chainId: 'eip155:8453', type: 'eip191', ...overrides };
  const signature = await wallet.signMessage(formatSIWEMessage(info, wallet.address));
  return Buffer.from(JSON.stringify({ ...info, address: wallet.address, signature })).toString('base64');
}
const registered = { async lookupHuman(address) { assert.equal(address.toLowerCase(), wallet.address.toLowerCase()); return 'synthetic-human-marker'; } };
async function run(agentkitHeader, overrides = {}) {
  return verifyWorldAgentRequest({ agentkitHeader, expectedResourceUri: resource,
    expectedAgentAddress: wallet.address, nonceStore: store(), agentBook: registered, ...overrides });
}
await test('actual installed official parser and EIP191 signature recovery', async () => {
  const parsed = parseAgentkitHeader(await header());
  const verified = await verifyAgentkitSignature(parsed);
  assert.equal(verified.valid, true); assert.equal(verified.address.toLowerCase(), wallet.address.toLowerCase());
});
await test('concurrent identical signatures permit one nonce winner', async () => {
  const h = await header(), nonceStore = store();
  const results = await Promise.all(Array.from({ length: 12 }, () => run(h, { nonceStore })));
  assert.equal(results.filter(r => r.status === 'allowed').length, 1);
  assert.equal(results.filter(r => r.status === 'blocked').length, 11);
  assert.equal(nonceStore.used.size, 1);
  assert(!JSON.stringify(results).includes('synthetic-human-marker'));
});
for (const malformed of ['not-json', Buffer.from('{}').toString('base64'), Buffer.from('null').toString('base64')]) {
  await test('malformed official header denied: ' + malformed, async () => {
    assert.equal((await run(malformed)).reason, 'invalid_agentkit_header');
  });
}
await test('AgentBook outage cannot consume nonce', async () => {
  const nonceStore = store();
  assert.equal((await run(await header(), { nonceStore, agentBook: { async lookupHuman() { throw Error('synthetic outage'); } } })).reason, 'agentbook_unavailable');
  assert.equal(nonceStore.used.size, 0);
});
await test('nonce freshness storage outage denied', async () => {
  const nonceStore = { async isFresh() { throw Error('synthetic outage'); }, async consume() { assert.fail('must not consume'); } };
  assert.equal((await run(await header(), { nonceStore })).reason, 'nonce_store_unavailable');
});
await test('nonce consumption storage outage denied', async () => {
  const nonceStore = { async isFresh() { return true; }, async consume() { throw Error('synthetic outage'); } };
  assert.equal((await run(await header(), { nonceStore })).reason, 'nonce_store_unavailable');
});
await test('signed expired message denied before AgentBook lookup', async () => {
  const h = await header({ issuedAt: new Date(Date.now() - 120_000).toISOString(), expirationTime: new Date(Date.now() - 60_000).toISOString() });
  assert.equal((await run(h, { agentBook: { async lookupHuman() { assert.fail('must not lookup expired message'); } } })).reason, 'agentkit_message_invalid');
});
await test('signed old message denied under explicit age bound', async () => {
  const h = await header({ issuedAt: new Date(Date.now() - 120_000).toISOString() });
  assert.equal((await run(h, { maxAgeMs: 1000 })).reason, 'agentkit_message_invalid');
});
await test('query and alternate origin cannot widen resource', async () => {
  for (const uri of [resource + '?other=1', 'https://other.invalid/api/agent/confirm']) {
    assert.equal((await run(await header({ uri, domain: new URL(uri).hostname }))).status, 'blocked');
  }
});
await test('verification signal is bounded and contains no execution permission', async () => {
  const result = await run(await header());
  assert.equal(result.status, 'allowed');
  assert.equal(Date.parse(result.verification.expiresAt) - Date.parse(result.verification.verifiedAt), 60_000);
  assert.deepEqual(Object.keys(result.verification).sort(), ['source', 'agentAddress', 'humanBacked', 'agentBookResolved', 'resourceUri', 'verifiedAt', 'expiresAt'].sort());
});
console.log(JSON.stringify({ status: 'PASS', checks, evidenceClass: 'LOCAL_SYNTHETIC', realAgentBook: false, execution: false }));
