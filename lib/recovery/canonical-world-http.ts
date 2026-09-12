import { confirmCanonicalWorldRecovery, type CanonicalWorldConsumerDependencies } from './canonical-world-consumer.ts';

/** Qualified HTTP factory; deliberately not wired into the published route.
 * Authentication must return a freshly verified server owner, never body data.
 * Runtime must provision the actual public registry and effect adapter first. */
export function createCanonicalWorldConfirmHandler(input: {
  dependencies: CanonicalWorldConsumerDependencies;
  authenticateOwner(request: Request): Promise<{ ownerId: string } | null>;
  resourceUri: string;
}) {
  const resource = new URL(input.resourceUri);
  if (resource.href !== input.resourceUri || resource.pathname !== '/api/agent/confirm' || resource.search || resource.hash || resource.username || resource.password ||
    !(resource.protocol === 'https:' || resource.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(resource.hostname))) throw Error('Exact canonical HTTP resource required');
  const reply = (body: unknown, status: number) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  return async (request: Request) => {
    if (request.method !== 'POST') return reply({error:'method_not_allowed'},405);
    const origin = request.headers.get('origin'), site = request.headers.get('sec-fetch-site');
    if (request.url !== resource.href || origin !== null && origin !== resource.origin || site === 'cross-site') return reply({error:'wrong_resource'},403);
    let owner;
    try { owner = await input.authenticateOwner(request); } catch { return reply({error:'authentication_unavailable'},503); }
    if (!owner) return reply({error:'authentication_required'},401);
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
      const result=await confirmCanonicalWorldRecovery({...body,ownerId:owner.ownerId,agentkitHeader},input.dependencies);
      return reply(result,200);
    } catch {
      // A denial, storage loss or unknown effect output is not proof of no effect.
      // Caller uses a NEW signed nonce for read-only same-operation status.
      return reply({error:'canonical_confirmation_unavailable',retry:'fresh_world_nonce_same_operation_status_only'},503);
    }
  };
}
