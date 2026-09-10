import fs from "node:fs";

const required = [
  "lib/world-id/sandbox-config.ts",
  "app/api/world-id/sandbox/rp-context/route.ts",
  "app/api/world-id/sandbox/verify/route.ts",
  "app/world-sandbox/page.tsx",
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

if (required.every((file) => fs.existsSync(file))) {
  const config = read("lib/world-id/sandbox-config.ts");
  const signer = read("app/api/world-id/sandbox/rp-context/route.ts");
  const verifier = read("app/api/world-id/sandbox/verify/route.ts");
  const page = read("app/world-sandbox/page.tsx");

  assert(
    config.includes('WORLD_ID_SANDBOX_ENVIRONMENT = "sandbox"'),
    "Sandbox environment is fixed in server-owned configuration",
  );
  assert(
    config.includes('WORLD_ID_SANDBOX_ACTION = "yourturn-recovery-sandbox-2026"'),
    "Sandbox action is fixed rather than client-selected",
  );
  assert(
    signer.includes("process.env.WORLD_ID_RP_SIGNING_KEY") &&
      signer.includes("signRequest({"),
    "RP signature is generated server-side from a non-public env var",
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
      !verifier.includes("console.log") &&
      !verifier.includes("nullifier:"),
    "Verifier forwards the IDKit payload without logging/publishing proof identity material",
  );
  assert(
    page.includes("environment={WORLD_ID_SANDBOX_ENVIRONMENT}") &&
      page.includes("preset={proofOfHuman()}"),
    "Client uses IDKit 4.x Proof of Human in Sandbox",
  );
  assert(
    page.includes("Sandbox · Not production") &&
      page.includes("not part of the\n          frozen YT-01→YT-08 customer journey"),
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

console.log("World ID Sandbox contract check");
console.log("===============================");
for (const pass of passes) console.log(`ok  ${pass}`);

if (failures.length > 0) {
  console.error("\nfailures");
  console.error("--------");
  for (const failure of failures) console.error(`no  ${failure}`);
  process.exit(1);
}

console.log("\nWorld ID Sandbox harness is CI/CONFIGURED only until a real Sandbox app round trip succeeds.");
