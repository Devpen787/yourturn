// One explicit initial fixture, then actual controls across actor entry locations.
// Test-only clock/read/service-response events below change only named environment
// fields. They cannot create approval, payment, ownership, attendance or success.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';
import { bookingFixture, storedFixture } from './product-workbench-booking-fixtures.mjs';
const base = new URL(process.env.PRODUCT_WORKBENCH_BASE_URL ?? 'http://127.0.0.1:3000');
assert(['127.0.0.1','localhost','[::1]'].includes(base.hostname));
const modelSource=await readFile(new URL('../app/product-preview/holder-fixture-state.ts',import.meta.url),'utf8');
const {readHolderFixture}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(modelSource)).toString('base64'));
const key='yourturn:product-preview:holder:v1', event='yourturn:holder-fixture-changed';
const out=path.resolve('artifacts/product-workbench/r4'); await mkdir(out,{recursive:true});
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true}),results=[];
const visible=async(p,text)=>{await p.getByText(text,{exact:false}).first().waitFor({state:'visible'});};
const duplicate=(p,name)=>p.locator('main').getByRole('button',{name,exact:true}).evaluate(el=>{el.click();el.click();});
const click=(p,name,role='button')=>p.locator('main').getByRole(role,{name,exact:true}).click();
async function location(p,v){await p.waitForURL(u=>u.searchParams.get('view')===v);}
async function unchanged(p,before){assert.deepEqual(await storedFixture(p),before);}
async function history(p){const before=await storedFixture(p);await p.reload({waitUntil:'networkidle'});await unchanged(p,before);await p.goBack({waitUntil:'networkidle'});await unchanged(p,before);await p.goForward({waitUntil:'networkidle'});await unchanged(p,before);}
async function headerReturn(p,label,view,identity,body){
 const before=await storedFixture(p);await p.locator('header').getByRole('link',{name:label,exact:true}).click();await location(p,view);await visible(p,body);assert((await p.locator('header').innerText()).includes(identity));await unchanged(p,before);
}
async function environment(p,patch,record){
  assert(Object.keys(patch).every(k=>['checkinWindow','holderRead','fulfilmentResponse'].includes(k)));
  const before=await storedFixture(p);
  const next={...before,continuation:{...before.continuation,...patch},revision:before.revision+1};
  readHolderFixture(JSON.stringify(next));
  const {revision:_beforeRevision,continuation:beforeContinuation,...beforeFacts}=before;
  const {revision:_afterRevision,continuation:afterContinuation,...afterFacts}=next;
  assert.deepEqual(afterFacts,beforeFacts);
  for(const field of Object.keys(beforeContinuation)) if(!(field in patch)) assert.deepEqual(afterContinuation[field],beforeContinuation[field]);
  await p.evaluate(({key,event,next})=>{localStorage.setItem(key,JSON.stringify(next));window.dispatchEvent(new Event(event));},{key,event,next});
  await unchanged(p,next);record.events.push({kind:'TEST_ENVIRONMENT_ONLY',patch,beforeRevision:before.revision,afterRevision:next.revision});
}
try{for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
 const context=await browser.newContext({viewport});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base.origin&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
 const record={viewport:name,status:'FAIL',seedCount:1,evidenceClass:'FIXTURE',booking:'friday-yoga',events:[],screenshots:[],checkpoints:[],errors:[]};
 const page=async()=>{const p=await context.newPage();p.setDefaultTimeout(7000);p.on('pageerror',e=>record.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')record.errors.push(m.text());});return p;};
 const maya=await page();
 const entry=async(p,v='')=>{const before=await storedFixture(maya).catch(()=>null);await p.goto(base.origin+'/product-preview'+(v?'?view='+v:''),{waitUntil:'networkidle'});if(before)await unchanged(p,before);};
 const snap=async(p,label)=>{const file=name+'-'+label+'.png';await p.screenshot({path:path.join(out,file),fullPage:true});record.screenshots.push(file);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,'Overflow');record.checkpoints.push({label,header:await p.locator('header').innerText(),url:new URL(p.url()).pathname+new URL(p.url()).search,state:await storedFixture(p)});};
 try{
  await entry(maya);
  // Exactly one seed on this origin, before any user actions. No approved state.
  const initial=bookingFixture({revision:0,confirmedScope:false,activeMinimum:null,approvalStatus:'idle'}, {version:2,fulfilmentAttempts:0,fulfilmentCount:0,fulfilmentResponse:'fail-once'});
  await maya.evaluate(({key,event,initial})=>{localStorage.setItem(key,JSON.stringify(initial));window.dispatchEvent(new Event(event));},{key,event,initial});
  await snap(maya,'cold-prepared-maya');
  await click(maya,'Open my bookings');await maya.getByText('View booking →',{exact:true}).click();await click(maya,'Change plans');await maya.getByRole('button',{name:/Let YourTurn handle it/}).click();await maya.getByRole('checkbox').check();
  for(const n of ['Continue to secure approval','Approve on secure device','Connect Ledger'])await click(maya,n);
  await location(maya,'ledger-waiting');assert.equal((await storedFixture(maya)).approvalStatus,'waiting');await history(maya);await snap(maya,'approval-interrupted-resumed');
  for(const n of ['Check approval status','View active recovery','See latest offer'])await click(maya,n);
  await visible(maya,'32 USDC was not accepted.');assert.equal((await storedFixture(maya)).activeMinimum,40);await snap(maya,'32-denied');await headerReturn(maya,'My bookings','bookings','Maya Keller','Friday Yoga');await snap(maya,'maya-header-return');
  const bob=await page();await entry(bob,'xc-find');assert((await bob.locator('header').innerText()).includes('Bob'));
  await bob.getByRole('button',{name:/View Friday Yoga/}).click();await location(bob,'xc-eligibility');
  const staleBob=await page();await entry(staleBob,'xc-find');await staleBob.getByRole('button',{name:/View Friday Yoga/}).click();
  // Persist failure is injected at actual payment control; no fixture outcome rewrite.
  const beforePayment=await storedFixture(bob);
  await bob.evaluate(key=>{const original=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Test unavailable','QuotaExceededError');return original.call(this,k,v);};},key);
  await click(bob,'Commit 45 USDC');await visible(bob,'Your booking state could not be saved.');await unchanged(bob,beforePayment);await snap(bob,'payment-save-failure');
  await bob.evaluate(()=>window.restoreStorage());await click(bob,'Retry loading booking state');await duplicate(bob,'Commit 45 USDC');await location(bob,'xc-payment-pending');
  await location(staleBob,'xc-payment-pending');assert.equal((await storedFixture(bob)).continuation.paymentAttempts,1);await history(bob);await headerReturn(bob,'Find a spot','xc-payment-pending','Bob','Check payment status');await snap(bob,'payment-interrupted-resumed');
  // Bob refreshes; the other tab converges on the same committed attempt.
  await click(bob,'Check payment status');await location(bob,'xc-opportunity');await location(staleBob,'xc-opportunity');
  assert.equal((await storedFixture(bob)).continuation.paymentAttempts,1);assert.equal((await storedFixture(bob)).settlementCount,0);
  const studio=await page();await entry(studio,'xc3-provider-session-draft');
  await studio.getByLabel('Capacity').fill('0');await click(studio,'Publish session');await visible(studio,'Fix before publishing');assert.equal((await storedFixture(bob)).holder,'maya');await snap(studio,'invalid-provider-input');
  await studio.getByLabel('Capacity').fill('12');await studio.getByLabel('Eligibility rule').fill('Recovery paused');await click(studio,'Publish session');
  await click(bob,'Check handoff status');await visible(bob,'This action is not available');assert.equal((await storedFixture(bob)).holder,'maya');await snap(bob,'published-policy-blocked');
  await entry(studio,'xc3-provider-session-draft');await studio.getByLabel('Eligibility rule').fill('Eligible Studio A customer · no duplicate session');await click(studio,'Publish session');
  await click(bob,'Retry loading booking state');
  await environment(bob,{holderRead:'stale'},record);await visible(bob,"We're still confirming who holds Friday Yoga.");await click(bob,'Check again');await snap(bob,'unknown-handoff');assert.equal((await storedFixture(bob)).settlementCount,0);
  await history(bob);await environment(bob,{holderRead:'current'},record);await click(bob,'Check again');await location(bob,'xc-reconciling');await click(bob,'Refresh booking');await location(bob,'xc-bob-success');
  const acquired=await storedFixture(bob);assert.equal(acquired.holder,'bob');assert.equal(acquired.recoveredAmount,45);assert.equal(acquired.settlementCount,1);assert.equal(acquired.continuation.paymentAttempts,1);
  await location(staleBob,'xc-bob-success');await unchanged(staleBob,acquired);await history(bob);await snap(bob,'bob-acquired');await headerReturn(bob,'My bookings','xc2-bob-list','Bob','Complete · 45 USDC');await snap(bob,'bob-header-bookings');
  await entry(maya,'bookings');await click(maya,'View recovery receipt','link');await visible(maya,'You recovered 45 USDC');await snap(maya,'maya-receipt-before-service');await unchanged(maya,acquired);
  await entry(studio,'xc3-provider-today');await visible(studio,'Bob');await snap(studio,'studio-current-holder');
  await click(bob,'Use booking');await location(bob,'xc2-bob-not-open');assert(await bob.getByRole('button',{name:'Check in',exact:true}).isDisabled());
  // One shared scenario clock moves Friday17:00→17:45 after the handoff. All
  // other lifecycle facts are retained; this is not a new destination seed.
  await environment(bob,{checkinWindow:'open'},record);await location(bob,'xc2-bob-ready');await snap(bob,'clock-open');
  await duplicate(bob,'Check in');await location(bob,'xc2-bob-checked-in');await history(bob);assert.equal((await storedFixture(bob)).continuation.attendanceCount,1);assert.equal((await storedFixture(bob)).continuation.fulfilment,'none');await snap(bob,'arrival-only');
  const beforeBridge=await storedFixture(studio);await click(studio,'Open booking fulfilment');await location(studio,'xc2-provider-pending');await visible(studio,'Bob is checked in');await unchanged(studio,beforeBridge);assert((await studio.locator('header').innerText()).includes('Studio A'));await headerReturn(studio,'Today','xc2-provider-pending','Studio A','Bob is checked in');await snap(studio,'clicked-provider-fulfilment-bridge');await duplicate(studio,'Fulfil booking');await location(studio,'xc2-provider-fulfilment-pending');await environment(studio,{fulfilmentResponse:'unknown'},record);
  const unknown=await storedFixture(studio);await click(studio,'Refresh fulfilment');await click(studio,'Refresh fulfilment');await unchanged(studio,unknown);await history(studio);await snap(studio,'service-unknown');
  await environment(studio,{fulfilmentResponse:'fail-once'},record);await click(studio,'Refresh fulfilment');await location(studio,'xc2-provider-fulfilment-error');await snap(studio,'service-error-receipt-retained');assert.equal((await storedFixture(studio)).recoveredAmount,45);
  await click(studio,'Retry fulfilment');await location(studio,'xc2-provider-fulfilment-pending');await click(studio,'Refresh fulfilment');await location(studio,'xc2-provider-fulfilled');await history(studio);await headerReturn(studio,'Today','xc2-provider-fulfilled','Studio A','fulfilled');await snap(studio,'service-fulfilled-once');
  await click(studio,'Review reconciliation');await location(studio,'xc2-provider-reconciled');await click(studio,'View activity');await location(studio,'xc2-provider-history');await snap(studio,'studio-history');
  const final=await storedFixture(studio);assert.equal(final.continuation.fulfilmentCount,1);assert.equal(final.continuation.fulfilmentAttempts,2);assert.equal(final.settlementCount,1);assert.equal(final.continuation.reconciliation,'complete');
  await maya.reload({waitUntil:'networkidle'});await visible(maya,'You recovered 45 USDC');await unchanged(maya,final);await snap(maya,'maya-final-receipt');await click(maya,'Back to my bookings','link');await unchanged(maya,final);
  await bob.reload({waitUntil:'networkidle'});await unchanged(bob,final);await click(bob,'View activity');await snap(bob,'bob-history');await unchanged(bob,final);
  assert.equal(record.errors.length,0,record.errors.join(' | '));record.status='PASS';
 }catch(e){record.error=e.message;await snap(maya,'failure-context').catch(()=>{});}
 results.push(record);console.log(record.status+' '+name+(record.error?': '+record.error:''));await context.close();
}}finally{await browser.close();}
await writeFile(path.join(out,'results.json'),JSON.stringify({candidateSha:sha,evidenceClass:'FIXTURE',scope:'R4 one-seed connected browser, actual controls and explicitly recorded test-only environmental events',results},null,2));
if(results.length!==2||results.some(r=>r.status!=='PASS'))process.exitCode=1;
