import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "AGENTS.md",
  "PROJECT_DIRECTIVES.md",
  "docs/DEMO.md",
  "docs/UI-MAP.md",
  "docs/ethglobal-nyc-2026/DOCTRINE.md",
  "docs/ethglobal-nyc-2026/TECHNICAL-BLUEPRINT.md",
  "docs/ethglobal-nyc-2026/HEDERA-BOUNTY-MAP.md",
  "docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md",
  "docs/ethglobal-nyc-2026/YOURTURN-PREMIUM-UX-DELTA-REPORT.md",
  "docs/ethglobal-nyc-2026/IMPLEMENTATION-PLAN.md",
  "docs/ethglobal-nyc-2026/BUILD-GUARDRAILS.md",
];

const textChecks = [
  {
    file: "docs/ethglobal-nyc-2026/DOCTRINE.md",
    mustInclude: [
      "Discovery",
      "Facts",
      "Inferences",
      "Decisions",
      "Next steps",
      "Human approval is required",
      "Do not say refund unless",
      "Claim Automation only if",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/TECHNICAL-BLUEPRINT.md",
    mustInclude: [
      "Proof Object",
      "Concierge Decision Loop",
      "Hedera Schedule Service",
      "preview -> approval -> execute -> receipt",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/HEDERA-BOUNTY-MAP.md",
    mustInclude: [
      "Do not claim Automation if",
      "Do not claim AI & Agentic Payments if",
      "Claim No Solidity if",
      "schedule id",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md",
    mustInclude: [
      "Agent identity",
      "Tool manifest",
      "Policy gates",
      "Agent proof receipt",
      "HCS-14",
      "Agent Kit runtime",
      "budget",
      "npm run hedera:agent-check",
      "Not claimed",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/IMPLEMENTATION-PLAN.md",
    mustInclude: [
      "Fix `/my-bookings` runtime error",
      "Marketplace Browse",
      "Class Detail, Ticket, And Proof Drawer",
      "Recovery Flow And In-App Concierge",
      "Owner Policy Builder",
      "Hedera Schedule Service Automation",
      "Route-Level Target State",
      "Verification Plan",
    ],
  },
  {
    file: "docs/ethglobal-nyc-2026/BUILD-GUARDRAILS.md",
    mustInclude: [
      "Imported Prior Patterns",
      "Thread Hydration Contract",
      "Mission Control",
      "failure stops the pass",
      "repo-first read order",
      "If memory is available",
      "Do not explain past a failed gate",
    ],
  },
  {
    file: "PROJECT_DIRECTIVES.md",
    mustInclude: ["Decision Check", "Proof Check", "Drift Check", "No Solidity"],
  },
];

const forbiddenCodeFiles = [".sol"];
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
