import { confirmCanonicalWorldRecovery, prepareCanonicalWorldRequest, type CanonicalWorldConsumerDependencies } from './canonical-world-consumer.ts';

/**
 * Canonical HTTP boundary for the final World-backed recovery route.
 *
 * GET is a read-only challenge preparation step. It never touches the World
 * nonce store or operation state. POST consumes a fresh signed AgentKit request
 * and may cross into the guarded operation path. Both methods require the same
 * authenticated server owner and exact configured resource.
 */
export function createCanonicalWorldConfirmHandler(input: {
  dependencies: CanonicalWorldConsumerDependencies;
  authenticateOwner(request: Request): Promise<{ ownerId: string } | null>;
  resourceUri: string;
}) {
  const resource = new URL(input.resourceUri);
  if (resource.href !== input.resourceUri || resource.pathname !== '/api/agent/confirm' || resource.search || resource.hash || resource.username || resource.password ||
    !(resource.protocol === 'https:' || resource.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(resource.hostname))) throw Error('Exact canonical HTTP resource required');
  if (input.dependencies.resourceUri !== resource.href) throw Error('Consumer and HTTP endpoint mismatch');
  const dependencies = { ...input.dependencies, resourceUri: resource.href };
  const authenticateOwner = input.authenticateOwner;
  const reply = (body: unknown, status: number) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  return async (request: Request) => {
    if (request.method !== 'GET' && request.method !== 'POST') return reply({error:'method_not_allowed'},405);
    let requestUrl:URL;
    try { requestUrl=new URL(request.url); } catch { return reply({error:'wrong_resource'},403); }
    const origin = request.headers.get('origin'), site = request.headers.get('sec-fetch-site');
    if (requestUrl.origin !== resource.origin || requestUrl.pathname !== resource.pathname || origin !== null && origin !== resource.origin || site === 'cross-site') return reply({error:'wrong_resource'},403);
    let owner;
    try { owner = await authenticateOwner(request); } catch { return reply({error:'authentication_unavailable'},503); }
    if (!owner) return reply({error:'authentication_required'},401);

    if (request.method === 'GET') {
      const keys=[...requestUrl.searchParams.keys()].sort();
      if(keys.join(',')!=='mandateId,operationId' || requestUrl.searchParams.getAll('mandateId').length!==1 || requestUrl.searchParams.getAll('operationId').length!==1)
        return reply({error:'invalid_challenge_request'},400);
      const mandateId=requestUrl.searchParams.get('mandateId'),operationId=requestUrl.searchParams.get('operationId');
      if(!mandateId||!operationId||mandateId.length>200||operationId.length>128) return reply({error:'invalid_challenge_request'},400);
      try {
        const challenge=await prepareCanonicalWorldRequest({ownerId:owner.ownerId,mandateId,operationId},dependencies);
        return reply({operationId,intentHash:challenge.intentHash,statement:challenge.statement,resourceUri:resource.href,executionPermit:false},200);
      } catch { return reply({error:'canonical_challenge_unavailable'},503); }
    }

    // Signed mutation/status requests never accept a query string. AgentKit is
    // bound to the exact base resource, not a caller-controlled alternate URI.
    if(requestUrl.href!==resource.href) return reply({error:'wrong_resource'},403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({error:'json_required'},415);
    const announced = request.headers.get('content-length');
    if (announced !== null && (!/^\d+$/.test(announced) || Number(announced)>4096)) return reply({error:'body_too_large'},413);
    let text = '', size=0;
    try {
      const reader=request.body?.getReader(), decoder=new TextDecoder('utf-8',{fatal:true});
      if (!reader) return reply({error:'invalid_request'},400);
      while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength;
        if(size>4096) { await reader.cancel(); return reply({error:'body_too_large'},413); } text+=decoder.decode(value,{stream:true}); }
      text+=decoder.decode();
    } catch { return reply({error:'invalid_request'},400); }
    let body;
    try { body=JSON.parse(text); } catch { return reply({error:'invalid_request'},400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'intentHash,mandateId,operationId' ||
      ![body.mandateId,body.operationId,body.intentHash].every(v=>typeof v==='string')) return reply({error:'invalid_request'},400);
    const agentkitHeader=request.headers.get('agentkit');
    if (!agentkitHeader || new TextEncoder().encode(agentkitHeader).byteLength>16384) return reply({error:'world_header_required'},400);
    try {
      const result=await confirmCanonicalWorldRecovery({...body,ownerId:owner.ownerId,agentkitHeader},dependencies);
      return reply(result,200);
    } catch {
      // A denial, storage loss or unknown effect output is not proof of no effect.
      // Caller uses a NEW signed nonce for read-only same-operation status.
      return reply({error:'canonical_confirmation_unavailable',retry:'fresh_world_nonce_same_operation_status_only'},503);
    }
  };
}
