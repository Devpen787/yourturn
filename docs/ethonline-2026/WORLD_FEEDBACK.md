# World AgentKit / AgentBook Feedback — YourTurn ETHOnline 2026

This feedback is grounded in YourTurn's delegated recovery integration. World is used to answer one narrow question: **is this exact requesting agent human-backed under the World/AgentKit model?** YourTurn separately establishes booking-holder delegation, provider policy, eligibility and settlement permission.

## What worked well

- The World signal fits naturally as one layer in a multi-authority decision rather than as a replacement for application authorization.
- Binding the signed request to an exact resource, statement, operation and intent makes the integration materially stronger than a decorative “verified” badge.
- AgentBook resolution provides a useful separation between the application's internal agent identity and the World-facing requester.

## Friction encountered

### 1. Identity proof vs application authority needs stronger guidance

A World-backed request can still be controlled by a human operating a malicious or incorrectly configured agent. The application must not infer booking ownership, honesty, eligibility or action permission from the World result.

**Suggested improvement:** include a prominent trust-boundary pattern showing `World requester verification` followed by an independent application authorization decision.

### 2. Exact request-binding examples should be end-to-end

For sensitive writes, developers need an example that simultaneously binds:

- exact resource URI;
- exact signed statement;
- operation/intent identifier;
- request age/expiry;
- nonce/replay handling;
- expected requester from an independently resolved application mapping.

**Suggested improvement:** publish one canonical server example with all of those checks together plus tampered resource/statement/requester/replay negatives.

### 3. AgentBook and AgentKit responsibilities can be easier to distinguish

During integration it matters whether a fact comes from cryptographic request verification, AgentBook registration/resolution, or application-owned enrollment.

**Suggested improvement:** document the three layers side by side and state which one should be authoritative for requester signature, registered agent identity and application-specific permissions.

### 4. Sandbox evidence should have an explicit qualification recipe

A developer can have strong deterministic verifier tests while still lacking the exact remote Sandbox evidence expected by a sponsor reviewer.

**Suggested improvement:** provide a short qualification checklist with the required positive and negative remote cases, what safe evidence to capture, and how to avoid exposing unnecessary World/human identifiers.

### 5. Failure semantics would benefit from stable reason categories

Applications need to distinguish malformed/tampered request, unresolved agent, replayed nonce, stale request and external verifier/AgentBook outage so they can fail closed without misleading users.

**Suggested improvement:** document stable high-level error categories and recommended UX handling for retryable availability failures versus invalid authorization.

## Privacy feedback

The integration benefited from treating World data as request-verification input only. We intentionally avoid putting raw World/human identifiers into public receipts or Hedera evidence.

A dedicated privacy section with recommended minimum persisted fields for delegated-agent applications would make this approach easier to reproduce.

## Evidence still required for final qualification

The final exact candidate still needs a credential-bearing canonical signed request plus the required tampered/unresolved/replay evidence attached to that same route. This document does not convert CI/CONFIGURED evidence into LIVE/SIGNED-ROUTE evidence.