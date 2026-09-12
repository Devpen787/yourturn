import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { paymentCommitmentSchema,paymentCommitmentMemo,type ExactPaymentCommitment } from './exact-payment-authorization.ts';
import { validateRecoveryRoyaltyReceipt } from './recovery-royalty.ts';

const ORIGIN='https://testnet.mirrornode.hedera.com',MAX=BigInt('9223372036854775807'),MAX_BODY=131072;
export class RecoveryReceiptReadDenied extends Error { constructor(readonly code:string){super(code);this.name='RecoveryReceiptReadDenied';} }
function requireReceipt(ok:unknown,code:string):asserts ok {if(!ok)throw new RecoveryReceiptReadDenied(code);}
function obj(v:unknown):Record<string,unknown>{requireReceipt(v&&typeof v==='object'&&!Array.isArray(v),'MALFORMED_RECEIPT');return v as Record<string,unknown>;}
function integer(v:unknown,signed=false):string {
 requireReceipt(typeof v==='string' && (signed?/^(0|-?[1-9][0-9]*)$/:/^(0|[1-9][0-9]*)$/).test(v) && v.length<=20,'INVALID_RECEIPT_INTEGER');
 const n=BigInt(v);requireReceipt(n<=MAX&&n>=-MAX,'RECEIPT_INTEGER_OVERFLOW');return v;
}
function entity(v:unknown):string{requireReceipt(typeof v==='string'&&/^0\.0\.[1-9][0-9]{0,18}$/.test(v)&&BigInt(v.slice(4))<=MAX,'INVALID_RECEIPT_ENTITY');return v;}
function stamp(v:unknown):bigint{requireReceipt(typeof v==='string'&&/^(0|[1-9][0-9]*)\.[0-9]{9}$/.test(v)&&v.length<=30,'INVALID_RECEIPT_TIMESTAMP');const [s,n]=v.split('.');return BigInt(s)*BigInt(1000000000)+BigInt(n);}
function array(v:unknown,min:number,max:number):unknown[]{requireReceipt(Array.isArray(v)&&v.length>=min&&v.length<=max,'INCOMPLETE_RECEIPT_TRANSFERS');return v;}
function base64(v:unknown,expectedLength?:number):Buffer{requireReceipt(typeof v==='string'&&v.length>0&&v.length<=4096&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v),'INVALID_RECEIPT_BASE64');const b=Buffer.from(v,'base64');requireReceipt(b.toString('base64')===v&&(expectedLength===undefined||b.length===expectedLength),'INVALID_RECEIPT_BASE64');return b;}
function freeze<T>(v:T):T{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
// Preserve every JSON number token as its exact lexical string. Used financial
// integers never pass through IEEE754 and exponent/fraction forms fail closed.
function exactJson(text:string){return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g,token=>token.startsWith('"')?token:JSON.stringify(token)));}

/** Expected commitment MUST come from immutable authenticated server records.
 * This reader verifies indexed settlement facts, never current spend authority.
 * No credentials, caller URL, signing, submission, retry or state mutation. */
