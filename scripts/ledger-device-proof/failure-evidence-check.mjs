import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import {assertExpectedCeremonyResult, sanitizeDeviceState} from "./ceremony.mjs";
import {assertUnexpiredPrepared, assertUnusedEvidencePath, preserveFailedCeremony} from "./failure-evidence.mjs";

const root=await fs.mkdtemp(path.join(os.tmpdir(),"yt-ledger-failure-test-"));
const checks=[];
const test=async(name,fn)=>{await fn();checks.push(name);};
const digest=`0x${"ab".repeat(32)}`;
const signing={events:[{status:"pending",step:"signer.eth.steps.signTypedData",requiredUserInteraction:"signTypedData"},
  {status:"error",errorTag:"EthAppCommandError",errorCode:"6984",errorMessage:"DO_NOT_CAPTURE_FREEFORM"}],
  output:null,cancelRequested:false};
const write=(out,observed=signing)=>preserveFailedCeremony({out,expectation:"reject",mandateDigest:digest,signing:observed});
try {
  await test("failed ceremony preserves observed typed-data/error context but never qualifies",async()=>{
    assert.throws(()=>assertExpectedCeremonyResult({expectation:"reject",events:signing.events,signature:null}),/reject/);
    const out=path.join(root,"reject.json");const destination=await write(out);
    const record=JSON.parse(await fs.readFile(destination,"utf8"));
    assert.equal(record.qualificationPassed,false);assert.equal(record.evidenceLevel,"UNQUALIFIED_DEVICE_OBSERVATIONS");
    assert.equal(record.signingStates[1].errorCode,"6984");assert.equal(record.signingStates[1].errorTag,"EthAppCommandError");
    assert.equal(record.signingStates[0].step,"signer.eth.steps.signTypedData");
    assert.equal(record.activationAttempted,false);assert.equal(record.signaturePersisted,false);
    assert.notEqual(record.schema,"yourturn-ledger-recovery-mandate-device-proof/v1");
  });
  await test("failure capture excludes raw SDK output/signatures/errors/cookies/device names",async()=>{
    const value="DO_NOT_CAPTURE_PRIVATE";
    const observed={...signing,output:{r:value,s:value,v:value},signature:value,cookie:value,device:{name:value},
      events:[{status:value,requiredUserInteraction:value,errorMessage:value,output:value,signature:value,errorTag:value,errorCode:value}]};
    const file=await write(path.join(root,"privacy.json"),observed);const text=await fs.readFile(file,"utf8");
    assert.equal(text.includes(value),false);assert.equal(JSON.parse(text).outputObserved,true);
    assert.equal((await fs.stat(file)).mode & 0o777,0o600);
  });
  await test("exclusive failure writes preserve original bytes",async()=>{
    const out=path.join(root,"reject.json");const before=await fs.readFile(`${out}.failure.json`);
    await assert.rejects(write(out),{code:"EEXIST"});assert.deepEqual(await fs.readFile(`${out}.failure.json`),before);
  });
  await test("existing success/failure paths and symlinks block before hardware",async()=>{
    const success=path.join(root,"success.json");await fs.writeFile(success,"prior");
    await assert.rejects(assertUnusedEvidencePath(success),/already exists/);
    await assert.rejects(assertUnusedEvidencePath(path.join(root,"reject.json")),/already exists/);
    const link=path.join(root,"link.json");await fs.symlink(path.join(root,"missing"),link);
    await assert.rejects(assertUnusedEvidencePath(link),/already exists/);
    await assertUnusedEvidencePath(path.join(root,"fresh.json"));
  });
  await test("missing observations remain empty instead of synthesized",async()=>{
    const file=await write(path.join(root,"empty.json"),{});const record=JSON.parse(await fs.readFile(file,"utf8"));
    assert.deepEqual(record.signingStates,[]);assert.equal(record.qualificationPassed,false);
  });
  await test("host cancel and observable-error facts survive without becoming rejection proof",async()=>{
    const file=await write(path.join(root,"cancel.json"),{...signing,cancelRequested:true,observableFailed:true});
    const record=JSON.parse(await fs.readFile(file,"utf8"));assert.equal(record.cancelRequested,true);
    assert.equal(record.observableFailed,true);assert.equal(record.qualificationPassed,false);
  });
  await test("expired/malformed mandates fail before device access",async()=>{
    for(const expiresAt of [1699999999,1700000000,"bad",undefined,-1,"9007199254740992"])
      assert.throws(()=>assertUnexpiredPrepared({typedData:{message:{expiresAt}}},1700000000000),/expired|invalid/);
    assertUnexpiredPrepared({typedData:{message:{expiresAt:"1700000001"}}},1700000000000);
  });
  const source=await fs.readFile(new URL("device-proof.mjs",import.meta.url),"utf8");
  await test("real observer error path retains preceding states without raw output",async()=>{
    const start=source.indexOf("async function executeAction(");const end=source.indexOf("function printEvent",start);
    const collect=vm.runInNewContext(`(${source.slice(start,end).trim()})`,{sanitizeDeviceState,DeviceActionStatus:{Completed:"completed",Error:"error"},Promise,Error});
    const action={observable:{subscribe(observer){
      observer.next({status:"pending",intermediateValue:{step:"signer.eth.steps.signTypedData",requiredUserInteraction:"signTypedData"}});
      observer.error(new Error("DO_NOT_CAPTURE_PRIVATE"));
    }}};
    try {await collect(action,{expectation:"reject",onEvent:()=>{}});assert.fail("expected observer failure");}
    catch(error){assert.equal(error.message,"Ledger signing observable failed");assert.equal(error.ledgerObservedAction.events.length,1);
      assert.equal(error.ledgerObservedAction.observableFailed,true);assert.equal("output" in error.ledgerObservedAction,false);}
  });
  await test("runner checks freshness before discovery, signing and acceptance, preserves failures, and cannot overwrite success",async()=>{
    assert.equal(source.split("assertUnexpiredPrepared(prepared)").length-1,3);
    assert.ok(source.indexOf("assertUnusedEvidencePath(args.out)")<source.indexOf("new DeviceManagementKitBuilder"));
    assert.match(source,/const observed = signingStarted \? signing \?\? error\?\.ledgerObservedAction : null/);
    assert.match(source,/preserveFailedCeremony\(\{out:args.out/);assert.match(source,/flag:"wx", mode:0o600/);
  });
  const doc=await fs.readFile(new URL("../../docs/ethonline-2026/ledger/DEVICE_QUALIFICATION_RUNBOOK.md",import.meta.url),"utf8");
  await test("human runbook preserves prior evidence and documents both contextual codes",async()=>{
    assert.equal(doc.includes("rm -rf ../../output/ledger-qualification"),false);
    assert.ok(doc.includes("mktemp -d"));assert.ok(doc.includes("6982")&&doc.includes("6985"));
  });
  console.log(JSON.stringify({status:"PASS",evidenceClass:"CI/LOCAL_SYNTHETIC_FAILURE_CAPTURE",checks:checks.length,assertions:checks,
    hardwareTouched:false,credentialsLoaded:false,signaturesProduced:false,authorityActivated:false},null,2));
} finally {await fs.rm(root,{recursive:true,force:true});}
