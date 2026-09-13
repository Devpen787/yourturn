# World AgentKit / AgentBook Feedback — YourTurn ETHOnline 2026

World is used for one narrow trust question: **is the exact requester a human-backed registered agent?** YourTurn separately resolves holder delegation, provider policy, buyer eligibility/payment and settlement permission.

## What worked

- AgentKit request signing fits a least-authority application model when it is followed by independent app authorization.
- Exact resource/statement/operation/request-age binding makes the World layer materially load-bearing instead of a badge.
- AgentBook gives a useful registration layer between the application's internal agent identity and World-facing requester.

## Most useful DX improvements

1. Publish one canonical end-to-end server example that combines request verification, exact resource, nonce/replay, freshness, AgentBook resolution and independently expected requester binding.
2. Put a prominent trust-boundary diagram in the docs: `World requester verification → application authorization`; state explicitly that human-backed does not imply booking ownership or action permission.
3. Separate AgentKit crypto, AgentBook registration/resolution and application enrollment responsibilities side-by-side.
4. Provide a Sandbox qualification recipe with positive/negative evidence and privacy-safe capture guidance.
5. Document stable high-level failure categories for malformed/tampered, unresolved requester, replay, stale request and external availability failure.

## Privacy

YourTurn intentionally keeps raw World/human identifiers out of public receipts and Hedera evidence. A “minimum data to persist” pattern would make that easier to reproduce.

## Evidence boundary

Settled evidence includes LIVE/AGENTBOOK and a real non-production Sandbox proof. Those do not by themselves establish an exact credential-bearing final `/api/agent/confirm` mutation. A later signed final-path run may upgrade that specific claim, but existing World evidence remains valid within its exact class and is not invalidated by the absence of that upgrade.
