import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { getRedis } from "../store/redis.ts";
import type { CurrentRecoveryEligibility } from "./canonical-recovery-state.ts";

const INT64 = BigInt("9223372036854775807");
const label = z.string().regex(/^[A-Za-z0-9._:@-]{1,128}$/);
const operationId = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
const entity = z.string().regex(/^0\.0\.[1-9][0-9]{0,18}$/).refine(v => BigInt(v.slice(4)) <= INT64);
const version = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v => BigInt(v) <= INT64);
const time = z.number().int().positive().max(8640000000000000);
const recordSchema = z.object({
  schemaVersion:z.literal(1), version, ownerId:label, operationId,
  tokenId:entity, serial:z.number().int().positive().safe(), holderAccountId:entity,
  buyerAccountId:entity, status:z.literal("HELD"), acquirerEligible:z.literal(true), validUntilMs:time,
}).strict();
const publisherSchema = z.object({ publisherId:label, ownerId:label }).strict();
const validationSchema = z.object({ sourceVersion:version, validUntilMs:time }).strict();
const persistedSchema = z.object({ schemaVersion:z.literal(1), publisher:publisherSchema, validation:validationSchema, record:recordSchema }).strict();

type Store = { get(key:string):Promise<unknown>; eval(script:string,keys:string[],args:(string|number)[]):Promise<unknown> };
export type AuthenticatedEligibilityPublisher = z.infer<typeof publisherSchema>;
export type BusinessEligibilityValidation = z.infer<typeof validationSchema>;
export type BusinessEligibilityDependencies = { store?:Store; now?:()=>number };

export class BusinessEligibilityDenied extends Error {
  constructor(public readonly code:string){ super(code); this.name="BusinessEligibilityDenied"; }
}
function requireEligibility(ok:unknown,code:string):asserts ok{ if(!ok)throw new BusinessEligibilityDenied(code); }
function freeze<T>(v:T):T{ if(v&&typeof v==="object"){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v; }
function parseRecord(v:unknown):CurrentRecoveryEligibility{
  try{return recordSchema.parse(structuredClone(v)) as CurrentRecoveryEligibility;}
  catch{throw new BusinessEligibilityDenied("ELIGIBILITY_RECORD_CORRUPT");}
}
function parse(v:unknown){
  try{
    const p=persistedSchema.parse(typeof v==="string"?JSON.parse(v):structuredClone(v));
    p.record=parseRecord(p.record);
    requireEligibility(p.publisher.ownerId===p.record.ownerId&&p.record.validUntilMs<=p.validation.validUntilMs,"ELIGIBILITY_PROVENANCE_MISMATCH");
    return p;
  }catch(e){if(e instanceof BusinessEligibilityDenied)throw e;throw new BusinessEligibilityDenied("ELIGIBILITY_RECORD_CORRUPT");}
}
export function currentBusinessEligibilityKey(id:string){return `bookedrights:recovery:eligibility:v1:${operationId.parse(id)}`;}
const CREATE=`
if redis.call("EXISTS",KEYS[1]) ~= 0 then return 0 end
local t=redis.call("TIME")
local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
if tonumber(ARGV[2]) <= now then return -1 end
redis.call("SET",KEYS[1],ARGV[1])
return 1
`;
async function bounded<T>(d:BusinessEligibilityDependencies,fn:(store:Store,clock:()=>number)=>Promise<T>){
  const now=d.now??Date.now,store=d.store??getRedis(),started=now();
  requireEligibility(time.safeParse(started).success,"INVALID_CLOCK");let ended=false,last=started;
  const clock=()=>{const n=now();requireEligibility(!ended&&time.safeParse(n).success&&n>=last&&n-started<5000,"ELIGIBILITY_WINDOW_EXPIRED");last=n;return n;};
  let timer:ReturnType<typeof setTimeout>;const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{ended=true;reject(new BusinessEligibilityDenied("ELIGIBILITY_STORAGE_TIMEOUT"));},5000);});
  try{return await Promise.race([fn(store,clock),timeout]);}finally{ended=true;clearTimeout(timer!);}
}
async function readTwice(store:Store,id:string,owner:string,clock:()=>number){
  const key=currentBusinessEligibilityKey(id),raw=await store.get(key);clock();requireEligibility(raw!==null,"ELIGIBILITY_MISSING");
  const first=parse(raw);requireEligibility(first.record.operationId===id&&first.record.ownerId===owner,"ELIGIBILITY_OWNER_OR_OPERATION_MISMATCH");
  const second=parse(await store.get(key));clock();requireEligibility(isDeepStrictEqual(first,second),"ELIGIBILITY_CHANGED");return first;
}
/** Current read consumed by payment validation and canonical state resolution.
 * It is business truth only: no chain/World/Ledger authority is inferred here. */
