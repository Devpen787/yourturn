# World ID Sandbox proof — ETHOnline 2026

Status: **CI/CONFIGURED until a real Sandbox app round trip succeeds.**

This is an isolated sponsor-proof harness for the World AgentKit Continuity requirement. It does not change the human-approved YT-01→YT-08 Golden customer journey and does not promote AgentKit/AgentBook evidence by itself.

## Continuity requirement targeted

World AgentKit Continuity requires meaningful AgentKit use, a working app, AgentBook registration/resolution where relevant, **World ID Sandbox App remote testing**, and grounded feedback covering the Developer Portal / Sandbox proof flow and errors encountered.

The existing World branch already has AgentKit cryptographic verification and LIVE/AGENTBOOK registration/resolution. This increment closes only the missing Sandbox integration surface; evidence stays CI/CONFIGURED until the actual phone handoff and backend verification complete.

## Official docs reviewed — 2026-09-10

Current official sources were read directly from the public `worldcoin/developer-docs`, `worldcoin/developer-portal`, and `worldcoin/idkit` repositories before implementation:

- `world-id/idkit/integrate.mdx`
  - use current IDKit 4.x;
  - generate RP signatures in the backend;
  - create the IDKit request with `app_id`, action and RP context;
  - forward the returned IDKit payload **as-is** to `POST https://developer.world.org/api/v4/verify/{rp_id}`.
- `world-id/idkit/signatures.mdx`
  - RP signatures prove the request originates from the relying party;
  - the signing key is server-only and must never reach client code;
  - documented JS API is `signRequest({ signingKeyHex, action, ttl })`.
- `world-id/idkit/react.mdx`
  - React integration uses `IDKitRequestWidget` / hooks;
  - RP context fields are `rp_id`, `nonce`, `created_at`, `expires_at`, `signature`;
  - `handleVerify` can require backend verification before success.
- `world-id/idkit/integration-prompt.mdx`
  - recommended World ID 4.0 request uses `proofOfHuman()` and `allow_legacy_proofs: true`.
- `world-id/sandbox/sandbox-access.mdx`
  - install the gated Sandbox app;
  - set IDKit `environment: "sandbox"`;
  - Sandbox proofs still verify against the production `/api/v4/verify/{rp_id}` endpoint.
- `world-id/sandbox/what-is-sandbox.mdx`
  - Sandbox supports a real end-to-end bridge round trip, simulated verification and resettable test accounts;
  - Sandbox proof is integration evidence, not production identity evidence.
- `world-id/SKILL.md`
  - app/RP/action/environment alignment is part of integration readiness;
  - keep the RP private signing key out of chat/logs/client code.
- `worldcoin/developer-portal/web/api/mcp/SKILL.md`
  - v4 actions **do not require pre-registration**: the v4 verify endpoint can lazy-create the action on first verification;
  - `create_world_id_action` is only needed when deliberately configuring action metadata/settings in advance.
- current `worldcoin/idkit` React package metadata: `@worldcoin/idkit` **4.2.3**.

## Portal resources

Public identifiers used by the harness:

- App ID: `app_ba495b56fa36135edd63753effe511f7`
- RP ID: `rp_c3e6060f9b2b5593`
- fixed action: `yourturn-recovery-sandbox-2026`
- fixed non-identifying signal: `yourturn-ethonline-recovery-v1`
- environment: `sandbox`

The RP private signer generated in the Developer Portal is **not** stored in GitHub. The local runtime reads only `WORLD_ID_RP_SIGNING_KEY` from the server environment.

No manual action creation is required for the first v4 Sandbox verification. If the Portal reports an action/environment error, inspect that concrete error before changing configuration; do not create parallel actions speculatively.

## Requirement → code → evidence

