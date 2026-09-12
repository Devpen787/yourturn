import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
const base=new URL(process.env.PRODUCT_WORKBENCH_BASE_URL??'http://127.0.0.1:3000');assert(['127.0.0.1','localhost','[::1]'].includes(base.hostname));
const out=path.resolve('artifacts/product-workbench/r5');await mkdir(out,{recursive:true});const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const key='yourturn:product-preview:holder:v1';const browser=await chromium.launch({headless:true});const results=[];
const click=(p,name,role='button')=>p.locator('main').getByRole(role,{name,exact:true}).click();
const text=(p,t)=>p.getByText(t,{exact:false}).first().waitFor({state:'visible'});
const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const view=(p,v)=>p.waitForURL(u=>u.searchParams.get('view')===v);
try{for(const [width,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]])for(const outcome of ['approved','cancelled']){
 const context=await browser.newContext({viewport});await context.route('**/*',r=>new URL(r.request().url()).origin===base.origin&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
 const p=await context.newPage();p.setDefaultTimeout(7000);const r={viewport:width,outcome,status:'FAIL',errors:[],screenshots:[],checkpoints:[]};p.on('console',m=>{if(m.type()==='error')r.errors.push(m.text());});p.on('pageerror',e=>r.errors.push(e.message));
 const shot=async(label)=>{const f=`${width}-${outcome}-${label}.png`;await p.screenshot({path:path.join(out,f),fullPage:true});r.screenshots.push(f);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false);r.checkpoints.push({label,url:new URL(p.url()).pathname+new URL(p.url()).search,header:await p.locator('header').innerText(),state:await state(p)});};
 const home=async(identity,destination,visible)=>{const before=await state(p);await p.getByRole('link',{name:'YourTurn home',exact:true}).click();await view(p,destination);await text(p,visible);assert((await p.locator('header').innerText()).includes(identity));assert.deepEqual(await state(p),before);await shot(identity+'-home');};
 try{
  await p.goto(base.origin+'/product-preview',{waitUntil:'networkidle'});await click(p,'Open my bookings');await p.getByText('View booking →',{exact:true}).click();await view(p,'booking-detail');
  const beforeUse=await state(p);await click(p,'Use booking');await view(p,'use-booking');await text(p,'Use your Friday Yoga booking.');await text(p,'Opens at 17:30');await text(p,'No attendance has been recorded.');assert.deepEqual(await state(p),beforeUse);await shot('maya-use-details');
  await p.reload({waitUntil:'networkidle'});await view(p,'use-booking');await text(p,'Online check-in is unavailable');await click(p,'Back to booking');await view(p,'booking-detail');await p.goBack({waitUntil:'networkidle'});await view(p,'use-booking');await p.goForward({waitUntil:'networkidle'});await view(p,'booking-detail');assert.deepEqual(await state(p),beforeUse);
  await click(p,'Change plans');await p.getByRole('button',{name:/Let YourTurn handle it/}).click();await p.getByRole('checkbox').check();
  for(const n of ['Continue to secure approval','Approve on secure device','Connect Ledger','Check approval status','View active recovery','See latest offer'])await click(p,n);
  await text(p,'32 USDC was not accepted.');await text(p,'Saturday, 12 September');await click(p,'Lower my minimum');await click(p,'Review 30 USDC authorization');await click(p,'Connect Ledger');
  if(outcome==='approved'){await click(p,'Check approval status');await click(p,'View active recovery');await click(p,'See latest offer');await text(p,'32 USDC is within your limits.');}
  else{await click(p,'Cancel approval');await click(p,'Return to active recovery');await click(p,'See latest offer');await click(p,'Keep looking');await text(p,'45 USDC is within your limits.');}
  await click(p,'Refresh recovery status');await click(p,'View recovery receipt','link');await view(p,'xc2-maya-history');const amount=outcome==='approved'?32:45,minimum=outcome==='approved'?30:40;
  await text(p,`You recovered ${amount} USDC`);await text(p,`minimum ${minimum} USDC`);await text(p,'Saturday, 12 September · 17:00');assert.equal((await state(p)).settledMinimum,minimum);await shot('effective-minimum-receipt');
  await p.reload({waitUntil:'networkidle'});await text(p,`minimum ${minimum} USDC`);await home('Maya Keller','bookings','Recently recovered');
  // Existing actor entry locations, never outcome URLs or reseeds.
  const settled=await state(p);await p.goto(base.origin+'/product-preview?view=xc2-bob-list',{waitUntil:'networkidle'});assert.deepEqual(await state(p),settled);await click(p,'Use booking');await view(p,'xc2-bob-not-open');await home('Bob','xc2-bob-list','Friday Yoga');
  await p.goto(base.origin+'/product-preview?view=xc3-provider-today',{waitUntil:'networkidle'});await click(p,'Edit session & rules');await home('Studio A','xc3-provider-today','Bob');assert.deepEqual(await state(p),settled);
  assert.equal(r.errors.length,0,r.errors.join(' | '));r.status='PASS';
 }catch(e){r.error=e.message;await shot('failure').catch(()=>{});}
 results.push(r);console.log(r.status+' '+width+' '+outcome+(r.error?': '+r.error:''));await context.close();
}}finally{await browser.close();}
await writeFile(path.join(out,'results.json'),JSON.stringify({candidateSha:sha,evidenceClass:'FIXTURE',scope:'R5 three reproduced repairs; no rendered past-expiry or sponsor proof',results},null,2));if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
