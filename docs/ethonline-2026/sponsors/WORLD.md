# World AgentKit Continuity Mission

## Prize thesis

World should make YourTurn safer against anonymous/bot-driven agent abuse. It does **not** establish booking ownership or permission.

### Precise responsibility split

World proves:

> this requesting agent is backed by a real human under AgentKit/AgentBook semantics.

YourTurn proves:

> the current booking holder delegated this exact authority to this agent and the requested action fits both owner and provider rules.

Never collapse those into one claim.

## Mission W0 — integrate request verification

- validate AgentKit request/message at the agent write boundary;
- resolve the agent through AgentBook where relevant;
- carry only the minimum verification result into YourTurn policy evaluation;
- do not expose raw/unnecessary human identifiers in UI, logs, HCS or receipts.

## Mission W1 — use the signal meaningfully

At least one real behavior must change because World verification is present.

Preferred rule:

- human-backed delegated agent + valid YourTurn mandate -> may continue;
- unverified/invalid agent -> recovery write is blocked before settlement;
- optionally allow read-only preview for unverified callers if product/security review approves it.

Do not build a decorative verified-human badge.

## Mission W2 — Sandbox and failure evidence

Required demo/evidence cases:

- [ ] valid human-backed agent request succeeds to the YourTurn policy layer;
- [ ] invalid/tampered signature fails;
- [ ] unregistered/unresolved agent fails or degrades exactly as documented;
- [ ] no claim that World proves booking ownership, honesty, eligibility or action authorization;
- [ ] World Sandbox App path is tested remotely;
- [ ] required sponsor feedback document is completed.

## Mission W3 — UX

Customer-facing language should be simple:

- `Human-backed agent` is acceptable if accurate.
- Avoid `verified owner`, `trusted agent`, `safe agent`, or `verified person` unless the exact underlying World signal supports that wording.

The user should care mostly about their own mandate. World belongs in the trust/details layer and reviewer evidence, not as the main product headline.

## Independent reviewer attack questions

1. Could the same World-verified human control a malicious agent? If yes, is the UI honest about that?
2. Does YourTurn independently verify authority over booking #193?
3. Is World actually used on the write path, or only displayed?
4. What exactly happens if AgentBook/Sandbox verification is unavailable?
5. Did any personal/World identifier leak into HCS or public proof?
6. Were all required feedback and sandbox requirements satisfied?

Fail on uncertainty.