export async function loadCurrentBusinessEligibility(input:BusinessEligibilityDependencies&{operationId:string;authenticatedOwnerId:string}){
  const id=operationId.parse(input.operationId),owner=label.parse(input.authenticatedOwnerId);
  return bounded(input,async(store,clock)=>{const p=await readTwice(store,id,owner,clock);requireEligibility(clock()<Math.min(p.record.validUntilMs,p.validation.validUntilMs),"ELIGIBILITY_EXPIRED");return freeze(p.record);});
}
/** Server-authenticated publication. `validateCurrentBusinessFacts` must read the
 * actual booking/lifecycle/eligibility system; request JSON or chain ownership is
 * not sufficient. The callback is repeated around the Redis create CAS. */
export async function publishCurrentBusinessEligibility(input:BusinessEligibilityDependencies&{
  publisher:AuthenticatedEligibilityPublisher; expectedVersion:"0"; candidate:CurrentRecoveryEligibility;
  validateCurrentBusinessFacts:(input:{publisher:Readonly<AuthenticatedEligibilityPublisher>;candidate:Readonly<CurrentRecoveryEligibility>})=>Promise<BusinessEligibilityValidation>;
}){
  const publisher=freeze(publisherSchema.parse(structuredClone(input.publisher))),candidate=freeze(parseRecord(input.candidate));
  requireEligibility(input.expectedVersion==="0"&&candidate.version==="1","INITIAL_ELIGIBILITY_REQUIRED");
  requireEligibility(candidate.ownerId===publisher.ownerId,"ELIGIBILITY_PUBLISHER_OWNER_MISMATCH");
  requireEligibility(candidate.holderAccountId!==candidate.buyerAccountId,"ELIGIBILITY_ROLE_COLLISION");
  const validate=input.validateCurrentBusinessFacts;requireEligibility(typeof validate==="function","BUSINESS_FACT_VALIDATOR_REQUIRED");
  let dispatched=false;
  try{return await bounded(input,async(store,clock)=>{
    const check=async()=>{const v=validationSchema.parse(structuredClone(await validate(freeze({publisher,candidate}))));requireEligibility(candidate.validUntilMs<=v.validUntilMs&&clock()<candidate.validUntilMs,"ELIGIBILITY_VALIDATION_EXPIRED");return v;};
    const first=await check(),key=currentBusinessEligibilityKey(candidate.operationId),existing=await store.get(key);clock();
    if(existing!==null){parse(existing);throw new BusinessEligibilityDenied("ELIGIBILITY_OPERATION_ALREADY_EXISTS");}
    const second=await check();requireEligibility(isDeepStrictEqual(first,second),"BUSINESS_ELIGIBILITY_CHANGED");
    const persisted=parse({schemaVersion:1,publisher,validation:first,record:candidate});
    dispatched=true;const result=await store.eval(CREATE,[key],[JSON.stringify(persisted),candidate.validUntilMs]);
    if(result===0){dispatched=false;throw new BusinessEligibilityDenied("ELIGIBILITY_OPERATION_ALREADY_EXISTS");}
    if(result===-1){dispatched=false;throw new BusinessEligibilityDenied("ELIGIBILITY_EXPIRED_AT_COMMIT");}
    requireEligibility(result===1,"UNEXPECTED_ELIGIBILITY_STORAGE_RESULT");
    const third=await check();requireEligibility(isDeepStrictEqual(first,third),"BUSINESS_ELIGIBILITY_CHANGED");
    const read=await readTwice(store,candidate.operationId,publisher.ownerId,clock);requireEligibility(isDeepStrictEqual(read,persisted),"PUBLISHED_ELIGIBILITY_CHANGED");
    return freeze(read.record);
  });}catch(e){if(dispatched)throw new BusinessEligibilityDenied("ELIGIBILITY_PUBLISH_OUTCOME_UNKNOWN_RELOAD_REQUIRED");throw e;}
}
