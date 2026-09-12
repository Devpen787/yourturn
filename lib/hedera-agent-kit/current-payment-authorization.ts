import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { getRedis } from "../store/redis.ts";

const label=z.string().regex(/^[A-Za-z0-9._:@-]{1,128}$/);
const operationId=z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
const entity=z.string().regex(/^0\.0\.[1-9][0-9]{0,18}$/);
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const signature=z.string().regex(/^[a-f0-9]{128}$/);
const time=z.number().int().positive().max(8640000000000000);
const recordSchema=z.object({schemaVersion:z.literal(1),ownerId:label,operationId,commitmentDigest:digest,buyerAccountId:entity,signatureHex:signature,expiresAtMs:time}).strict();
const publisherSchema=z.object({publisherId:label,ownerId:label,buyerAccountId:entity}).strict();
const validationSchema=z.object({authorityFingerprint:digest,validUntilMs:time}).strict();
const persistedSchema=z.object({schemaVersion:z.literal(1),publisher:publisherSchema,validation:validationSchema,record:recordSchema}).strict();
type Store={get(key:string):Promise<unknown>;eval(script:string,keys:string[],args:(string|number)[]):Promise<unknown>};
export type CurrentPaymentAuthorizationDependencies={store?:Store;now?:()=>number};
export class CurrentPaymentAuthorizationDenied extends Error{constructor(public readonly code:string){super(code);this.name="CurrentPaymentAuthorizationDenied";}}
function requireAuthorization(ok:unknown,code:string):asserts ok{if(!ok)throw new CurrentPaymentAuthorizationDenied(code);}
function freeze<T>(v:T):T{if(v&&typeof v==="object"){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
function parse(v:unknown){try{return persistedSchema.parse(typeof v==="string"?JSON.parse(v):structuredClone(v));}catch{throw new CurrentPaymentAuthorizationDenied("PAYMENT_AUTHORIZATION_CORRUPT");}}
export function currentPaymentAuthorizationKey(id:string){return `bookedrights:recovery:payment-authorization:v1:${operationId.parse(id)}`;}
const CREATE=`
if redis.call("EXISTS",KEYS[1]) ~= 0 then return 0 end
local t=redis.call("TIME")
local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
if tonumber(ARGV[2]) <= now then return -1 end
redis.call("SET",KEYS[1],ARGV[1])
return 1
`;
async function bounded<T>(d:CurrentPaymentAuthorizationDependencies,fn:(s:Store,clock:()=>number)=>Promise<T>){const now=d.now??Date.now,store=d.store??getRedis(),start=now();requireAuthorization(time.safeParse(start).success,"INVALID_CLOCK");let ended=false,last=start;const clock=()=>{const n=now();requireAuthorization(!ended&&time.safeParse(n).success&&n>=last&&n-start<5000,"PAYMENT_AUTHORIZATION_WINDOW_EXPIRED");last=n;return n;};let timer:ReturnType<typeof setTimeout>;const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{ended=true;reject(new CurrentPaymentAuthorizationDenied("PAYMENT_AUTHORIZATION_STORAGE_TIMEOUT"));},5000);});try{return await Promise.race([fn(store,clock),timeout]);}finally{ended=true;clearTimeout(timer!);}}
async function readTwice(store:Store,id:string,owner:string,clock:()=>number){const key=currentPaymentAuthorizationKey(id),raw=await store.get(key);clock();requireAuthorization(raw!==null,"PAYMENT_AUTHORIZATION_MISSING");const first=parse(raw);requireAuthorization(first.record.operationId===id&&first.record.ownerId===owner,"PAYMENT_AUTHORIZATION_SCOPE_MISMATCH");const second=parse(await store.get(key));clock();requireAuthorization(isDeepStrictEqual(first,second),"PAYMENT_AUTHORIZATION_CHANGED");return first;}
/** Read-only server retrieval. The signature is not secret, but it is exact
 * execution authority and is never returned by a public status endpoint. */
