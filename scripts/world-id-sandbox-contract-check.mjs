import fs from "node:fs";

const required = [
  "lib/world-id/sandbox-config.ts",
  "lib/world-id/sandbox-server-guard.ts",
  "app/api/world-id/sandbox/rp-context/route.ts",
  "app/api/world-id/sandbox/verify/route.ts",
  "app/world-sandbox/page.tsx",
  "scripts/world-id-sandbox-loopback-check.mjs",
];

const failures = [];
const passes = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (condition) passes.push(message);
  else failures.push(message);
}

for (const file of required) {
  assert(fs.existsSync(file), `exists: ${file}`);
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.dependencies?.["@worldcoin/idkit"] === "4.2.3",
  "@worldcoin/idkit is pinned to the reviewed 4.2.3 API surface",
);
assert(
  packageJson.scripts?.["world:sandbox:dev"]?.includes(
    "WORLD_ID_SANDBOX_TRANSPORT=loopback-v1",
  ) &&
    packageJson.scripts?.["world:sandbox:dev"]?.includes("-H 127.0.0.1"),
  "supported Sandbox launch explicitly binds Next.js to IPv4 loopback",
);
assert(
  packageJson.scripts?.["world:sandbox-boundary-check"]?.includes(
    "world-id-sandbox-loopback-check.mjs",
  ),
  "executable Sandbox transport-boundary check is exposed as a repo script",
);

if (required.every((file) => fs.existsSync(file))) {
  const config = read("lib/world-id/sandbox-config.ts");
  const guard = read("lib/world-id/sandbox-server-guard.ts");
  const signer = read("app/api/world-id/sandbox/rp-context/route.ts");
  const verifier = read("app/api/world-id/sandbox/verify/route.ts");
  const page = read("app/world-sandbox/page.tsx");
  const boundaryCheck = read("scripts/world-id-sandbox-loopback-check.mjs");

  assert(
    config.includes('WORLD_ID_SANDBOX_ENVIRONMENT = "sandbox"'),
    "Sandbox environment is fixed in server-owned configuration",
  );
  assert(
    config.includes('WORLD_ID_SANDBOX_ACTION = "yourturn-recovery-sandbox-2026"'),
    "Sandbox action is fixed rather than client-selected",
  );
  assert(
    guard.includes('process.env.NODE_ENV !== "development"') &&
      guard.includes('process.env.WORLD_ID_SANDBOX_PROOF_ENABLED !== "true"') &&
      guard.includes(
        "process.env.WORLD_ID_SANDBOX_TRANSPORT !== SANDBOX_TRANSPORT_MARKER",
      ) &&
      guard.includes('SANDBOX_REQUEST_HOSTS = new Set(["127.0.0.1", "localhost"])') &&
      guard.includes("Request.url nor Origin is treated as proof of the remote peer address"),
    "Sandbox APIs fail closed unless the dedicated loopback development launch is active",
  );
  assert(
    guard.includes("isEquivalentLoopbackOrigin") &&
      guard.includes("originUrl.protocol === requestUrl.protocol") &&
      guard.includes("effectivePort(originUrl) === effectivePort(requestUrl)") &&
      guard.includes("Origin is defense-in-depth"),
    "Origin remains defense-in-depth while localhost/127.0.0.1 normalize only on the same scheme and port",
  );
  assert(
    boundaryCheck.includes("nonLoopbackIpv4Addresses") &&
      boundaryCheck.includes(
        "Supported Sandbox launch accepted a TCP connection through a non-loopback interface",
      ) &&
      boundaryCheck.includes("Sandbox API must fail closed in production") &&
      boundaryCheck.includes("Browser Origin 127.0.0.1 must be accepted") &&
      boundaryCheck.includes("Browser Origin localhost must be accepted") &&
      boundaryCheck.includes("Loopback Origin on a different port must be rejected") &&
      boundaryCheck.includes("Loopback Origin on a different scheme must be rejected"),
    "boundary test exercises listener isolation, fail-closed runtime, and browser-shaped loopback Origin normalization",
  );
  assert(
    signer.includes("process.env.WORLD_ID_RP_SIGNING_KEY") &&
      signer.includes("signRequest({") &&
      signer.includes("isLocalWorldIdSandboxRequest(request)"),
    "RP signature is generated server-side behind the Sandbox proof guard",
  );
  assert(
    !signer.includes("request.json()") && !signer.includes("NEXT_PUBLIC_WORLD_ID_RP_SIGNING_KEY"),
    "RP signer cannot be used as a client-controlled action signing oracle",
  );
  assert(
    verifier.includes("https://developer.world.org/api/v4/verify/${WORLD_ID_SANDBOX_RP_ID}"),
    "Sandbox proof is forwarded to the documented production v4 verify endpoint",
  );
  assert(
    verifier.includes("JSON.stringify(idkitResponse)") &&
      verifier.includes("isLocalWorldIdSandboxRequest(request)") &&
      !verifier.includes("console.log") &&
      !verifier.includes("nullifier:"),
    "Verifier forwards IDKit payload without logging/publishing proof identity material",
  );
  assert(
    page.includes("environment={WORLD_ID_SANDBOX_ENVIRONMENT}") &&
      page.includes("preset={proofOfHuman()}"),
    "Client uses IDKit 4.x Proof of Human in Sandbox",
  );
  assert(
    page.includes("Sandbox · Not production") &&
      page.includes("not part of the") &&
      page.includes("frozen YT-01→YT-08 customer journey"),
    "Proof surface is explicitly separated from Golden product truth",
  );
}

const trackedText = [
  ...required,
  ".env.example",
  "docs/ethonline-2026/world/WORLD-ID-SANDBOX-PROOF.md",
]
  .filter((file) => fs.existsSync(file))
  .map((file) => read(file))
  .join("\n");

assert(
  !/WORLD_ID_RP_SIGNING_KEY\s*=\s*(?:0x)?[0-9a-fA-F]{64}/.test(trackedText),
  "No RP private key value is tracked in the Sandbox proof surface",
);
assert(
  !trackedText.includes("NEXT_PUBLIC_WORLD_ID_RP_SIGNING_KEY"),
  "RP signing key has no public-client environment alias",
);

console.log("World ID Sandbox contract check");
console.log("===============================");
for (const pass of passes) console.log(`ok  ${pass}`);

if (failures.length > 0) {
  console.error("\nfailures");
  console.error("--------");
  for (const failure of failures) console.error(`no  ${failure}`);
  process.exit(1);
}

console.log(
  "\nWorld ID Sandbox harness contract is intact; live Sandbox evidence and Security disposition are tracked separately.",
);
