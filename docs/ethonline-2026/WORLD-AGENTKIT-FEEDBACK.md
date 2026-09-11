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

**Exercised 2026-09-11** during the live Sandbox run recorded in `world/WORLD-ID-SANDBOX-PROOF.md`.

What worked well: World ID 4.0 RP setup was straightforward. The **World ID Configuration** screen presents App ID, RP ID, and the registered signer address together on one page, which made it trivial to confirm that the app↔RP pairing was correct and that the locally held signing key matched the registered signer. During debugging this single screen closed out two hypotheses at once. `Rotate signer key` is clearly labelled with its consequence ("will create a new signer key and disable the existing key"), which is the right amount of warning.

Two navigation findings:

**"Verification" in the left sidebar is ambiguous.** For an integrator debugging a failed proof, "Verification" reads as *where verification settings live*. It actually opens the app-listing submission wizard (Basic information → Availability → Localised content → Review and confirm) for ecosystem/Mini App Store listing. We opened it looking for a minimum-verification-level setting and were one click from filing a listing submission we did not want. Naming it "App listing", "Submit for review", or grouping it under a publishing heading would prevent that.

**No visible verification-attempt log.** When World rejected a proof with a 400 from `POST /api/v4/verify/{rp_id}`, there was no Portal surface showing that a verification attempt had arrived and been rejected, or why. A per-RP recent-attempts view — timestamp, action, outcome, error code, with no identity material — would have shortened debugging considerably. As it stood, the only way to see the failure reason was to instrument our own client and log it server-side.

## World ID Sandbox App feedback

**Completed 2026-09-11 on iOS.** A real signed request was handed to the Sandbox app and the returned proof was accepted by World's v4 verify endpoint. Observations below are only things actually encountered.

### Install and access

TestFlight Sandbox access was granted without friction and the app installed and launched successfully. `environment: "sandbox"` in IDKit plus the separate Sandbox app matched the documentation exactly, and Sandbox proofs verifying against the production `/api/v4/verify/{rp_id}` endpoint worked as documented — that detail is easy to misread as an error and is worth the emphasis the docs give it.

### Account setup — passkey error 5013

While upgrading the Sandbox account's login method, adding a passkey repeatedly failed with **`Error adding backup (5013)`**. The app then warned that skipping the new login method may leave the account unrecoverable or prevent logging back in. Because the signed-in Sandbox session was in active use for the integration test, we chose not to risk it and remained signed in rather than experimenting further. Reported as an observed error only; we claim no root cause.

### `credential_unavailable` is the single biggest time sink

The most costly finding of the whole integration. A Sandbox account that does not hold the requested credential fails with IDKit error `credential_unavailable` — but the user-facing app shows only a generic **"Something went wrong. We couldn't complete your request."**

Nothing in that message indicates that the test account simply lacks the credential, and nothing points to where to provision it. We only recovered the actual code by instrumenting IDKit's `onError` in our own client and posting it to a temporary local endpoint. An integrator without that instinct would be stuck with an unactionable error.

Two concrete suggestions:

1. Surface a credential-specific message in the Sandbox app — "this test account has no Proof of Human credential" — with a path to add it. Sandbox exists to simulate credentials, so this is exactly the case it should handle gracefully.
2. Document a "first Sandbox run" checklist that includes provisioning credentials onto the test identity **before** the first proof attempt. The current docs explain environment and app setup thoroughly but do not foreground credential state as a prerequisite.

### "Try Again" reuses an expired request

The widget's own **Try Again** control retries with the existing `rp_context` rather than requesting a freshly signed one. With a 300s TTL, a retry attempted 527s after request creation failed — again with the same generic "Something went wrong". Because the message is identical to the `credential_unavailable` case, two genuinely different failures were indistinguishable from the UI, which sent us down the wrong diagnostic path initially.

Either having "Try Again" request a fresh RP context, or reporting expiry distinctly, would remove a real class of confusion.

### Debugging and discoverability, overall

The failure modes we hit were all diagnosable in principle but not from anything World surfaced directly. Three different root causes — missing credential, expired request, and a provider-side 400 — presented as two nearly identical generic modals. What made the difference was instrumenting our own client and reading server timings; notably, outbound call duration was the clearest signal distinguishing "World actually rejected this proof" from "the flow never got that far".

A short "debugging your first Sandbox integration" page mapping each IDKit error code to its likely cause and fix would be high value for hackathon builders working under time pressure.

### Privacy ergonomics were good

Nothing in the successful path required us to handle, store, or display proof payloads, nullifiers, or human identifiers. Forwarding the IDKit result as-is to the verify endpoint and reading only the success status made a privacy-minimal integration the path of least resistance, which is the right default.

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
| World ID Sandbox App remote test | `app/world-sandbox/` + `app/api/world-id/sandbox/` | **GREEN — real round trip verified 2026-09-11**; see `world/WORLD-ID-SANDBOX-PROOF.md` |
| Developer Portal/Sandbox experiential feedback | this document | **COMPLETE — written from an actual exercised run** |

## Scope note

Every observation in the Developer Portal and Sandbox App sections was encountered during the 2026-09-11 run. Nothing here is inferred from documentation alone, and failure modes we could not diagnose are recorded as undiagnosed rather than explained speculatively.