export async function readRecoverySettlementReceipt(input:{operationId:string;commitment:ExactPaymentCommitment},options:{fetch?:typeof fetch;now?:()=>number}={}){
 requireReceipt(input&&Object.keys(input).sort().join(',')==='commitment,operationId','INVALID_RECEIPT_SELECTION');
 const c=paymentCommitmentSchema.parse(structuredClone(input.commitment)),operationId=input.operationId;
 if(c.domain!=='yourturn:hedera:testnet:exact-payment:v2')throw new RecoveryReceiptReadDenied('EXACT_V2_COMMITMENT_REQUIRED');
 requireReceipt(c.operationId===operationId,'EXACT_V2_COMMITMENT_REQUIRED');
 const economics=c.economics;
 requireReceipt(c.settlementSourceAccountId===c.receiverAccountId&&c.settlementRecipientAccountId===c.holderAccountId&&c.transactionFeePayerAccountId===c.delegatedAgentAccountId&&new Set([c.holderAccountId,c.receiverAccountId,c.delegatedAgentAccountId]).size===3,'RECEIPT_ROLE_SELECTION_INVALID');
 const [payer,start]=c.transactionId.split('@'),startNs=stamp(start);
 requireReceipt(payer===c.transactionFeePayerAccountId&&startNs+BigInt(c.transactionValidDurationSeconds)*BigInt(1000000000)===BigInt(c.expiresAtMs)*BigInt(1000000),'COMMITMENT_VALIDITY_MISMATCH');
 const mirrorId=c.transactionId.replace('@','-').replace(/\.([0-9]{9})$/,'-$1');
 const path=`/api/v1/transactions/${mirrorId}?nonce=0&scheduled=false`,url=ORIGIN+path;
 const fetcher=options.fetch??fetch,now=options.now??Date.now,startedAtMs=now();let last=startedAtMs;
 const clock=()=>{const n=now();requireReceipt(Number.isSafeInteger(n)&&n>=0&&Number.isSafeInteger(startedAtMs)&&n>=last&&n-startedAtMs<5000,'RECEIPT_READ_WINDOW_EXPIRED');last=n;return n;};clock();
 async function get(){
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,ended=false;
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{ended=true;controller.abort();reject(new RecoveryReceiptReadDenied('MIRROR_RECEIPT_TIMEOUT'));},2500);});
  const work=async()=>{
   clock();const response=await fetcher(url,{method:'GET',headers:{Accept:'application/json'},credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
   requireReceipt(!ended&&response.status===200&&!response.redirected&&(!response.url||response.url===url),'MIRROR_RECEIPT_UNAVAILABLE');
   requireReceipt(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()==='application/json'&&!response.headers.get('link'),'MIRROR_RECEIPT_RESPONSE_INVALID');
   const length=response.headers.get('content-length');requireReceipt(length===null||/^[0-9]+$/.test(length)&&Number(length)<=MAX_BODY,'MIRROR_RECEIPT_TOO_LARGE');
   const reader=response.body?.getReader();requireReceipt(reader,'MIRROR_RECEIPT_BODY_REQUIRED');const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
   try{while(true){const chunk=await reader.read();requireReceipt(!ended,'MIRROR_RECEIPT_TIMEOUT');clock();if(chunk.done)break;size+=chunk.value.byteLength;requireReceipt(size<=MAX_BODY,'MIRROR_RECEIPT_TOO_LARGE');text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}
   catch(e){await reader.cancel().catch(()=>{});throw e;}
   clock();return obj(exactJson(text));
  };
  try{return await Promise.race([work(),timeout]);}finally{ended=true;clearTimeout(timer!);controller.abort();}
 }
 function normalize(root:Record<string,unknown>){
  requireReceipt(Object.keys(root).every(k=>k==='transactions'||k==='links'),'UNEXPECTED_RECEIPT_ROOT');
  if(root.links!==undefined){const links=obj(root.links);requireReceipt(Object.keys(links).length===1&&links.next===null,'PAGINATED_RECEIPT_UNSUPPORTED');}
  const t=obj(array(root.transactions,1,1)[0]);
  requireReceipt(t.transaction_id===mirrorId&&t.result==='SUCCESS'&&t.name==='CRYPTOTRANSFER'&&integer(t.nonce)==='0'&&t.scheduled===false&&t.parent_consensus_timestamp===null,'RECEIPT_TRANSACTION_MISMATCH');
  requireReceipt((t.batch_key===undefined||t.batch_key===null)&&(t.high_volume===undefined||t.high_volume===false)&&(t.max_custom_fees===undefined||array(t.max_custom_fees,0,0).length===0),'UNSUPPORTED_RECEIPT_TRANSACTION_MODE');
  requireReceipt(t.node===c.nodeAccountId&&t.valid_start_timestamp===start&&integer(t.valid_duration_seconds)===String(c.transactionValidDurationSeconds)&&integer(t.max_fee)===c.maxTransactionFeeTinybars,'RECEIPT_NATIVE_BODY_MISMATCH');
  const consensusNs=stamp(t.consensus_timestamp);requireReceipt(consensusNs>=startNs&&consensusNs<BigInt(c.expiresAtMs)*BigInt(1000000)&&consensusNs/BigInt(1000000)<=BigInt(clock()),'RECEIPT_CONSENSUS_TIME_INVALID');
  const memoBytes=base64(t.memo_base64),memo=new TextDecoder('utf-8',{fatal:true}).decode(memoBytes);requireReceipt(memo===paymentCommitmentMemo(c),'RECEIPT_COMMITMENT_MEMO_MISMATCH');
  const transactionHash=base64(t.transaction_hash,48).toString('base64');
  const nftTransfers=array(t.nft_transfers,1,1).map(raw=>{const r=obj(raw),serial=BigInt(integer(r.serial_number));requireReceipt(r.is_approval===true&&serial>BigInt(0)&&serial<=BigInt(Number.MAX_SAFE_INTEGER),'RECEIPT_NFT_APPROVAL_INVALID');return {tokenId:entity(r.token_id),serial:Number(serial),senderAccountId:entity(r.sender_account_id),receiverAccountId:entity(r.receiver_account_id)};});
  const tokenTransfers=array(t.token_transfers,2,3).map(raw=>{const r=obj(raw);requireReceipt(r.is_approval===false,'RECEIPT_PAYMENT_ALLOWANCE_UNSUPPORTED');return {tokenId:entity(r.token_id),accountId:entity(r.account),amountAtomicUnits:integer(r.amount,true)};}).sort((a,b)=>a.accountId.localeCompare(b.accountId));
  const observed={operationId,transactionId:c.transactionId,transactionMemo:memo,status:'SUCCESS',nftTransfers,tokenTransfers};
  validateRecoveryRoyaltyReceipt({operationId,transactionId:c.transactionId,transactionMemo:paymentCommitmentMemo(c),bookingTokenId:c.bookingTokenId,serial:c.serial,holderAccountId:c.holderAccountId,buyerAccountId:c.receiverAccountId,settlementTokenId:c.settlementTokenId,grossAtomicUnits:c.settlementAmountAtomicUnits,economics},observed);
  const fee=BigInt(integer(t.charged_tx_fee));requireReceipt(fee<=BigInt(c.maxTransactionFeeTinybars),'RECEIPT_FEE_CAP_EXCEEDED');
  array(t.staking_reward_transfers,0,0); // A bounded fee-only HBAR receipt, no reward netting.
  const hbar=array(t.transfers,fee===BigInt(0)?0:2,32).map(raw=>{const r=obj(raw);requireReceipt(r.is_approval===false,'RECEIPT_HBAR_APPROVAL_UNSUPPORTED');return {accountId:entity(r.account),amountTinybars:integer(r.amount,true)};}).sort((a,b)=>a.accountId.localeCompare(b.accountId));
  requireReceipt(new Set(hbar.map(r=>r.accountId)).size===hbar.length,'DUPLICATE_HBAR_RECEIPT_ROW');
  let total=BigInt(0),debit=BigInt(0);for(const row of hbar){const amount=BigInt(row.amountTinybars);requireReceipt(amount!==BigInt(0),'ZERO_HBAR_RECEIPT_ROW');total+=amount;if(row.accountId===c.transactionFeePayerAccountId){requireReceipt(amount===-fee,'RECEIPT_FEE_PAYER_DEBIT_MISMATCH');debit-=amount;}else requireReceipt(amount>BigInt(0),'UNEXPECTED_HBAR_RECEIPT_DEBIT');}
  requireReceipt(total===BigInt(0)&&debit===fee,'RECEIPT_HBAR_FEE_LEDGER_MISMATCH');
  return {kind:'HEDERA_TESTNET_INDEXED_SETTLEMENT_RECEIPT' as const,operationId,transactionId:c.transactionId,transactionHash,consensusTimestamp:t.consensus_timestamp as string,
   commitmentMemo:memo,bookingTokenId:c.bookingTokenId,serial:c.serial,holderAccountId:c.holderAccountId,buyerAccountId:c.receiverAccountId,executorAccountId:c.delegatedAgentAccountId,
   buyerGrossAtomicUnits:c.settlementAmountAtomicUnits,economics,nftTransfers,tokenTransfers,feePayerAccountId:c.transactionFeePayerAccountId,chargedFeeTinybars:fee.toString(),hbarTransfers:hbar};
 }
 const first=normalize(await get()),second=normalize(await get());requireReceipt(isDeepStrictEqual(first,second),'INDEXED_RECEIPT_CHANGED');
 const observedAtMs=clock(),receiptDigest=createHash('sha256').update(JSON.stringify(first)).digest('hex');
 return freeze({receipt:first,receiptDigest,observedAtMs,sourceUrl:url,consensusSynchronous:false as const,executionPermit:false as const});
}
