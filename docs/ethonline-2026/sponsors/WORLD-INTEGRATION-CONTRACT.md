# World AgentKit integration contract — ETHOnline 2026

Status: **design + CI contract only; no live AgentKit/Sandbox claim yet**.

Checked against the current ETHOnline 2026 World prize page and World AgentKit docs on 2026-09-09.

## Sponsor qualification truth

AgentKit Continuity requires meaningful AgentKit use, a working app, AgentBook registration/resolution where relevant, remote testing with the World ID Sandbox App, and the requested integration/portal/sandbox feedback document.

Primary references:
- https://ethglobal.com/events/ethonline2026/prizes/world
- https://docs.world.org/agents/agent-kit/integrate
- https://docs.world.org/agents/agent-kit/sdk-reference

## What World proves in YourTurn

World AgentKit/AgentBook may establish only that the requesting agent wallet resolved through AgentBook to a human-backed agent signal for the requested resource.

It does **not** establish booking ownership, action permission, honesty/safety, mandate compliance, or provider-policy compliance. Those remain YourTurn/Hedera facts.

## Normalized boundary

`lib/world-agentkit/trust-boundary.ts` stays independent from Hedera transaction semantics. A future live AgentKit adapter may produce `WorldAgentVerification`; the recovery layer consumes a normalized result requiring source `world-agentkit`, a true human-backed signal, AgentBook resolution, exact resource binding, exact semantic EVM-address equality with the agent already named by the resolved YourTurn Recovery Mandate, and valid unexpired timestamps.

The gate fails closed for unverified, unresolved, resource-mismatched, malformed-agent, wrong-agent, invalid-time, materially future-dated, or expired evidence. `verifiedAt` may be at most 30 seconds ahead of the server clock to tolerate small clock skew without allowing arbitrary future freshness.

The expected delegated agent address must come from server-side YourTurn mandate/delegation state. It must never be copied from the same untrusted AgentKit request being verified, otherwise the identity-binding check becomes meaningless.

Raw AgentBook human identifiers must not cross this boundary. Public receipt/HCS evidence may expose only the minimal human-backed signal plus verification time/source; the agent wallet address is also excluded from the default public summary.

## Planned live adapter

Use the official `@worldcoin/agentkit` package rather than recreating its protocol. The current World SDK documents a Next.js-compatible low-level flow:

1. `parseAgentkitHeader(header)`;
2. `validateAgentkitMessage(payload, resourceUri, { checkNonce })`;
3. `verifyAgentkitSignature(payload)`;
4. `createAgentBookVerifier().lookupHuman(address)`;
5. reduce immediately to `WorldAgentVerification` and keep raw `humanId` private;
6. resolve the expected delegated agent independently from YourTurn mandate state;
7. evaluate `evaluateWorldAgentGate(...)` before delegated recovery writes continue;
8. persist nonce/replay state for production-quality use.

The SDK reference states that AgentKit uses EVM/SIWE signatures (`eip191`/`eip1271`), AgentBook resolves on World Chain, and Next.js handlers may use the low-level helpers.

## Target behavior

- valid human-backed requester + exact delegated-agent match + valid YourTurn delegation + valid provider policy -> continue;
- different valid human-backed agent -> block before settlement;
- invalid/tampered AgentKit message -> block before settlement;
- AgentBook unresolved -> block or explicitly documented read-only degradation;
- valid World signal + invalid booking mandate -> block, proving World does not replace YourTurn authority;
- raw World `humanId` -> never written to HCS/public receipt.

## Evidence truth

This increment can support only **CI/LOCAL** evidence for the normalized trust-boundary contract once branch CI passes.

Still **RED / not evidenced**: official AgentKit cryptographic request validation, live AgentBook resolution, Sandbox verification, sponsor feedback completion, and independent World qualification review. The normalized verification object is an internal post-verification representation, not cryptographic proof by itself.

Do not present this contract as sponsor integration completion.
