# Hedera Continuity Mission — Overdeliver, Don't Resubmit

## Prize target

Primary: Hedera Continuity.

Secondary upside to investigate separately: Hedera AI & Agentic Payments, only if Continuity entrants are explicitly eligible and prize stacking is allowed. Do not claim this until confirmed.

## Baseline warning

These are OLD: HTS booking NFTs, HCS audit, Schedule Service proof, Agent Kit v4, HBAR refund/release, Hedera x402 service, HBAR/USDC x402 settlement, wallet-funded allowance proof.

The judged Hedera story must be about new delegated authority, customer-visible USDC settlement, new agent capabilities and the complete UX.

## Mission H0 — Native delegated booking authority

### User promise

> I can let my agent recover one booking without handing it control of my wallet or every booking I own.

### Preferred Hedera-native implementation

- owner grants an NFT allowance to the recovery agent for one booking serial only;
- agent uses the approved NFT transfer path only when YourTurn policy permits;
- owner can revoke the serial allowance;
- allowance state is independently queried/verified;
- no `approvedForAll` shortcut in the hero path.

### Done when

- [ ] live Hedera testnet serial-scoped allowance exists;
- [ ] delegated agent can transfer the permitted serial through the intended path;
- [ ] same agent cannot transfer a different serial;
- [ ] revocation succeeds;
- [ ] transfer attempt after revocation fails;
- [ ] tx IDs / Mirror / HashScan evidence recorded.

## Mission H1 — Non-custodial mandate creation

Investigate Hedera Agent Kit v4 `AgentMode.RETURN_BYTES` first.

Goal:

- agent/server prepares the exact allowance transaction;
- owner sees a human-readable mandate summary;
- owner signs/broadcasts with their local wallet/client;
- YourTurn never needs the owner's private key.

If `RETURN_BYTES` cannot support the exact required allowance flow through current HAK tools, implement the smallest honest adapter/custom BaseTool needed and document why.

### Done when

- [ ] bytes/transaction are constructed from a real mandate;
- [ ] payer/account/type/expiry are validated before signing;
- [ ] owner-side signing path is demonstrated;
- [ ] malformed/wrong-account bytes are rejected;
- [ ] no owner private key stored in YourTurn.

## Mission H2 — BookingRightDelegationPolicy

Build a real HAK policy/plugin layer rather than scattering `if` statements across routes.

Policy inputs:

- holder/booking state;
- delegated agent/spender;
- serial;
- allowed action;
- minimum recovery amount;
- currency;
- expiry;
- provider rules;
- cancellation permission;
- idempotency/intent nonce;
- allowance existence and sufficiency where relevant.

Required outcomes:

- allow;
- block with exact reason code;
- escalate to human.

### Mandatory negative tests

- wrong agent;
- wrong serial;
- expired mandate;
- below minimum recovery;
- action not delegated;
- provider rule rejects;
- revoked allowance;
- duplicate/replayed intent.

## Mission H3 — USDC-first customer recovery

### User promise

> When my booking is recovered, show me the amount in dollars and settle it in Hedera USDC — not an HBAR number I have to mentally convert.

Use official Circle Hedera USDC:

- testnet `0.0.429274`;
- mainnet `0.0.456858` (reference only; no unattended mainnet action).

The old x402 USDC proof is not enough. ETHOnline work should make USDC a visible part of the actual recovery product journey.

### Preferred overdelivery: atomic delegated settlement

Spike a single Hedera `TransferTransaction` that combines:

1. approved NFT transfer: booking owner -> buyer;
2. approved USDC transfer: buyer -> booking owner.

Both movements should be allowance-backed and policy-checked. If testnet proves this cleanly, make it the hero settlement path because the asset and payment move in the same Hedera transaction.

Do not claim atomicity unless the single transaction is actually executed and independently verified.

### Fallback

If the atomic path is blocked, ship a staged USDC settlement with explicit state transitions and failure handling. It must still be a real user-facing flow, not a reviewer artifact.

### Done when

- [ ] official USDC token ID verified;
- [ ] amount/decimals handled correctly;
- [ ] insufficient allowance is blocked;
- [ ] successful testnet USDC settlement shown in customer receipt;
- [ ] if atomic path: NFT and USDC movement are in the same verified transaction;
- [ ] if staged path: partial-failure state is explicit and tested.

## Mission H4 — Agent becomes a real bounded actor

New agent capabilities should form one loop:

- inspect held booking;
- inspect live/provider rules;
- evaluate mandate;
- optionally call/pay the existing x402 policy service;
- select a compliant recovery action;
- execute when permitted;
- escalate when not;
- explain reason codes;
- record result.

No generic chat demo.

### x402 overdelivery

The old endpoint is baseline. The new work can be the **consumer** side:

> delegated agent discovers/calls the paid recovery-policy service and completes a real paid request before execution.

This is especially valuable if Hedera confirms Continuity eligibility for the general AI & Agentic Payments prize.

## Mission H5 — HCS delegation lifecycle

Record privacy-safe state transitions such as:

- `DELEGATION_CREATED`
- `DELEGATION_REVOKED`
- `AGENT_ACTION_ALLOWED`
- `AGENT_ACTION_BLOCKED`
- `AGENT_ESCALATION_REQUESTED`
- `RECOVERY_SETTLED`

Do not put personal identity, raw World identifiers, private policy values unnecessarily, or secrets on HCS. Prefer hashes/IDs and minimal public metadata.

## Mission H6 — Hedera Harness / independent chain proof

Adopt Hedera Harness if it can be integrated without destabilizing the repo.

Validation ladder:

- deterministic build/static assertions;
- Playwright hero journey;
- adversarial semantic assertions;
- Tier 3.5 testnet validation for allowance, revoke and settlement claims.

The harness/evaluator decides pass/fail, not the builder.

## Hedera reviewer attack questions

The independent reviewer must answer:

1. What exactly is new since `d0b5f875...`?
2. Where is Hedera doing more than it did in June?
3. Is the agent's authority native/scoped or just another backend boolean?
4. Can the owner revoke it?
5. Can the agent act on a different booking?
6. Does USDC actually move in the customer journey?
7. If atomic settlement is claimed, is it literally one testnet transaction?
8. Can the same intent execute twice?
9. What happens when provider policy and user mandate disagree?
10. Is any sensitive identity/private data leaked through HCS?

Any uncertain answer is a failure until evidence exists.
