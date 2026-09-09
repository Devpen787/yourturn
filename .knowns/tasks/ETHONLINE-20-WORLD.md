# ETHONLINE-20 — World AgentKit Continuity

## Objective

Require a valid World human-backed-agent signal on the delegated recovery write path without confusing that signal with booking ownership or permission.

## Read first

- `docs/ethonline-2026/CONTINUITY_BASELINE.md`
- `docs/ethonline-2026/sponsors/WORLD.md`
- `docs/ethonline-2026/ACCEPTANCE.json`

## Build order

1. obtain/verify Sandbox access and minimal AgentKit integration;
2. validate agent request signatures/messages;
3. resolve agent through AgentBook where appropriate;
4. feed minimal verification result into YourTurn policy gate;
5. implement invalid/unresolved failure paths;
6. add customer/reviewer-safe wording;
7. complete required World feedback document;
8. independent claim-boundary review.

## Done when

- valid human-backed agent reaches the policy layer;
- invalid/tampered/unresolved request behaves exactly as documented;
- no World identifier leaks to HCS/public proof;
- the UI/docs do not claim World proves booking ownership, honesty or permission;
- Sandbox and feedback bounty requirements are evidenced.

## Handoff

Update `docs/ethonline-2026/progress.md`; do not modify Hedera transaction semantics except through an agreed foundation interface.