| Requirement | Implementation | Current evidence |
| --- | --- | --- |
| IDKit 4.x | `@worldcoin/idkit@4.2.3` exact pin | CI dependency/build only |
| Sandbox destination | `lib/world-id/sandbox-config.ts` + `/world-sandbox` uses `environment="sandbox"` | CI/CONFIGURED |
| RP-authenticated request | `POST /api/world-id/sandbox/rp-context` uses server-only `signRequest(...)` | CI/CONFIGURED; no RP secret in CI |
| No signer oracle | action is a server-owned constant; signer route accepts no client-selected action | CI contract check |
| Local-only secret use | Sandbox APIs require explicit `WORLD_ID_SANDBOX_PROOF_ENABLED=true`, loopback hostname, and same-origin browser requests | CI contract check |
| Proof handoff | `/world-sandbox` uses `IDKitRequestWidget` + `proofOfHuman()` | CI/CONFIGURED until phone round trip |
| Backend verification | `POST /api/world-id/sandbox/verify` forwards IDKit payload as-is to World v4 verify endpoint | CI/build until real provider success |
| Privacy-safe public result | success returns only environment/action/RP/time; proof, nullifier and raw human identifiers are not returned/logged | CI contract check |
| Sandbox evidence | real signed request → Sandbox app → returned proof → v4 verification | **RED / human run required** |

## Local proof runbook

Do not send the RP private key to ChatGPT, GitHub, issue comments, screenshots, or CI.

1. Use branch `feature/ethonline-world-sandbox-proof` after its exact-head Continuity Gate is green.
2. Put these values only in ignored local `.env.local`:

   `WORLD_ID_SANDBOX_PROOF_ENABLED=true`

   `WORLD_ID_RP_SIGNING_KEY=<local downloaded RP private key>`

3. Install from the committed lockfile:

   `npm ci --legacy-peer-deps`

4. Start the local app:

   `npm run dev`

5. Open:

   `http://localhost:3000/world-sandbox`

6. Click **Start Sandbox verification**. The request is deliberately short-lived (five minutes).
7. Use the already signed-in **World ID Sandbox** app to open/scan the generated handoff.
8. Complete the Sandbox Proof of Human flow.
9. Success is reached only when YourTurn receives the result and its backend receives an OK response from World `/api/v4/verify/{rp_id}`.
10. Capture only reviewer-safe evidence: success state, Sandbox environment, action, approximate time and non-secret Portal identifiers. Do **not** capture or publish the RP private key, raw proof payload, nullifier, AgentKit human id or account backup material.
11. Set `WORLD_ID_SANDBOX_PROOF_ENABLED=false` or stop the local process when the proof session is complete.

The proof API intentionally rejects non-loopback hosts even when the enable flag/key exist. This harness is not intended for Vercel, production, or remote deployment.

## Observed Sandbox / Portal feedback

Real observations from the current iOS setup, preserved because the sponsor explicitly asks for grounded Sandbox/Portal feedback:

- TestFlight Sandbox access was granted; the Sandbox app was installed and launches successfully.
- The Developer Portal World ID 4.0 RP setup generated a dedicated signer and now shows the RP ID plus public signer address.
- During Sandbox account login-method upgrade, attempting to add a passkey repeatedly returned **`Error adding backup (5013)`**.
- The app then warned that skipping the new login method may make the account unrecoverable / prevent logging back in.
- Because the Sandbox session is currently usable, the tester remained signed in rather than risking the active test session.
- This is an observed Sandbox UX/error-code issue only; no root cause is claimed without evidence.

## Nullifier boundary

World's general IDKit integration guide requires durable `(action, nullifier)` uniqueness when World ID proof is used as a product authorization/claim gate. This isolated ETHOnline Sandbox harness does **not** grant booking authority, settle value, create an account entitlement, or permit a repeatable claim; it exists only to prove the required remote Sandbox round trip. Therefore it deliberately does not persist or expose the nullifier.

If World ID proof becomes load-bearing product authorization later, durable nullifier uniqueness and replay handling require a separate security-reviewed implementation before that use is claimed.

## Claim boundary

A green build or `world:sandbox-check` is **not** Sandbox proof. It establishes only that the harness is structurally configured according to the reviewed IDKit 4.x API surface and that obvious secret/authority mistakes are blocked.

Only an actual phone round trip resulting in successful backend verification may upgrade this item to Sandbox evidence. That evidence remains separate from the outstanding registered-AgentKit signed recovery-route execution.
