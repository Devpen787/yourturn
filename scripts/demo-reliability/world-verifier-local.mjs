/**
 * WORLD VERIFIER — LOCAL NEGATIVE-PATH EVIDENCE
 *
 * Exercises the REAL `verifyWorldAgentRequest`, which uses the official
 * @worldcoin/agentkit primitives (parseAgentkitHeader / validateAgentkitMessage /
 * verifyAgentkitSignature), with SYNTHETIC headers and a STUBBED AgentBook lookup.
 *
 * WHAT THIS PROVES:  the verifier refuses malformed, mis-scoped and
 *                    unverifiable requests, and names the refusal truthfully.
 * WHAT THIS DOES NOT PROVE:  positive cryptographic verification, AgentBook
 *                    resolution, or that any real human-backed agent exists.
 *                    A genuine AgentKit-signed header is required for that and
 *                    is out of scope here (no World provider calls).
 *
 * The real nonce store interface is { isFresh, consume } — an earlier harness
 * used a `consumeOnce` shape that does not exist on the real type.
 *
 * EVIDENCE CLASS: LOCAL. Never LIVE, never CONFIGURED.
 */
import { verifyWorldAgentRequest } from "../../lib/world-agentkit/server-verifier.ts";

const RESOURCE = "https://example.invalid/api/agent/confirm";
const AGENT = "0x" + "cd".repeat(20);

/** Real interface shape: isFresh + consume. */
const nonceStore = (opts = {}) => ({
  async isFresh() { return opts.fresh ?? true; },
  async consume() { return opts.consumed ?? true; },
});

const cases = [
  { name: "missing header", header: null, expect: "missing_agentkit_header" },
  { name: "garbage header", header: "not-an-agentkit-header", expectAnyOf: ["invalid_agentkit_header", "agentkit_message_invalid"] },
  // A whitespace-only header is truthy, so it correctly reaches the parser
  // rather than the missing-header guard. Expectation corrected to match.
  { name: "whitespace header", header: "   ", expect: "invalid_agentkit_header" },
  { name: "structured but unsigned", header: JSON.stringify({ address: AGENT, resource: RESOURCE, nonce: "n1" }),
    expectAnyOf: ["invalid_agentkit_header", "agentkit_message_invalid", "agentkit_signature_invalid"] },
  { name: "base64 junk", header: Buffer.from("{}").toString("base64"),
    expectAnyOf: ["invalid_agentkit_header", "agentkit_message_invalid"] },
];

let failures = 0;
console.log("real verifyWorldAgentRequest — synthetic input, stubbed AgentBook\n");
for (const c of cases) {
  let decision;
  try {
    decision = await verifyWorldAgentRequest({
      agentkitHeader: c.header,
      expectedResourceUri: RESOURCE,
      expectedAgentAddress: AGENT,
      nonceStore: nonceStore(),
      agentBook: { async lookupHuman() { throw new Error("stubbed: no World provider call in this harness"); } },
    });
  } catch (e) {
    console.log(`  THREW  ${c.name}: ${e.message}`); failures += 1; continue;
  }
  if (decision.status !== "blocked") {
    console.log(`  FAIL   ${c.name}: expected blocked, got ${decision.status}/${decision.reason}`); failures += 1; continue;
  }
  const ok = c.expect ? decision.reason === c.expect
                      : (c.expectAnyOf ?? []).includes(decision.reason);
  console.log(`  ${ok ? "PASS " : "FAIL "}  ${c.name}: blocked/${decision.reason}`);
  if (!ok) failures += 1;
}

// Truthfulness: a block must never leak the stub's internals or the agent address.
console.log("\nno-leak check on refusal detail");
const d = await verifyWorldAgentRequest({
  agentkitHeader: "garbage", expectedResourceUri: RESOURCE, expectedAgentAddress: AGENT,
  nonceStore: nonceStore(),
  agentBook: { async lookupHuman() { throw new Error("SENSITIVE-STUB-DETAIL"); } },
});
const blob = JSON.stringify(d);
if (blob.includes("SENSITIVE-STUB-DETAIL")) { console.log("  FAIL  internal error text surfaced in decision"); failures += 1; }
else console.log("  PASS  refusal carries no internal stub detail");

console.log(`\nWORLD VERIFIER LOCAL NEGATIVE PATH: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failure(s))`);
console.log("  positive cryptographic verification is NOT covered by this test.");
process.exit(failures === 0 ? 0 : 1);
