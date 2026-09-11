const SANDBOX_REQUEST_HOSTS = new Set(["127.0.0.1", "localhost"]);
const SANDBOX_TRANSPORT_MARKER = "loopback-v1";

function effectivePort(url: URL): string {
  if (url.port) return url.port;
  if (url.protocol === "http:") return "80";
  if (url.protocol === "https:") return "443";
  return "";
}

function isEquivalentLoopbackOrigin(originUrl: URL, requestUrl: URL): boolean {
  return (
    SANDBOX_REQUEST_HOSTS.has(originUrl.hostname) &&
    SANDBOX_REQUEST_HOSTS.has(requestUrl.hostname) &&
    originUrl.protocol === requestUrl.protocol &&
    effectivePort(originUrl) === effectivePort(requestUrl)
  );
}

export function isLocalWorldIdSandboxRequest(request: Request): boolean {
  // The network boundary is established by the supported Sandbox launch binding
  // Next.js to 127.0.0.1. These runtime checks are fail-closed backstops; neither
  // Request.url nor Origin is treated as proof of the remote peer address. Next.js
  // may normalize an internally constructed request URL to localhost even when the
  // actual listener is explicitly bound to 127.0.0.1, so URL host is only a
  // secondary consistency check.
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

  if (!SANDBOX_REQUEST_HOSTS.has(requestUrl.hostname)) {
    return false;
  }

  // Browser Origin is defense-in-depth against cross-origin requests. It is not
  // the locality trust anchor; the listener bind above is the transport boundary.
  // Treat localhost and 127.0.0.1 as the same loopback browser origin only when
  // protocol and effective port also match. This handles Next's internal host
  // normalization without accepting a different scheme, port, or non-loopback host.
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return isEquivalentLoopbackOrigin(new URL(origin), requestUrl);
  } catch {
    return false;
  }
}
