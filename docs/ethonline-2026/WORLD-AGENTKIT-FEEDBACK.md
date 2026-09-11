# World AgentKit integration feedback — YourTurn ETHOnline 2026

This feedback is grounded in the actual YourTurn Delegated Recovery integration on `feature/ethonline-world`. It distinguishes what we exercised from what still needs Sandbox-App testing.

## Docs reviewed

- ETHOnline 2026 World AgentKit Continuity requirement captured in `docs/ethonline-2026/sponsors/WORLD.md` and Sponsor Dev-Docs Gate #25.
- `worldcoin/agentkit` AgentBook registration guide (`cli/REGISTRATION.md`).
- `@worldcoin/agentkit` request verification APIs used by the integration: `parseAgentkitHeader`, `validateAgentkitMessage`, `verifyAgentkitSignature`, `createAgentBookVerifier`.
- Official World developer docs for World ID Sandbox access/environment configuration (`world-id/sandbox/sandbox-access.mdx`).

## What we integrated and exercised

YourTurn uses World as an additional requester-identity boundary for Delegated Recovery. World does not decide who owns the booking or whether the recovery action is permitted.

The server verifies the `agentkit` header with the official package, checks freshness, verifies the request signature, resolves the signer through AgentBook, then compares the verified signer with the agent address already bound into the server-signed YourTurn recovery grant. Persistent replay state uses Redis and atomically consumes the verified resource+nonce pair.

We also ran the production `createAgentBookVerifier()` against a real registered agent. GitHub Actions run `34424393203` returned `LIVE/AGENTBOOK`, `agentBookResolved: true`, `verifierNetwork: worldchain`, and `humanIdExposed: false`. The proof artifact is `10132086374`.

## AgentKit SDK / integration feedback

### What worked well

The low-level verifier pieces are small and composable. Being able to use parsing, message validation, signature verification, and AgentBook lookup independently made it straightforward to place World at an existing authorization boundary rather than redesigning the product around a framework.

`createAgentBookVerifier().lookupHuman(address)` is also a clean server-side primitive. It let us convert the AgentBook result immediately into a privacy-minimized boolean signal and avoid carrying the human identifier into receipts or Hedera/HCS evidence.

### Resource binding is easy to overestimate

In the package version used by this project (`@worldcoin/agentkit@0.2.1`), `validateAgentkitMessage` did not give us the full endpoint/path binding required for an authority-changing recovery request. YourTurn therefore adds an exact canonical URL comparison after AgentKit validation so a signed request for `/api/agent/preview` cannot authorize `/api/agent/confirm` on the same host.

For security-sensitive integrations, the docs/reference would be clearer if they explicitly stated the exact URI components validated by the SDK and showed a full-resource binding example.

### Nonce freshness versus atomic replay consumption

The `checkNonce` hook is useful for validation, but an authorization-changing application still needs durable atomic consumption after cryptographic verification. A read-style freshness callback alone is not sufficient under concurrent replay.

YourTurn uses a Redis `SET NX EX` consume step keyed by a hash of the exact resource URI plus nonce. It would help if the AgentKit guide explicitly separated:

1. freshness validation;
2. atomic nonce consumption;
3. recommended ordering relative to signature verification and the protected side effect.

That distinction matters for agentic payment/booking actions where two concurrent copies of the same signed request must not both execute.

## AgentBook registration / resolution feedback

The CLI flow is simple conceptually: register an agent address, complete World ID verification, then query status. The resulting AgentBook record resolved successfully through YourTurn's production verifier.

There is, however, a network-description ambiguity worth tightening. The registration guide says the CLI-supported/default registration networks are Base/Base Sepolia and that default automatic registration is on Base, while the same guide lists a Worldchain AgentBook deployment. In our actual registration, the CLI status reported the agent as registered on **World Chain (`eip155:480`)**, and `createAgentBookVerifier()` resolved it on World Chain.

A single table explaining which chain each command (`register`, `status`, SDK `lookupHuman`) reads/writes by default, and whether registrations are mirrored/shared across deployments, would remove substantial uncertainty.

## Privacy feedback

The AgentBook lookup returns a human identifier because the application may need a stable per-human primitive. For many product surfaces, however, that identifier should never leave the server boundary.

Our public result intentionally exposes only `human-backed-agent`, source, and verification time. We do not put the raw human identifier in logs, UI receipts, HCS, or public proof artifacts. A first-class privacy-minimized verifier/result helper in AgentKit would make this safe pattern easier to adopt.

## Developer Portal feedback

**Not yet claimed as exercised.** This worker did not interact with the Developer Portal because the current execution environment is GitHub-only. We will add concrete navigation/search/discovery/debugging feedback only after the required Sandbox App flow is actually performed. We do not want to fabricate portal feedback from documentation alone.

## World ID Sandbox App feedback

**Pending live Sandbox App exercise.** The current official docs are clear that Sandbox requires both a separate sandbox World ID app and `environment: sandbox` in the integration. iOS access is through gated TestFlight enrollment; Android uses a private Google Play testing track. The docs also state Sandbox proofs are non-production and accounts are resettable.

We have not yet completed the required remote Sandbox App flow, so we are not claiming observations about Sandbox proof states, test-user behavior, or device-specific errors. Those findings will be appended after a real run.

One product/documentation distinction that could be clearer for AgentKit Continuity builders: AgentBook registration itself already uses a World ID verification flow, but the prize separately requires World ID Sandbox App remote testing. The docs would benefit from an explicit recommended test matrix showing which AgentKit/AgentBook behaviors should be exercised with the Sandbox app versus production World App registration.

## Requirement -> code -> evidence

| Requirement | YourTurn code | Current evidence |
| --- | --- | --- |
| Official AgentKit request/signature verification | `lib/world-agentkit/server-verifier.ts` | CI adversarial verification; SEC-WORLD-003 crypto-origin layer independently accepted |
| Live AgentBook resolution | `scripts/world-agentbook-live-check.mjs` using `createAgentBookVerifier()` | **LIVE/AGENTBOOK** run `34424393203`; artifact `10132086374` |
| Exact delegated-agent binding | `lib/world-agentkit/recovery-write-gate.ts` + server-signed grant claim | CI; valid wrong human-backed agent is rejected |
| Load-bearing recovery write gate | `app/api/agent/confirm/route.ts` for `create_listing` / `cancel_release` | CI/build at branch head; independent security re-attack still required |
| Persistent replay protection | `lib/world-agentkit/nonce-store.ts` | CI adversarial replay/concurrency semantics; Redis configured path |
| Privacy/data minimization | `toWorldPublicTrustSummary()` + live proof harness | CI + LIVE/AGENTBOOK artifact shows `humanIdExposed: false` |
| World ID Sandbox App remote test | not complete | **MISSING — required before qualification** |
| Developer Portal/Sandbox experiential feedback | this document, pending append | **PARTIAL — do not treat as complete until Sandbox is exercised** |

## Remaining feedback to capture after Sandbox

Append only observations actually encountered: tester-access path, Developer Portal discoverability, install/link handoff, proof states, reset behavior, test-user ergonomics, errors/edge cases, and debugging quality. Until that happens, this document is deliberately partial rather than invented.
