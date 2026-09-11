const SANDBOX_LOOPBACK_HOST = "127.0.0.1";
const SANDBOX_TRANSPORT_MARKER = "loopback-v1";

export function isLocalWorldIdSandboxRequest(request: Request): boolean {
  // The network boundary is established by the supported Sandbox launch binding
  // Next.js to 127.0.0.1. These runtime checks are fail-closed backstops; neither
  // Request.url nor Origin is treated as proof of the remote peer address.
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (process.env.WORLD_ID_SANDBOX_PROOF_ENABLED !== "true") {
    return false;
  }

  if (process.env.WORLD_ID_SANDBOX_TRANSPORT !== SANDBOX_TRANSPORT_MARKER) {
    return false;
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  if (requestUrl.hostname !== SANDBOX_LOOPBACK_HOST) {
    return false;
  }

  // Browser Origin is defense-in-depth against cross-origin requests. It is not
  // the locality trust anchor; the listener bind above is the transport boundary.
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === requestUrl.origin;
  } catch {
    return false;
  }
}
