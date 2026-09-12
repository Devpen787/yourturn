// Real Next HTTP wiring, unauthenticated requests only, empty inherited env.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const port=3182,origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{env:{PATH:process.env.PATH,NODE_ENV:"production",HEDERA_NETWORK:"testnet"},stdio:["ignore","pipe","pipe"]});
let output="";for(const stream of [child.stdout,child.stderr])stream.on("data",chunk=>{output=(output+chunk.toString()).slice(-4000);});
try{
 let started=false;for(let i=0;i<40;i++){if(child.exitCode!==null)throw new Error("Next exited before HTTP test");try{const r=await fetch(origin+"/api/ledger/recovery-mandate/current?tokenId=0.0.700001&serial=7",{signal:AbortSignal.timeout(1000)});if(r.status===401){assert.equal(r.headers.get("cache-control"),"no-store");started=true;break;}}catch{}await delay(250);}
 assert(started,"New current route did not serve expected unauthenticated response");
 const body=JSON.stringify({tokenId:"0.0.700001",serial:"7",mandateId:"synthetic",digest:"0x"+"ab".repeat(32)});
 const unauth=await fetch(origin+"/api/ledger/recovery-mandate/revoke",{method:"POST",headers:{origin,"content-type":"application/json"},body,signal:AbortSignal.timeout(3000)});assert.equal(unauth.status,401);assert.equal((await unauth.json()).code,"SIGN_IN_REQUIRED");
 const cross=await fetch(origin+"/api/ledger/recovery-mandate/revoke",{method:"POST",headers:{origin:"https://other.invalid","content-type":"application/json"},body,signal:AbortSignal.timeout(3000)});assert.equal(cross.status,403);assert.equal((await cross.json()).code,"SAME_ORIGIN_REQUIRED");
 const unsupported=await fetch(origin+"/api/ledger/recovery-mandate/revoke",{signal:AbortSignal.timeout(3000)});assert.equal(unsupported.status,405);
 console.log(JSON.stringify({status:"PASS",checks:4,evidenceClass:"REAL_NEXT_HTTP_UNAUTHENTICATED",credentialsLoaded:false,authorizedMutations:0}));
}finally{child.kill("SIGTERM");await Promise.race([new Promise(resolve=>child.once("exit",resolve)),delay(3000)]);if(child.exitCode===null)child.kill("SIGKILL");}
