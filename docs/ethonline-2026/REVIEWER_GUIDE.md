# Reviewer guide

A five-minute path through YourTurn for someone who has never seen it.

## What is YourTurn?

A booking product for the moment plans change. You paid for a class or session, you can't make it, and you'd rather not lose the money or spend the evening finding a replacement. YourTurn lets you delegate that recovery to an agent — but only inside one narrow instruction you set: this booking, this action, this minimum price, this deadline.

## 1. Watch first

The [three-minute demo](https://youtu.be/weiLDw20zss) shows the whole journey end to end. Start there.

## 2. Then run it

No credentials, no hardware, no network writes:

```bash
npm ci --legacy-peer-deps
npx tsc --noEmit --incremental false
npm run build
npm run dev
```

Open `/product-preview`.

To check the authorization and settlement boundaries directly:

```bash
node --experimental-transform-types scripts/single-begin-composition-check.mjs
node --experimental-transform-types scripts/hedera-external-signing-check.mjs
node --experimental-transform-types scripts/hedera-receipt-reader-check.mjs
```

## 3. The story you'll see

Maya holds a Friday Yoga booking she can't use. She authorizes recovery with a **40 USDC minimum**. Studio A's provider policy stays independent of her wishes. Bob offers **32 USDC** — below the floor, so it's rejected and no payment is attempted. Bob offers **45 USDC**; the system re-checks the mandate, provider policy, Bob's eligibility and payment, and current booking state. At the demo's 10% royalty Maya nets **40.5** and Studio A receives **4.5**. Bob becomes holder, finds the booking under **My Bookings**, and checks in. Studio A sees Bob as holder and fulfils. Maya keeps her receipt — and later fulfilment never rewrites the fact that the recovery succeeded.

## 4. Why three technologies

**Ledger — what the human allows.** The Recovery Mandate binds owner, agent, booking, action, minimum, settlement asset, expiry and a nonce. It's re-checked on every request; expired or rotated authority stops working immediately. Device signing runs out-of-band in [`scripts/ledger-device-proof/`](../../scripts/ledger-device-proof/) so no server process holds the key. Ledger does not sign the Hedera settlement transaction.

**World AgentKit — who is asking.** Ledger establishes that Maya permits Agent X. At runtime the app still has to know whether the requester *is* Agent X. [`lib/recovery/canonical-world-consumer.ts`](../../lib/recovery/canonical-world-consumer.ts) verifies the AgentKit signature against the exact resource, statement, operation and intent, resolves the agent through AgentBook, and rejects replays. Identity is deliberately not ownership or permission to settle.

**Hedera — what actually happened.** Booking rights are serial-scoped tokens, settlement is stable-value, and ownership is independently readable through Mirror. See [`lib/hedera-agent-kit/`](../../lib/hedera-agent-kit/).

## 5. What changed during ETHOnline

The product already had tokenized booking rights, resale and recovery flows, provider rules and Hedera infrastructure — but recovery was something you did yourself, executed by trusted backend code on server-managed accounts. ETHOnline added the delegation layer: a bounded mandate, verified requester identity, and a settlement lifecycle that re-reads current state before anything moves. Full detail in [CONTINUITY_BEFORE_AFTER.md](CONTINUITY_BEFORE_AFTER.md).

## 6. Where to verify each claim

| Claim | Where |
| --- | --- |
| Bounded mandate and current authority | [`lib/ledger/`](../../lib/ledger/) |
| Requester verification | [`lib/recovery/canonical-world-consumer.ts`](../../lib/recovery/canonical-world-consumer.ts), [`lib/world-agentkit/`](../../lib/world-agentkit/) |
| Settlement preparation and receipts | [`lib/hedera-agent-kit/`](../../lib/hedera-agent-kit/) |
| One begin-effect boundary | [`lib/recovery/single-begin-composition.ts`](../../lib/recovery/single-begin-composition.ts) |
| Public route boundary | [`app/api/agent/confirm/route.ts`](../../app/api/agent/confirm/route.ts) |
| Machine-readable summary | [FINAL_EVIDENCE.json](FINAL_EVIDENCE.json) |

The historical Hedera transaction is checkable with no credentials:

```bash
curl -s https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.8504405-1789139309-785362819
```

## 7. Demo evidence vs external evidence

The `/product-preview` journey is a **deterministic product fixture** — real product behavior, not live settlement. AgentBook resolution is live. The World ID Sandbox round trip is real but non-production. Physical Ledger evidence covers the **rejection** path. The historical Hedera transaction is real and moved a booking NFT plus a flat 45 USDC together.

There is no single continuous live Ledger → World → Hedera run, and none is claimed. See [CLAIMS.md](CLAIMS.md).

## Provenance

Application code reviewed at `60a51fe09e735409a1c0b35593bc4413a49016e1`; pre-event baseline `d0b5f875afb4f2b29af29bc5972cf1edc404d473`.
