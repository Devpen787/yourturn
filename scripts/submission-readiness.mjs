import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(
  root,
  "docs/ethonline-2026/release-readiness/manifest.json",
);
const strict = process.env.SUBMISSION_READINESS_STRICT === "1";

const failures = [];
const warnings = [];
const passes = [];

function pass(message) {
  passes.push(message);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function requireCondition(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function sha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", ".vercel", "output"].includes(entry.name)) {
      continue;
    }
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (!fs.existsSync(manifestPath)) {
  console.error("Submission readiness manifest is missing.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

console.log("ETHOnline submission readiness preflight");
console.log("========================================");
console.log(`mode: ${strict ? "STRICT FINAL GATE" : "STRUCTURAL READINESS"}`);

requireCondition(manifest.schemaVersion === 1, "manifest schemaVersion is 1");
requireCondition(
  manifest.safety?.defaultOrSubmissionMergeAuthorized === false,
  "default/submission merge remains unauthorized",
);
requireCondition(
  manifest.safety?.productionDeploymentAuthorized === false,
  "production deployment remains unauthorized",
);
requireCondition(manifest.safety?.mainnetAuthorized === false, "mainnet remains unauthorized");
requireCondition(
  manifest.safety?.fundingAuthorizedByAutomation === false,
  "automation funding/spending remains unauthorized",
);
requireCondition(
  manifest.safety?.secretMutationAuthorized === false,
  "secret mutation remains unauthorized",
);

requireCondition(sha(manifest.continuity?.immutableBaseline), "immutable baseline is an exact SHA");
requireCondition(sha(manifest.continuity?.frozenFoundation), "frozen foundation is an exact SHA");
requireCondition(sha(manifest.integration?.heldHead), "integration hold is an exact SHA");

const expectedGolden = new Map([
  ["YT-01→YT-04", "24bbf0d7516499069f5102ae4bf724b0cb376b94"],
  ["YT-05→YT-08", "d5309a96d532ee107011c2a5cefc3000b9e4932f"],
]);
const golden = manifest.productTruth?.golden ?? [];
requireCondition(golden.length === 2, "exactly two frozen Golden executable slices are declared");
for (const item of golden) {
  const expected = expectedGolden.get(item.slice);
  requireCondition(Boolean(expected), `Golden slice is recognized: ${item.slice}`);
  if (expected) {
    requireCondition(item.executableSha === expected, `${item.slice} exact Golden SHA is unchanged`);
  }
  requireCondition(item.humanApproved === true, `${item.slice} is explicitly human-approved`);
}

requireCondition(
  manifest.productTruth?.coreRule ===
    "provider rules ∩ holder mandate ∩ acquirer eligibility/payment",
  "stakeholder intersection rule is preserved exactly",
);
requireCondition(
  manifest.productTruth?.thesis?.includes("Ledger defines what the human authorized") &&
    manifest.productTruth?.thesis?.includes("World proves which human-backed delegated agent is asking") &&
    manifest.productTruth?.thesis?.includes("Hedera enforces what the agent can do"),
  "single Ledger → World → Hedera sponsor thesis is preserved",
);

const requiredReadinessFiles = [
  "docs/ethonline-2026/release-readiness/manifest.json",
  "docs/ethonline-2026/release-readiness/SECRET-CONTRACT.md",
  "docs/ethonline-2026/release-readiness/HEDERA-45-USDC-RUNBOOK.md",
  "docs/ethonline-2026/release-readiness/INTEGRATION-REHEARSAL.md",
  "docs/ethonline-2026/release-readiness/E2E-ACCEPTANCE.md",
  "docs/ethonline-2026/release-readiness/EVIDENCE-PACK.md",
];
for (const file of requiredReadinessFiles) {
  requireCondition(exists(file), `readiness source-of-truth exists: ${file}`);
}

for (const [name, sponsor] of Object.entries(manifest.sponsors ?? {})) {
  requireCondition(sha(sponsor.head), `${name} head is pinned to an exact SHA`);
  if (sponsor.integrationReady === true) {
    requireCondition(
      Array.isArray(sponsor.blockers) && sponsor.blockers.length === 0,
      `${name} cannot be integration-ready while blockers remain`,
    );
  }
}

if (manifest.finalAcceptance?.readyForSubmission === true) {
  requireCondition(
    manifest.integration?.integrationReady === true,
    "submission-ready implies integration-ready",
  );
  for (const [name, sponsor] of Object.entries(manifest.sponsors ?? {})) {
    requireCondition(sponsor.integrationReady === true, `submission-ready implies ${name} integration-ready`);
  }
}

const networkEnv = [
  process.env.HEDERA_NETWORK,
  process.env.NEXT_PUBLIC_HEDERA_NETWORK,
  process.env.YOURTURN_HEDERA_NETWORK,
].filter(Boolean);
for (const value of networkEnv) {
  requireCondition(String(value).toLowerCase() === "testnet", `configured Hedera network is testnet (${value})`);
}

for (const file of walk(root)) {
  const relative = path.relative(root, file);
  const basename = path.basename(file);

  if (/^\.env(?:\.|$)/.test(basename) && !/\.example$/.test(basename)) {
    fail(`tracked environment file is forbidden in submission readiness: ${relative}`);
    continue;
  }

  if (!/\.(md|txt|ts|tsx|js|mjs|json|yml|yaml|example)$/.test(relative)) continue;
  const body = fs.readFileSync(file, "utf8");

  if (/BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY/.test(body)) {
    fail(`private key block found in tracked file: ${relative}`);
  }
  if (/\b\d{8,12}:AA[A-Za-z0-9_-]{20,}\b/.test(body)) {
    fail(`Telegram-style bot token found in tracked file: ${relative}`);
  }
}

const blockers = [];
for (const [name, sponsor] of Object.entries(manifest.sponsors ?? {})) {
  for (const blocker of sponsor.blockers ?? []) blockers.push(`${name}: ${blocker}`);
}
if (manifest.integration?.integrationReady !== true) {
  blockers.push(`integration: ${manifest.integration?.reason ?? "not integration-ready"}`);
}
if (manifest.finalAcceptance?.readyForSubmission !== true) {
  blockers.push("final acceptance: readyForSubmission is false");
}

for (const message of passes) console.log(`ok   ${message}`);
for (const message of warnings) console.log(`warn ${message}`);

if (failures.length) {
  console.error("\nSTRUCTURAL FAILURES");
  console.error("-------------------");
  for (const message of failures) console.error(`no   ${message}`);
  process.exit(1);
}

console.log("\nStructural readiness checks passed.");

if (blockers.length) {
  console.log("\nFINAL SUBMISSION GATE: BLOCKED");
  console.log("------------------------------");
  for (const blocker of blockers) console.log(`hold ${blocker}`);
  if (strict) process.exit(2);
} else {
  console.log("\nFINAL SUBMISSION GATE: READY");
}