export async function loadCurrentPaymentAuthorization(input:CurrentPaymentAuthorizationDependencies&{operationId:string;authenticatedOwnerId:string;expectedCommitmentDigest:string}){const id=operationId.parse(input.operationId),owner=label.parse(input.authenticatedOwnerId),expected=digest.parse(input.expectedCommitmentDigest);return bounded(input,async(store,clock)=>{const p=await readTwice(store,id,owner,clock);requireAuthorization(p.record.commitmentDigest===expected,"PAYMENT_AUTHORIZATION_COMMITMENT_MISMATCH");requireAuthorization(clock()<Math.min(p.record.expiresAtMs,p.validation.validUntilMs),"PAYMENT_AUTHORIZATION_EXPIRED");return freeze({signatureHex:p.record.signatureHex,buyerAccountId:p.record.buyerAccountId,expiresAtMs:p.record.expiresAtMs,authorityFingerprint:p.validation.authorityFingerprint});});}
/** Persist Bob's exact native signature only after a mandatory server callback has
 * verified the signature against the current payment commitment and current
 * funding-account public key. No request-provided key or commitment is trusted. */
export async function publishCurrentPaymentAuthorization(input:CurrentPaymentAuthorizationDependencies&{
 publisher:{publisherId:string;ownerId:string;buyerAccountId:string};
 record:{schemaVersion:1;ownerId:string;operationId:string;commitmentDigest:string;buyerAccountId:string;signatureHex:string;expiresAtMs:number};
 validateCurrentAuthorization:(input:{publisher:Readonly<z.infer<typeof publisherSchema>>;record:Readonly<z.infer<typeof recordSchema>>})=>Promise<z.infer<typeof validationSchema>>;
}){const publisher=freeze(publisherSchema.parse(structuredClone(input.publisher))),record=freeze(recordSchema.parse(structuredClone(input.record)));requireAuthorization(record.ownerId===publisher.ownerId&&record.buyerAccountId===publisher.buyerAccountId,"PAYMENT_AUTHORIZATION_PUBLISHER_MISMATCH");requireAuthorization(typeof input.validateCurrentAuthorization==="function","PAYMENT_AUTHORIZATION_VALIDATOR_REQUIRED");let dispatched=false;try{return await bounded(input,async(store,clock)=>{const check=async()=>{const v=validationSchema.parse(structuredClone(await input.validateCurrentAuthorization(freeze({publisher,record}))));requireAuthorization(record.expiresAtMs<=v.validUntilMs&&clock()<record.expiresAtMs,"PAYMENT_AUTHORIZATION_VALIDATION_EXPIRED");return v;};const first=await check(),key=currentPaymentAuthorizationKey(record.operationId),existing=await store.get(key);clock();if(existing!==null){parse(existing);throw new CurrentPaymentAuthorizationDenied("PAYMENT_AUTHORIZATION_ALREADY_EXISTS");}const second=await check();requireAuthorization(isDeepStrictEqual(first,second),"PAYMENT_AUTHORIZATION_AUTHORITY_CHANGED");const persisted=parse({schemaVersion:1,publisher,validation:first,record});dispatched=true;const result=await store.eval(CREATE,[key],[JSON.stringify(persisted),Math.min(record.expiresAtMs,first.validUntilMs)]);if(result===0){dispatched=false;throw new CurrentPaymentAuthorizationDenied("PAYMENT_AUTHORIZATION_ALREADY_EXISTS");}if(result===-1){dispatched=false;throw new CurrentPaymentAuthorizationDenied("PAYMENT_AUTHORIZATION_EXPIRED_AT_COMMIT");}requireAuthorization(result===1,"UNEXPECTED_PAYMENT_AUTHORIZATION_STORAGE_RESULT");const third=await check();requireAuthorization(isDeepStrictEqual(first,third),"PAYMENT_AUTHORIZATION_AUTHORITY_CHANGED");const read=await readTwice(store,record.operationId,record.ownerId,clock);requireAuthorization(isDeepStrictEqual(read,persisted),"PUBLISHED_PAYMENT_AUTHORIZATION_CHANGED");return freeze({operationId:record.operationId,commitmentDigest:record.commitmentDigest,buyerAccountId:record.buyerAccountId,expiresAtMs:record.expiresAtMs,authorityFingerprint:first.authorityFingerprint});});}catch(e){if(dispatched)throw new CurrentPaymentAuthorizationDenied("PAYMENT_AUTHORIZATION_PUBLISH_OUTCOME_UNKNOWN_RELOAD_REQUIRED");throw e;}}
