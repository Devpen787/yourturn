# YourTurn

**You booked it. You can't make it. You shouldn't have to lose it — or hand a bot your wallet.**

Plans change. A yoga class, a studio session, a treatment slot — you paid for it, something came up, and now you have two bad options: eat the cost, or spend your evening hunting for someone to take it.

An AI agent could do that work for you. But "let an agent resell my booking" usually means giving software broad control of your account and your money, and hoping it behaves.

YourTurn is a booking product built around a third option. You hand over **one narrow instruction** — *recover this specific booking, never below 40 USDC* — and an agent can act only inside it. Not your wallet. Not your account. One booking, one action, one floor price, one deadline.

▶ **[Watch the 3-minute demo](https://youtu.be/weiLDw20zss)**

Built for ETHOnline 2026 · Hedera · World AgentKit · Ledger

> **Note on the hosted link:** the public deployment is currently behind Vercel deployment protection and is not open to the public, so it is not linked here as a judge entry point. Everything in this README runs locally from a clean clone in about five minutes — see [Try it](#try-it). The demo video shows the full journey.

## The problem

Booking platforms are good at selling you a slot and bad at what happens when you can't use it. Refund windows close. Resale is manual. Provider rules are invisible until they block you.

Delegating that to an agent is the obvious fix and the obvious risk. The moment an agent can move value on your behalf, three questions matter and most systems answer none of them well:

1. **What exactly did the human allow?** Usually: a blanket approval nobody reads.
2. **Who is actually asking to act?** Usually: whoever holds an API key.
3. **What actually happened?** Usually: a row in the company's own database.

YourTurn answers those three separately, with three different technologies, because they are three genuinely different problems.

## How YourTurn works

Maya holds a Friday Yoga booking she can no longer use.

1. Maya authorizes recovery with a **40 USDC minimum** — on her own terms, scoped to that one booking.
2. Studio A's own policy stays independent. Maya cannot authorize past the provider's rules.
3. Bob offers **32 USDC**. It's below Maya's floor, so it's **rejected** — and no payment is attempted.
4. Bob offers **45 USDC**. The system re-checks the mandate, provider policy, Bob's eligibility and payment, and current booking state before anything moves.
5. At the demo's 10% provider royalty, Maya nets **40.5 USDC** and Studio A receives **4.5 USDC**.
6. Bob becomes the holder. The booking shows up in his **My Bookings**, and he can **Use booking** and check in.
7. Studio A sees Bob as the current holder and fulfils the session normally.
8. Maya keeps her recovery receipt. Later fulfilment never rewrites the fact that the recovery succeeded.

That last point matters more than it sounds. A recovery that quietly un-happens when something downstream fails is not a recovery.

## Three trust layers, one bounded action

> **Ledger defines what the human allows.**
> **World proves who is asking to act.**
> **Hedera enforces and records what actually happened.**

| Layer | The question it answers | Why it matters |
| --- | --- | --- |
| **Ledger** | *What did Maya actually permit?* | Turns a vague approval into a specific, expiring, replay-protected capability |
| **World AgentKit** | *Is the requester the registered human-backed agent?* | Separates a real accountable agent from anything that can send an HTTP request |
| **Hedera** | *What is true about the booking and the money?* | Makes ownership and settlement independently checkable, not our word for it |

The counterfactuals are the honest test of whether these are load-bearing:

- **Without Ledger** there is no structured, hardware-backed expression of what the human actually authorized — only a server-side flag we set ourselves.
- **Without World** the application cannot meaningfully tell the intended registered human-backed agent apart from arbitrary automation claiming to be it.
- **Without Hedera** the booking right, the settlement and the receipt are private assertions in our own database rather than independently verifiable state.

Remove any one and the other two stop being sufficient.

## Why these technologies actually matter

### Ledger — the human intent layer

Most hardware wallet flows answer one question: *do you approve this transfer?* We wanted it to answer a more useful one: *what is this agent allowed to do later, on your behalf, when you're not watching?*

The Recovery Mandate is a structured authorization binding the owner, the exact agent, the booking, the permitted action, the minimum recovery, the settlement asset, an expiry, cancellation policy, and a nonce. It is checked on **every** request — a mandate that has expired, been replaced, or had its authority version rotated stops working immediately.

Device signing runs out-of-band in an isolated helper ([`scripts/ledger-device-proof/`](scripts/ledger-device-proof/), using `@ledgerhq/device-management-kit` and `@ledgerhq/device-signer-kit-ethereum`) so no server process ever holds or proxies Maya's key. **Ledger is not claimed to sign the Hedera settlement transaction** — it authorizes the mandate that makes a recovery permissible at all.

### World AgentKit — the requester identity layer

Ledger can establish *"Maya permits Agent X to recover booking Y under these terms."* That leaves a gap: at runtime, **is this actually Agent X?**

That is the question World answers, and only that one. [`lib/recovery/canonical-world-consumer.ts`](lib/recovery/canonical-world-consumer.ts) parses and verifies the AgentKit signature, binds it to the exact resource, statement, operation and intent, resolves the agent through AgentBook, and rejects replays through a nonce store.

Deliberately, World verification **is not** booking ownership, holder authority, or permission to settle. Those stay in the application's own authorization. That's what keeps World genuinely load-bearing without turning it into an all-powerful auth oracle — a verified agent asking for something it was never granted still gets refused.

### Hedera — the verifiable execution layer

YourTurn was Hedera-native before this event: tokenized booking rights on HTS, provider controls, HCS and Mirror proof surfaces, Schedule Service proof, and earlier payment work.

Hedera fits this product specifically because a booking right is naturally a **serial-scoped token**, settlement wants **stable value** rather than a volatile asset, and ownership and transfers are **independently readable through Mirror** — a judge, a provider, or a customer can check what happened without trusting us.

During ETHOnline that foundation was extended into the bounded-agent flow: current provider state and holder authority are re-read at request time, Bob's payment authorization is bound to the exact operation, minimums are enforced on **seller net** rather than gross, and the transaction is prepared once behind a single begin-effect boundary that retains the exact unsigned bytes.

## What changed during ETHOnline

**Before.** YourTurn already worked: tokenized booking rights, resale and recovery flows, provider rules, and Hedera infrastructure underneath. But recovery was something **you** did. Every write was executed by trusted backend code on server-managed accounts. There was no end-user delegation, no replay protection on agent confirmation, and no identity or hardware layer.

**The question this event asked.** What if the customer doesn't want to run the recovery themselves — but also shouldn't have to surrender control to an autonomous agent to avoid it?

**After.** A holder can delegate one narrow Recovery Mandate to a verified human-backed agent while keeping control of scope, price floor, booking and expiry. Making that safe is what required all three trust layers — which is why this is one architecture rather than three integrations.

## What we built

**Authorization** — Recovery Mandate with expiry, nonce and replay protection; current-authority projection re-resolved per request; guarded mandate-to-agent binding.

**Identity** — AgentKit signature verification bound to exact resource, statement, operation and intent; AgentBook resolution; nonce-backed replay rejection; an explicit trust boundary keeping identity separate from authority.

**Execution** — operation-scoped provider policy, payment records and buyer eligibility; exact Bob-funded payment authorization; seller-net minimum semantics; configurable royalty economics; a single begin-effect boundary; durable retained unsigned transaction output; external-signing validation; one-shot dispatch fencing; indexed receipt reconciliation.

**Product** — the full Maya → Bob → Studio A journey including provider-floor changes, expiry, first-payment failure with explicit retry, successful receipt, check-in, fulfilment, and cancellation propagation that preserves the prior receipt.

## Architecture

```text
Maya
  │  authorizes one bounded Recovery Mandate
  ▼
Ledger  ──────────────  what the human allows
  │
  ▼
YourTurn authority layer
  │  verifies the exact requester
  ▼
World AgentKit / AgentBook  ──  who is asking
  │
  ▼
current provider policy + buyer eligibility + payment + booking state
  │
  ▼
Hedera  ──────────────  what actually happened
        transaction prepared · exact bytes retained · receipt reconciled
```

The public confirmation route deliberately stops at durable retained **unsigned** transaction bytes. Signing and submission are external, human-authorized steps — not something the agent path does on its own.

## Demo economics

| | |
| --- | --- |
| Maya's minimum | **40 USDC net** |
| Rejected offer | **32 USDC** |
| Successful offer | **45 USDC gross** |
| Provider royalty (demo) | **10%** |
| Maya receives | **40.5 USDC** |
| Studio A receives | **4.5 USDC** |

The 10% royalty is **demo configuration, not a universal rate**. Minimums apply to Maya's **net** proceeds, not gross — a detail that decides whether a 45 USDC offer actually clears a 40 USDC floor.

## Try it

Everything below runs from a clean clone with **no credentials, no hardware and no network writes**.

```bash
npm ci --legacy-peer-deps

# the authorization, payment and settlement boundaries
node --experimental-transform-types scripts/single-begin-composition-check.mjs
node --experimental-transform-types scripts/hedera-external-signing-check.mjs
node --experimental-transform-types scripts/hedera-receipt-reader-check.mjs

npx tsc --noEmit --incremental false
npm run build
npm run dev
```

Then open **`/product-preview`** for the full Maya → Bob → Studio A journey.

To read the load-bearing path in source, start at [`app/api/agent/confirm/route.ts`](app/api/agent/confirm/route.ts) and follow [`lib/recovery/canonical-world-consumer.ts`](lib/recovery/canonical-world-consumer.ts).

## ETHOnline Continuity & sponsor proof

| Track | What existed before | What we added during ETHOnline | Why the technology is load-bearing | Evidence |
| --- | --- | --- | --- | --- |
| **Hedera Continuity** | HTS booking rights, HCS, Mirror, Schedule Service, earlier payment work | Current provider/holder/payment state re-read per request; seller-net minimums; single begin-effect boundary; retained unsigned bytes; external-signing validation; one-shot dispatch fence; receipt reconciliation | Booking rights are serial-scoped tokens; settlement is stable-value; ownership and transfers are independently readable via Mirror | [`lib/hedera-agent-kit/`](lib/hedera-agent-kit/) · [`lib/recovery/single-begin-composition.ts`](lib/recovery/single-begin-composition.ts) · [feedback](docs/ethonline-2026/HEDERA_FEEDBACK.md) |
| **World AgentKit Continuity** | No agent identity layer at all | AgentKit signature verification bound to exact resource/statement/operation/intent; AgentBook resolution; nonce replay rejection; explicit identity-vs-authority boundary | Without it the app cannot distinguish the registered human-backed agent from arbitrary automation | [`lib/recovery/canonical-world-consumer.ts`](lib/recovery/canonical-world-consumer.ts) · [`lib/world-agentkit/`](lib/world-agentkit/) · [feedback](WORLD_AGENTKIT_FEEDBACK.md) |
| **Ledger Continuity** | No hardware-backed authorization | Structured Recovery Mandate binding owner/agent/booking/action/minimum/asset/expiry/nonce; current-authority projection; replay and expiry enforcement | Turns a blanket approval into a narrow, expiring, verifiable capability the server cannot widen | [`lib/ledger/`](lib/ledger/) · [`scripts/ledger-device-proof/`](scripts/ledger-device-proof/) · [feedback](LEDGER_DX_FEEDBACK.md) |

More detail: [Reviewer guide](docs/ethonline-2026/REVIEWER_GUIDE.md) · [Before/after](docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md) · [Claims](docs/ethonline-2026/CLAIMS.md)

## Verification

| | |
| --- | --- |
| Pre-event baseline | `d0b5f875afb4f2b29af29bc5972cf1edc404d473` |
| Application code under review | `60a51fe09e735409a1c0b35593bc4413a49016e1` |
| Continuous integration | [run 34727782318](https://github.com/Devpen787/yourturn/actions/runs/34727782318) |
| Machine-readable evidence | [`FINAL_EVIDENCE.json`](docs/ethonline-2026/FINAL_EVIDENCE.json) |

The ETHOnline delta against the baseline is 231 files and roughly 29,500 net-new lines.

The historical Hedera testnet transaction `0.0.8504405@1789139309.785362819` is independently checkable without any credentials:

```bash
curl -s https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.8504405-1789139309-785362819
```

It returns `SUCCESS`, NFT `0.0.8505698` serial `213`, and a 45.000000 USDC transfer in the same transaction.

## Evidence & honest boundaries

We would rather be precise than impressive. What each piece of evidence does and does not show:

- **The `/product-preview` journey is a product fixture.** It is deterministic demo evidence of the full Maya → Bob → Studio A flow, not live settlement.
- **The historical Hedera transaction is real and atomic** — one booking NFT and 45 USDC moved together. It is a **flat 45 USDC** movement, so it does **not** demonstrate the 40.5 / 4.5 royalty split, which is demo economics. That single transaction is atomic; **the cross-system workflow as a whole is not**.
- **AgentBook resolution is live.** The World ID Sandbox round trip is real but **non-production**. We do not claim a final credential-bearing signed recovery route beyond what the evidence shows.
- **Physical Ledger evidence covers the rejection path** — the device refusing an unapproved mandate. That is not an approval, and we don't present it as one.
- **The application layer is verified at source, CI and local scope.** The public confirmation route stops at retained unsigned bytes; validation, fencing and reconciliation exist as lifecycle primitives rather than an automatic signing path.
- **There is no single live Ledger → World → Hedera execution**, and we don't claim one. These are independent proofs at their own evidence levels.

## Built with

Next.js 14 · TypeScript · Hedera (`@hashgraph/sdk`, `@hashgraph/hedera-agent-kit`, HTS/HCS/Mirror) · World (`@worldcoin/agentkit`, AgentBook, World ID Sandbox) · Ledger (`@ledgerhq/device-management-kit`, `@ledgerhq/device-signer-kit-ethereum`) · Redis · Playwright

## License

[MIT](LICENSE)
