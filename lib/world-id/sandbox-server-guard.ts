const LOCAL_SANDBOX_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalWorldIdSandboxRequest(request: Request): boolean {
  if (process.env.WORLD_ID_SANDBOX_PROOF_ENABLED !== "true") {
    return false;
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  if (!LOCAL_SANDBOX_HOSTS.has(requestUrl.hostname)) {
    return false;
  }

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
