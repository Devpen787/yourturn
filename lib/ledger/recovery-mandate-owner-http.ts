import { readCurrentMandate, revokeCurrentMandate } from "./recovery-mandate-current.ts";
import type { RecoveryMandateAuthorityBoundaryStore } from "./recovery-mandate-authority-boundary.ts";

type SignedOwner = { id: string; email: string; appRole: "user" };
type Dependencies = {
  isTestnet: () => boolean;
  /** Signed session adapter, not request-body identity. */
  readSignedOwner: () => Promise<SignedOwner | null>;
  /** Fresh raw stored identity: must not infer missing roles/demo personas. */
  readStoredOwner: (id: string) => Promise<unknown>;
  store: () => RecoveryMandateAuthorityBoundaryStore;
};
class Denied extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" } });
function label(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value); }
function parseScope(token: unknown, serial: unknown) {
  if (typeof token !== "string" || !/^0\.0\.[1-9][0-9]{0,18}$/.test(token) || BigInt(token.slice(4)) > BigInt("9223372036854775807") ||
      typeof serial !== "string" || !/^[1-9][0-9]{0,15}$/.test(serial) || BigInt(serial) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Denied(400, "INVALID_BOOKING_SCOPE");
  return { token, serial: BigInt(serial) };
}
function requestOrigin(req: Request, url: URL): string {
  // NextURL normalizes loopback hosts to localhost. Browser Origin retains the
  // actual authority. Host is supplied by the HTTP request target (a browser
  // cannot set it); never use caller-set X-Forwarded-Host or a body field.
  const host = req.headers.get("host");
  if (!host || !/^(?:[A-Za-z0-9.-]+|\[[0-9a-fA-F:]+\])(?::[0-9]{1,5})?$/.test(host)) throw new Denied(403, "SAME_ORIGIN_REQUIRED");
  try {
    const origin = new URL(`${url.protocol}//${host}`);
    if (!["http:", "https:"].includes(origin.protocol)) throw new Error("protocol");
    return origin.origin;
  } catch { throw new Denied(403, "SAME_ORIGIN_REQUIRED"); }
}
async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new Denied(415, "JSON_REQUIRED");
  const reader = req.body?.getReader();
  if (!reader) throw new Denied(400, "INVALID_BODY");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 4096) { await reader.cancel(); throw new Denied(413, "BODY_TOO_LARGE"); } chunks.push(value); }
    const merged = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(merged));
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "digest,mandateId,serial,tokenId") throw new Error("shape");
    return value as Record<string, unknown>;
  } catch (error) { if (error instanceof Denied) throw error; throw new Denied(400, "INVALID_BODY"); }
  finally { reader.releaseLock(); }
}

/** Owner-facing pointer observation/revocation only. It does not load signed
 * authority or grant action permission, and never resets an operation/effect. */
export function createRecoveryMandateOwnerHandlers(deps: Dependencies) {
  // Capture trusted adapter identities rather than dereferencing mutable input later.
  const readSigned = deps.readSignedOwner, readStored = deps.readStoredOwner, store = deps.store, isTestnet = deps.isTestnet;
  const authenticate = async () => {
    const value = await readSigned();
    if (!value || !label(value.id) || typeof value.email !== "string" || !value.email.trim() || value.appRole !== "user") throw new Denied(401, "SIGN_IN_REQUIRED");
    const user = { id: value.id, email: value.email.trim().toLowerCase(), appRole: value.appRole };
    const raw = await readStored(user.id);
    let stored: Record<string, unknown> | null = null;
    try { const parsed = typeof raw === "string" ? JSON.parse(raw) : raw; if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed; } catch { /* deny corrupt record */ }
    if (!stored || stored.id !== user.id || stored.appRole !== "user" || typeof stored.email !== "string" || stored.email.trim().toLowerCase() !== user.email) throw new Denied(401, "CURRENT_USER_REQUIRED");
    return user;
  };
  const failure = (error: unknown, mutation = false) => error instanceof Denied ? reply({ ok: false, code: error.code }, error.status) :
    reply({ ok: false, code: mutation ? "REVOKE_OUTCOME_UNKNOWN_RELOAD_CURRENT" : "CURRENT_STATE_UNAVAILABLE" }, 503);
  return Object.freeze({
    async GET(req: Request) {
      try {
        if (req.method !== "GET") throw new Denied(405, "METHOD_NOT_ALLOWED");
        if (isTestnet() !== true) throw new Denied(503, "TESTNET_REQUIRED");
        const owner = await authenticate();
        const url = new URL(req.url);
        const entries = Array.from(url.searchParams.entries());
        if (entries.length !== 2 || entries.map(([key]) => key).sort().join(",") !== "serial,tokenId") throw new Denied(400, "INVALID_QUERY");
        const scope = parseScope(url.searchParams.get("tokenId"), url.searchParams.get("serial"));
        const current = await readCurrentMandate(store(), scope.token, scope.serial);
        if (!current || current.ownerId !== owner.id) throw new Denied(404, "CURRENT_MANDATE_NOT_FOUND");
        const again = await authenticate(); if (again.id !== owner.id || again.email !== owner.email) throw new Denied(401, "CURRENT_USER_REQUIRED");
        return reply({ ok: true, kind: "CURRENT_POINTER_OBSERVATION", current, authorityVerified: false, executionPermit: false });
      } catch (error) { return failure(error); }
    },
    async POST(req: Request) {
      let dispatch = false;
      try {
        if (req.method !== "POST") throw new Denied(405, "METHOD_NOT_ALLOWED");
        if (isTestnet() !== true) throw new Denied(503, "TESTNET_REQUIRED");
        const url = new URL(req.url);
        if (req.headers.get("origin") !== requestOrigin(req, url) || (req.headers.get("sec-fetch-site") !== null && req.headers.get("sec-fetch-site") !== "same-origin")) throw new Denied(403, "SAME_ORIGIN_REQUIRED");
        if (url.search) throw new Denied(400, "INVALID_QUERY");
        const owner = await authenticate();
        const body = await readBody(req);
        const scope = parseScope(body.tokenId, body.serial);
        if (!label(body.mandateId) || typeof body.digest !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.digest)) throw new Denied(400, "INVALID_MANDATE_IDENTITY");
        const db = store();
        const current = await readCurrentMandate(db, scope.token, scope.serial);
        if (!current || current.ownerId !== owner.id) throw new Denied(404, "CURRENT_MANDATE_NOT_FOUND");
        if (current.mandateId !== body.mandateId || current.digest !== body.digest) throw new Denied(409, "CURRENT_MANDATE_CHANGED");
        const again = await authenticate(); if (again.id !== owner.id || again.email !== owner.email) throw new Denied(401, "CURRENT_USER_REQUIRED");
        dispatch = true;
        const revoked = await revokeCurrentMandate({ store: db, ...scope, ownerId: owner.id, mandateId: body.mandateId, digest: body.digest });
        return reply({ ok: true, kind: "CURRENT_POINTER_REVOKED", current: revoked, executionPermit: false,
          effectsCancelled: false, detail: "Stops future guarded authority checks. An effect already started must still be reconciled." });
      } catch (error) { return failure(error, dispatch); }
    },
  });
}
