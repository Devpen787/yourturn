// Product Workbench truth check.
//
// Detects phase / candidate / Golden / next-gate drift across the canonical
// Product Workbench documents. This exists because the same defect class has
// now occurred twice: docs that disagree with each other about which gate is
// open let a worker legitimately act on a superseded instruction.
//
// The contract is one machine-checkable marker per canonical document:
//   <!-- pw-state: phase=... candidate=... candidate-status=... ... -->
// Prose may differ; the declared state may not.
//
// Pure node, no dependencies, no build. Intended to run on docs-only changes.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve("docs/product-workbench");

const CANONICAL = [
  "README.md",
  "handoff.md",
  "journeys.md",
  "next-slice.md",
  "stakeholder-journeys.md",
  "stakeholder-coverage-gate.md",
];

const REQUIRED_KEYS = [
  "phase",
  "candidate",
  "candidate-status",
  "architecture-head",
  "architecture-status",
  "golden-yt-01-04",
  "golden-yt-05-08",
  "next-gate",
];

const VALID_CANDIDATE_STATUS = new Set(["REVISE", "REVIEWABLE", "GOLDEN-READY"]);
const SHA40 = /^[0-9a-f]{40}$/;

// Phrases that describe a gate which is closed once the phase advances past it.
// Keyed by the phase they are superseded by.
const SUPERSEDED_BY_PHASE = {
  XC_01_CANDIDATE: [
    "architecture/product-contract review",
    "remains proposed until",
    "pending; must reach",
    "Executable work remains blocked until",
    "Pre-existing exploratory XC-01 code",
    "reviews the architecture/product contract only",
  ],
};

const failures = [];
const fail = (doc, msg) => failures.push(`${doc}: ${msg}`);

function parseMarker(text) {
  const all = [...text.matchAll(/<!--\s*pw-state:([^>]*?)-->/g)];
  return all.map((m) => m[1].trim().replace(/\s+/g, " "));
}

function toPairs(raw) {
  const out = {};
  for (const tok of raw.split(" ")) {
    const i = tok.indexOf("=");
    if (i > 0) out[tok.slice(0, i)] = tok.slice(i + 1);
  }
  return out;
}

// ---- 1/2. every canonical doc carries exactly one marker, all identical ----
const markers = new Map();
for (const doc of CANONICAL) {
  const p = path.join(root, doc);
  if (!existsSync(p)) {
    fail(doc, "canonical document is missing");
    continue;
  }
  const found = parseMarker(readFileSync(p, "utf8"));
  if (found.length === 0) {
    fail(doc, "no <!-- pw-state: ... --> marker; canonical docs must declare the current state");
    continue;
  }
  if (found.length > 1) {
    fail(doc, `${found.length} pw-state markers; expected exactly 1`);
    continue;
  }
  markers.set(doc, found[0]);
}

const distinct = [...new Set(markers.values())];
if (distinct.length > 1) {
  failures.push(
    `pw-state DRIFT across canonical documents — ${distinct.length} different declared states:\n` +
      [...markers.entries()].map(([d, m]) => `    ${d}\n      ${m}`).join("\n")
  );
}

if (failures.length > 0) {
  console.error("Product Workbench truth check FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

const state = toPairs(distinct[0]);

// ---- 3. required keys present and well-formed ----
for (const key of REQUIRED_KEYS) {
  if (!state[key]) fail("pw-state", `missing required key '${key}'`);
}
for (const key of ["candidate", "architecture-head", "golden-yt-01-04", "golden-yt-05-08"]) {
  if (state[key] && !SHA40.test(state[key])) {
    fail("pw-state", `'${key}' must be a full 40-hex SHA, got '${state[key]}'`);
  }
}
if (state["candidate-status"] && !VALID_CANDIDATE_STATUS.has(state["candidate-status"])) {
  fail("pw-state", `'candidate-status' must be one of ${[...VALID_CANDIDATE_STATUS].join("/")}, got '${state["candidate-status"]}'`);
}
// Only Devinson freezes. A doc may never self-declare Golden.
if (/(^|_)GOLDEN(_|$)/.test(state.phase ?? "") && state.phase !== "GOLDEN_FROZEN_APPROVED") {
  fail("pw-state", `phase '${state.phase}' self-declares Golden; freezing requires explicit human approval`);
}

// ---- 4. declared Golden SHAs must match the Golden records themselves ----
const GOLDEN_RECORDS = {
  "golden-yt-01-04": "golden/yt-01-04.md",
  "golden-yt-05-08": "golden/yt-05-08.md",
};
for (const [key, rel] of Object.entries(GOLDEN_RECORDS)) {
  const p = path.join(root, rel);
  if (!existsSync(p)) {
    fail(rel, "Golden record is missing");
    continue;
  }
  const body = readFileSync(p, "utf8");
  if (state[key] && !body.includes(state[key])) {
    fail(rel, `Golden record does not contain the SHA declared in pw-state '${key}'=${state[key]}`);
  }
}

// ---- 5. no unknown SHA may be presented as Golden ----
// The candidate and architecture-head SHAs are legitimately discussed alongside
// the word "Golden" (e.g. "Golden executables remain untouched"). The drift that
// matters is a *fourth*, unaccounted SHA acquiring Golden status in prose.
const KNOWN_SHAS = new Set(
  ["golden-yt-01-04", "golden-yt-05-08", "candidate", "architecture-head"]
    .map((k) => state[k])
    .filter(Boolean)
);
for (const doc of CANONICAL) {
  const p = path.join(root, doc);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (line.includes("<!-- pw-state:")) continue;
    if (!/golden/i.test(line)) continue;
    for (const m of line.matchAll(/\b[0-9a-f]{40}\b/g)) {
      if (!KNOWN_SHAS.has(m[0])) {
        fail(doc, `unknown SHA presented as Golden: ${m[0]}\n      ${line.trim()}`);
      }
    }
  }
}

// ---- 6. superseded gate language must not survive a phase advance ----
const phaseFamily = (state.phase ?? "").startsWith("XC-01_CANDIDATE") ? "XC_01_CANDIDATE" : null;
if (phaseFamily && SUPERSEDED_BY_PHASE[phaseFamily]) {
  for (const doc of CANONICAL) {
    const p = path.join(root, doc);
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const phrase of SUPERSEDED_BY_PHASE[phaseFamily]) {
        if (line.includes(phrase)) {
          fail(doc, `line ${i + 1} keeps gate language superseded by phase ${state.phase}: "${phrase}"\n      ${line.trim()}`);
        }
      }
    });
  }
}

// ---- 7. the candidate SHA must not also be described as frozen/Golden ----
for (const doc of CANONICAL) {
  const p = path.join(root, doc);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (line.includes(state.candidate) && /\b(frozen|Golden product truth|GOLDEN-READY)\b/.test(line)) {
      fail(doc, `candidate ${state.candidate.slice(0, 12)} is described as frozen/Golden:\n      ${line.trim()}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Product Workbench truth check FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  [
    "Product Workbench truth check passed.",
    `  phase             ${state.phase}`,
    `  candidate         ${state.candidate} (${state["candidate-status"]})`,
    `  architecture      ${state["architecture-head"]} (${state["architecture-status"]})`,
    `  golden YT-01→04   ${state["golden-yt-01-04"]}`,
    `  golden YT-05→08   ${state["golden-yt-05-08"]}`,
    `  next gate         ${state["next-gate"]}`,
    `  agreeing docs     ${CANONICAL.length}`,
  ].join("\n")
);
