import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const manifest=JSON.parse(read('docs/ethonline-2026/HEDERA_PREPARE_RETAIN_SOURCES.json'));
const hash=p=>createHash('sha256').update(read(p)).digest('hex');
for(const [path,expected] of Object.entries(manifest.protectedGraph))assert.equal(hash(path),expected,path+' changed patched Ledger graph');
for(const source of manifest.exactImportedSources)assert.equal(hash(source.path),source.sha256,source.path+' drifted from exact qualified source');
console.log(JSON.stringify({status:'PASS',patchedLedgerGraphUnchanged:true,exactImportedSources:manifest.exactImportedSources.length}));
