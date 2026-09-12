import fs from "node:fs/promises";
import path from "node:path";

export function assertUnexpiredPrepared(prepared, nowMs = Date.now()) {
  const expiry = prepared?.typedData?.message?.expiresAt;
  if (!/^[0-9]+$/.test(String(expiry)) || !Number.isSafeInteger(Number(expiry)) ||
      !Number.isSafeInteger(nowMs) || nowMs < 0 || Number(expiry) <= Math.floor(nowMs / 1000)) {
    throw new Error("prepared mandate is expired or has invalid expiry; prepare a fresh mandate through the guarded app");
  }
}

export async function assertUnusedEvidencePath(out) {
  for (const filename of [out, `${out}.failure.json`]) {
    try { await fs.lstat(filename); }
    catch (error) { if (error?.code === "ENOENT") continue; throw error; }
    throw new Error("evidence output already exists; choose a fresh output path without deleting prior evidence");
  }
}

// This is deliberately NOT a canonical device-proof/v1. It cannot activate
// authority or qualify a ceremony. No signature, output, message, device name,
// raw error text, prepared payload, cookie or credential is serialized.
export async function preserveFailedCeremony({out, expectation, mandateDigest, signing}) {
  if (!/^(approve|reject|cancel)$/.test(expectation) || !/^0x[0-9a-f]{64}$/i.test(mandateDigest)) {
    throw new Error("invalid failure evidence correlation");
  }
  const knownStatuses = ["not-started", "pending", "completed", "error", "stopped"];
  const states = Array.isArray(signing?.events) ? signing.events.map(event => {
    const safe = {status: knownStatuses.includes(event?.status) ? event.status : "unknown"};
    // Allow only the known typed-data marker. Free-form SDK diagnostics may
    // contain private data; omit them, rather than copying then redacting.
    if (event?.step === "signer.eth.steps.signTypedData") safe.step = event.step;
    if (event?.requiredUserInteraction === "signTypedData") safe.requiredUserInteraction = event.requiredUserInteraction;
    safe.interactionObserved = Boolean(event?.requiredUserInteraction);
    if (event?.errorTag === "EthAppCommandError") safe.errorTag = event.errorTag;
    if (typeof event?.errorCode === "string" && /^[a-f0-9]{4}$/i.test(event.errorCode)) safe.errorCode = event.errorCode.toLowerCase();
    return safe;
  }) : [];
  const record = {
    schema: "yourturn-ledger-ceremony-failure-observations/v1",
    capturedAt: new Date().toISOString(),
    evidenceLevel: "UNQUALIFIED_DEVICE_OBSERVATIONS",
    qualificationPassed: false,
    expectation, mandateDigest,
    signingStates: states,
    outputObserved: Boolean(signing?.outputObserved || signing?.output),
    cancelRequested: signing?.cancelRequested === true,
    observableFailed: signing?.observableFailed === true,
    observationBoundary: "Captured before cleanup; later device events are not attested.",
    signaturePersisted: false,
    activationAttempted: false,
    claimBoundary: "Failed attempt observations only. No successful ceremony, signer provenance, authority activation or LIVE qualification is established.",
  };
  const destination = `${out}.failure.json`;
  await fs.mkdir(path.dirname(destination), {recursive:true});
  await fs.writeFile(destination, `${JSON.stringify(record,null,2)}\n`, {encoding:"utf8", flag:"wx", mode:0o600});
  return destination;
}
