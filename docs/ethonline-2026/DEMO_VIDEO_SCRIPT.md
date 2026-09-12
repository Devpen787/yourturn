# Demo Video Script — YourTurn ETHOnline 2026

Target length: **2:30–3:00**. Use the exact final selected SHA. Do not splice historical proof into a claim about the new integrated path without labeling it historical.

## 0:00–0:20 — Problem and product

**Visual:** README → `/product-preview`, Maya's booking.

**Narration:**

> Travel recovery is a perfect agent problem, but only if the agent gets exactly enough authority and no more. YourTurn lets Maya delegate one booking recovery without giving an agent her wallet or trusting a single identity signal to authorize value movement.

Show the approved Maya → Bob → Studio A product flow briefly.

## 0:20–0:50 — Ledger: human mandate

**Visual:** exact Recovery Mandate / human-readable typed-data statement and physical Ledger evidence from the final ceremony.

**Narration:**

> Ledger protects the human authorization. Maya signs a bounded Recovery Mandate for one booking serial, one resale action, a minimum seller-net recovery, Hedera USDC, an expiry and a nonce. The application still has to re-check current booking state and policy. The Ledger signature is not the Hedera settlement signature.

Show one frame of the reject proof and one of the approve/replay-safe proof.

## 0:50–1:15 — World: exact requester

**Visual:** canonical GET challenge showing operation ID, intent hash, statement and exact resource; then the successful credential-bearing POST / AgentBook evidence.

**Narration:**

> World answers a different question: is this exact requesting agent human-backed? AgentKit signs the exact resource, operation and intent, and AgentBook resolves the requester. YourTurn never treats that as booking ownership or settlement permission.

Briefly show tampered or replayed request rejection.

## 1:15–1:55 — Hedera: current facts and exact transaction

**Visual:** operation moves once to `effect-started`; retained transaction; D-010 gross / royalty / seller-net breakdown.

**Narration:**

> Before any effect starts, YourTurn re-reads provider policy, Bob's eligibility and payment authorization, the current booking allowance and Hedera chain state. Only one component may cross the begin-effect boundary. The exact transaction is retained before external signing. Bob funds the gross amount, and Maya's minimum applies to her seller net after any owner-approved royalty.

Show BEFORE_SIGN, external executor signing, and BEFORE_SUBMIT validation as separate steps. Do not imply the server signs.

## 1:55–2:20 — Fresh testnet evidence

**Visual:** final transaction ID, HashScan, Mirror/indexed receipt and completed operation.

**Narration:**

> After explicit human authorization, those exact validated bytes are submitted once to Hedera testnet. YourTurn does not auto-retry an unknown outcome. Completion comes from the indexed receipt: the exact booking serial moves Maya to Bob, Bob is the USDC source, Maya receives net proceeds, the royalty collector receives the committed fee, and no extra movement is accepted.

Use only the fresh transaction from the final integrated path here.

## 2:20–2:45 — Product outcome / retry coherence

**Visual:** R5 receipt/history across Maya/Bob/Studio A, desktop + mobile montage.

**Narration:**

> The security model is reflected in the product: first-payment failure does not create a false receipt, retry succeeds once, policy changes propagate consistently, and cancellation or refresh never creates a second truth.

## 2:45–3:00 — Continuity / close

**Visual:** simple before/after diagram or repository evidence manifest.

**Narration:**

> YourTurn existed before ETHOnline. The new work is the cross-sponsor authority plane: Ledger for the bounded human mandate, World for the exact human-backed requester, and Hedera for serial-scoped settlement and independently readable evidence. Three different trust questions, composed into one recovery path.

## Recording checklist

- [ ] Exact final SHA visible once.
- [ ] No private keys, secrets, seed phrases, auth tokens or unnecessary World identifiers visible.
- [ ] Ledger device claim only when final physical evidence exists.
- [ ] World LIVE/SIGNED-ROUTE claim only when final canonical credential-bearing request exists.
- [ ] Hedera LIVE/TESTNET claim uses only the fresh final integrated transaction.
- [ ] Maya economics say **seller net**, not gross, when royalty is non-zero.
- [ ] No claim that Ledger signs the Hedera transaction.
- [ ] No claim that World proves booking ownership.
- [ ] HashScan/Mirror URLs and transaction ID are readable in the final evidence segment.
- [ ] Video URL is inserted into `SUBMISSION_DRAFT.md` and the final evidence manifest only after upload.