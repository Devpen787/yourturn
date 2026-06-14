import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "AGENTS.md",
  "PROJECT_DIRECTIVES.md",
  "README.md",
  "docs/DEMO.md",
  "docs/UI-MAP.md",
  "docs/SUBMISSION.md",
  "docs/FINAL-DEMO-SCRIPT.md",
  "docs/ethglobal-nyc-2026/README.md",
  "docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md",
  "docs/ethglobal-nyc-2026/HEDERA-BOUNTY-MAP.md",
  "docs/ethglobal-nyc-2026/HEDERA-BOUNTY-SCORECARD.md",
  "docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md",
  "docs/ethglobal-nyc-2026/CAPABILITY-STATUS.md",
  "docs/ethglobal-nyc-2026/TELEGRAM-OPENCLAW-SETUP.md",
  "docs/ethglobal-nyc-2026/CONTINUITY-PACKET.md",
];

const removedPublicPlanningFiles = [
  "docs/ethglobal-nyc-2026/AGENT-AUTOMATION-INTEGRATION-PLAN.md",
  "docs/ethglobal-nyc-2026/BUILD-GUARDRAILS.md",
  "docs/ethglobal-nyc-2026/COMPETITOR-JOURNEY-SCREENSHOT-MAP.md",
  "docs/ethglobal-nyc-2026/DOCTRINE.md",
  "docs/ethglobal-nyc-2026/IMPLEMENTATION-PLAN.md",
  "docs/ethglobal-nyc-2026/PREMIUM-UX-COMPETITOR-RESEARCH.md",
  "docs/ethglobal-nyc-2026/TECHNICAL-BLUEPRINT.md",
  "docs/ethglobal-nyc-2026/UNKNOWN-QUESTIONS.md",
  "docs/ethglobal-nyc-2026/YOURTURN-PREMIUM-UX-DELTA-REPORT.md",
];

const textChecks = [
  {
    file: "README.md",
    mustInclude: [
      "YourTurn",
      "Autonomous On-Chain Automation Platform",
      "AI & Agentic Payments on Hedera",
      "No Solidity",
      "0.0.9228236",
      "OpenClaw ACP gateway runtime",
      "Not claimed as live",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/README.md",
    mustInclude: [
      "final public packet",
      "continuity submission",
      "Primary Hedera Claims",
      "Claim Boundaries",
      "0.0.9228236",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md",
    mustInclude: [
      "booking `193`",
      "booking `194`",
      "0.0.9228236",
      "npm run hedera:agent-check",
      "OpenClaw ACP Gateway runtime",
      "wallet-funded user allowances",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/HEDERA-BOUNTY-MAP.md",
    mustInclude: [
      "Claim Automation if",
      "Claim Agentic Payments if",
      "Do not claim Automation if",
      "Do not claim AI & Agentic Payments if",
      "0.0.9228236",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/HEDERA-BOUNTY-SCORECARD.md",
    mustInclude: [
      "9.2 / 10",
      "9.0 / 10",
      "0.0.9228236",
      "OpenClaw ACP and x402 are honest descriptor-only",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md",
    mustInclude: [
      "Agent identity",
      "Tool manifest",
      "Policy gates",
      "HCS-14",
      "Agent Kit runtime",
      "budget",
      "npm run hedera:agent-check",
      "Not claimed",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/CAPABILITY-STATUS.md",
    mustInclude: [
      "Live and tested",
      "Final Telegram proof",
      "Final E2E proof",
      "Not Claimed",
      "TELEGRAM_ALLOW_MUTATIONS=false",
    ],
  },
  {
    file: "PROJECT_DIRECTIVES.md",
    mustInclude: ["Decision Check", "Proof Check", "Drift Check", "No Solidity"],
  },
];

const forbiddenCodeFiles = [".sol"];
const forbiddenTrackedPatterns = [
  {
    name: "Telegram bot token",
    pattern: /\b\d{8,12}:AA[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "private key block",
    pattern: /BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY/,
  },
];
const ignoreDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  "output",
  ".vercel",
]);

function rel(file) {
  return path.relative(root, file);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const failures = [];
const passes = [];

for (const file of requiredFiles) {
  if (exists(file)) passes.push(`exists: ${file}`);
  else failures.push(`missing required file: ${file}`);
}

for (const file of removedPublicPlanningFiles) {
  if (exists(file)) failures.push(`planning/internal file should not be public: ${file}`);
  else passes.push(`not public: ${file}`);
}

for (const check of textChecks) {
  if (!exists(check.file)) continue;
  const body = read(check.file);
  for (const needle of check.mustInclude) {
    if (body.includes(needle)) passes.push(`${check.file}: includes "${needle}"`);
    else failures.push(`${check.file}: missing "${needle}"`);
  }
}

const packageJson = JSON.parse(read("package.json"));
for (const scriptName of [
  "dev",
  "build",
  "ethglobal:preflight",
  "ethglobal:e2e",
  "hedera:agent-check",
  "telegram:fixture",
]) {
  if (packageJson.scripts?.[scriptName]) {
    passes.push(`package script exists: ${scriptName}`);
  } else {
    failures.push(`package script missing: ${scriptName}`);
  }
}

for (const file of walk(root)) {
  for (const ext of forbiddenCodeFiles) {
    if (file.endsWith(ext)) {
      failures.push(`forbidden Solidity file found: ${rel(file)}`);
    }
  }

  const relative = rel(file);
  if (relative === "package-lock.json") continue;
  if (!/\.(md|txt|ts|tsx|js|mjs|json|example|yml|yaml)$/.test(relative)) continue;

  const body = fs.readFileSync(file, "utf8");
  for (const secretPattern of forbiddenTrackedPatterns) {
    if (secretPattern.pattern.test(body)) {
      failures.push(`forbidden ${secretPattern.name} found in ${relative}`);
    }
  }
}

console.log("ETHGlobal preflight");
console.log("===================");
for (const pass of passes) console.log(`ok  ${pass}`);
if (failures.length) {
  console.error("\nfailures");
  console.error("--------");
  for (const failure of failures) console.error(`no  ${failure}`);
  process.exit(1);
}
console.log("\nAll preflight guardrails passed.");
