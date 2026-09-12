# YourTurn

### Safely delegate the recovery of a booking you can no longer use.

**YourTurn is a booking recovery marketplace for real-world services.**

If you book a yoga class, physio session, workshop, event, or another time-based service and later cannot attend, YourTurn helps recover value from that booking instead of forcing you to simply lose it. The booking can move to another eligible customer under rules set by the business that issued it.

For **ETHOnline 2026**, we extended the existing YourTurn product with **Delegated Recovery**:

> Let an agent recover one booking for you without giving the agent unrestricted access to your wallet, account, or other bookings.

## The 60-second example

Maya already owns **Friday Yoga** and cannot attend. She authorizes YourTurn to recover that booking under strict boundaries:

- Friday Yoga only;
- at least **40 USDC net** to Maya;
- authority expires at a defined time;
- do not cancel the booking;
- do not touch any other booking or account state.

YourTurn can now search for a valid outcome without asking Maya to approve every potential buyer.

![Maya defines the recovery boundary](docs/ethonline-2026/assets/readme/01-recovery-limits.png)

Bob first offers **32 USDC**. It is rejected because it cannot satisfy Maya's active minimum.

![32 USDC offer rejected](docs/ethonline-2026/assets/readme/02-offer-blocked.png)

Bob later offers **45 USDC**. Studio A's demo asset has a published **10% royalty**, so the expected split is:

| Result | Amount |
| --- | ---: |
| Bob pays | 45.00 USDC |
| Maya receives | 40.50 USDC |
| Studio A royalty | 4.50 USDC |

Maya's minimum is 40 USDC **net**, so 40.50 satisfies her mandate. The recovery may proceed.

The 10% rate is **not** a YourTurn system constant. Royalty is provider/business policy. Ten percent is simply the configured value used by this demo asset.

After the handoff, Bob sees the same Friday Yoga in **My bookings**, and Studio A sees Bob as the current holder.

![Bob now owns Friday Yoga](docs/ethonline-2026/assets/readme/04-bob-booking.png)

![Studio A sees Bob as current holder](docs/ethonline-2026/assets/readme/05-provider-holder.png)

The demo is therefore not `Maya screen -> blockchain transaction -> fake success page`. It is one booking lifecycle projected consistently to Maya, Bob, and Studio A.

---

## One booking, four kinds of authority

A recovery agent needs several different kinds of trust. We deliberately did **not** give one sponsor responsibility for all of them.

| Question | Authority |
| --- | --- |
| What did Maya actually authorize? | **Ledger Recovery Mandate** |
| Is this the human-backed agent Maya expects? | **World AgentKit + AgentBook** |
| What does Studio A currently allow? | **YourTurn provider policy** |
| Is Bob eligible and narrowly authorized to pay? | **YourTurn buyer/payment authorization** |
| Who owns the booking and where does the money go? | **Hedera** |

The core execution rule is:

```text
provider rules
∩ holder mandate
∩ buyer/payment eligibility
= recovery may execute
```

If any one of those fails, nothing moves.

---

## Provider rules are runtime truth

Studio A publishes the commercial rules that govern Friday Yoga.

![Studio A publishes Friday Yoga rules](docs/ethonline-2026/assets/readme/03-provider-rules.png)

An unpublished draft cannot affect customer behavior. A failed save cannot affect customer behavior. If Studio A changes a rule before execution, YourTurn re-checks the current policy and fails closed when required.

Provider authority remains separate from Maya's authority. Neither can silently widen the other.

---

# What we built during ETHOnline

YourTurn already existed before ETHOnline. We did **not** rebuild an old project and relabel it.

ETHOnline added a new delegated-authority architecture on top of the existing booking product.

| New ETHOnline work | Sponsor | What is new |
| --- | --- | --- |
| **Ledger Recovery Mandate** | **Ledger Continuity** | Hardware-approved authority scoped to one holder, booking, action, minimum, expiry, cancellation rule and agent |
| **Mandate replacement / rejection / replay model** | **Ledger Continuity** | Current authority survives rejected/cancelled replacements; mandate + nonce consumption are guarded against replay/concurrency |
| **Physical approval boundary** | **Ledger Continuity** | Device approve, device reject and host cancellation are separate outcomes |
| **Exact human-backed agent binding** | **World AgentKit Continuity** | AgentKit verification must match YourTurn's expected delegated requester, not merely produce a generic human-backed signal |
| **AgentBook integration** | **World AgentKit Continuity** | Registration/resolution becomes part of requester trust |
| **World Sandbox integration** | **World AgentKit Continuity** | Real non-production World verification and hardened local proof transport |
| **Durable World recovery operation** | **World AgentKit Continuity** | Requester verification participates in a retry-safe recovery operation rather than being a badge/UI signal |
| **Serial-scoped delegated booking authority** | **Hedera Continuity** | Delegated authority is constrained to the exact booking NFT serial rather than broad asset control |
| **Holder-controlled minimum** | **Ledger + Hedera** | The active minimum is Maya's signed mandate term; it is not a hidden application/Hedera floor |
| **Separated economic roles** | **Hedera Continuity** | Buyer funding, NFT receiver, delegated executor, seller recipient and network fee payer are distinct roles |
| **Bound payment authorization** | **Hedera Continuity** | Payment is bound to booking, quote, amount, funding account, receiver, recipient and recovery operation |
| **Provider-configured settlement economics** | **Hedera + Product** | Buyer gross, provider royalty and seller net reconcile against the same published policy |
| **Atomic settlement primitive** | **Hedera Continuity** | Booking ownership and USDC settlement can be expressed in one exact Hedera transfer transaction where qualified |
| **Provider configuration -> runtime truth** | **Product / integration** | Saved session/recovery settings drive customer/provider projections rather than only an editor |
| **One shared Maya/Bob/Studio A lifecycle** | **Product; all sponsors converge here** | Holder, payment, handoff, attendance, fulfilment, retry and history derive from one booking lifecycle |
| **Adversarial browser journey programme** | **Product quality** | Reload, Back/Forward, stale state, duplicate execution, retries, partial failures and corrupt state are tested |
| **Independent Product + Security gates** | **Cross-cutting** | Builders do not self-certify their own implementation |

---

# What already existed before ETHOnline

The immutable pre-event baseline is:

```text
d0b5f875afb4f2b29af29bc5972cf1edc404d473
```

The following were already part of YourTurn before this event and are **reused, not claimed as new**:

- Hedera booking-right NFTs;
- primary booking and transfer/resale flows;
- provider royalties;
- freeze/unfreeze and redemption lifecycle;
- HCS audit events;
- Mirror Node / HashScan proof;
- real account/session infrastructure;
- customer/provider product surfaces;
- recovery receipts;
- Hedera Agent Kit v4 and policy hooks;
- HBAR / USDC x402 proof paths;
- bounded USDC allowance work;
- WalletConnect / Reown experiments;
- Hedera Schedule Service proof;
- the earlier YourTurn Concierge recovery flow.

Full provenance: [`docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md`](docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md)

## Before -> after

**Before ETHOnline:** YourTurn could own, transfer and recover value from a tokenized service booking.

**After ETHOnline:** YourTurn can let a person safely delegate that recovery to an autonomous, human-backed agent under hardware-approved authority and current provider/payment constraints.

That is the Continuity delta.

---

# Architecture

```text
                     MAYA
                       │
                       │ approves exact recovery scope
                       ▼
             ┌──────────────────┐
             │      LEDGER      │
             │ Recovery Mandate │
             └────────┬─────────┘
                      │
        exact holder-authorized scope
                      │
             ┌────────▼─────────┐
             │     YOURTURN     │
             │ guarded recovery │
             └───┬─────────┬────┘
                 │         │
       requester │         │ current provider rules
       identity  │         │
          ┌──────▼───┐ ┌──▼──────────┐
          │   WORLD  │ │   STUDIO A   │
          │ AgentKit │ │ provider     │
          │AgentBook │ │ policy       │
          └──────┬───┘ └────┬────────┘
                 │           │
                 └─────┬─────┘
                       │
             buyer/payment eligibility
                       │
                       ▼
              ┌────────────────┐
              │     HEDERA     │
              │ booking + USDC │
              │   settlement   │
              └───────┬────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
           MAYA                BOB
        net proceeds       Friday Yoga
                               │
                               ▼
                         My bookings
                               │
                               ▼
                           Check-in
                               │
                               ▼
                           STUDIO A
                         fulfilment
```

No sponsor substitutes for another sponsor's responsibility.

---

# Hedera Continuity

Hedera is the booking-right ownership and economic settlement layer. The final recovery binds the exact token/serial, current holder, buyer, NFT receiver, delegated executor, funding source, seller recipient, royalty policy, amount and operation identity.

### New during ETHOnline

- serial-scoped delegated recovery authority;
- provider/holder/buyer policy intersection;
- Bob-funded settlement semantics;
- separated executor / buyer / recipient / fee-payer roles;
- bounded payment authorization;
- retry/idempotency protection;
- new settlement/reconciliation architecture.

**Final exact proof:** `[FINAL HEDERA EVIDENCE LINK]`

---

# World AgentKit Continuity

World answers a narrow question:

> Is this request coming from the expected human-backed agent?

World does **not** decide booking ownership, holder authority, price or payment eligibility. AgentKit verification is checked against YourTurn's independently resolved expected agent.

### New during ETHOnline

- official AgentKit verification boundary;
- exact-agent binding;
- AgentBook registration/resolution;
- real World Sandbox exercise;
- replay/stale/wrong-requester protections;
- durable recovery-operation integration;
- World AgentKit / Portal / Sandbox DX feedback.

**Final exact proof:** `[FINAL WORLD EVIDENCE LINK]`

Working feedback source: GitHub issue `#46`; final root file: `WORLD_AGENTKIT_FEEDBACK.md`.

---

# Ledger Continuity

The riskiest moment is when Maya tells autonomous software: **you may act later without asking me again**.

Ledger makes that delegation a hardware-backed human approval boundary. The Recovery Mandate binds the holder, enrolled signer, delegated agent, booking token/serial, action, minimum net recovery, settlement asset, expiry, cancellation rule and replay identity.

A signature alone is not sufficient. The runtime must also prove the exact mandate is current, unexpired, unreplayed and semantically applicable to the requested action.

### New during ETHOnline

- EIP-712 Recovery Mandate;
- device-backed authority creation;
- device reject / host cancel / approve separation;
- unique-current mandate lifecycle;
- replacement semantics;
- mandatory request binding;
- durable replay consumption;
- downstream enforcement boundary;
- Ledger DMK developer feedback.

**Final exact proof:** `[FINAL LEDGER DEVICE EVIDENCE LINK]`

Working feedback source: GitHub issue `#45`; final root file: `LEDGER_DX_FEEDBACK.md`.

---

# Evidence for humans and automated reviewers

Human reviewers should start with this README and [`docs/ethonline-2026/REVIEWER_GUIDE.md`](docs/ethonline-2026/REVIEWER_GUIDE.md).

Automated/LLM reviewers should start with:

```text
docs/ethonline-2026/evidence/manifest.json
```

Do **not** infer claim status from filenames, screenshots, issue titles or source presence alone. The manifest maps claims to source, evidence class, workflow/artifact, independent review and limitations.

Repository routing:

```text
/
├── README.md
├── AGENTS.md
├── llms.txt
├── LEDGER_DX_FEEDBACK.md              # final packaging target
├── WORLD_AGENTKIT_FEEDBACK.md         # final packaging target
└── docs/ethonline-2026/
    ├── REVIEWER_GUIDE.md
    ├── CONTINUITY_BEFORE_AFTER.md
    ├── CLAIMS.md
    └── evidence/
        └── manifest.json
```

## Evidence classes

| Class | Meaning |
| --- | --- |
| **LIVE** | Actual external network/provider execution |
| **DEVICE** | Observed physical Ledger interaction |
| **SANDBOX** | Real non-production World interaction |
| **CI / LOCAL** | Executable deterministic implementation/security proof |
| **FIXTURE** | Product UX state; does not itself prove sponsor execution |
| **HISTORICAL** | Pre-event/prior proof; never relabelled as new ETHOnline work |

A screenshot cannot promote FIXTURE to LIVE. A commit cannot promote CI to DEVICE. A historical transaction cannot prove a materially different new economic model.

---

# Security model

YourTurn fails closed when, among other cases:

- the wrong agent makes the request;
- a mandate is stale, expired, revoked or replayed;
- a replacement mandate was rejected/cancelled;
- booking/serial/resource identity changes;
- provider policy changes or is unavailable;
- buyer eligibility/payment authorization does not match;
- seller net proceeds fall below the holder minimum;
- quoted royalty differs from settlement;
- a duplicate/concurrent operation is attempted;
- partial execution is retried;
- a URL attempts to manufacture state.

A previous successful recovery never grants future authority.

Detailed claim language and prohibited overclaims: [`docs/ethonline-2026/CLAIMS.md`](docs/ethonline-2026/CLAIMS.md)

---

# Demo

The final judge path follows one Friday Yoga lifecycle:

```text
Maya already owns Friday Yoga
        ↓
Maya delegates bounded recovery
        ↓
World verifies expected human-backed agent
        ↓
32 USDC offer -> denied
        ↓
45 USDC offer -> permitted
        ↓
Bob funds settlement
        ↓
Maya receives net proceeds
Studio A receives configured royalty
        ↓
Bob receives Friday Yoga
        ↓
Bob uses / checks into booking
        ↓
Studio A sees Bob as current holder
        ↓
fulfilment + history reconcile
```

No success state is created by navigating directly to a URL. No destination is reseeded to manufacture continuity.

**Final demo:** `[FINAL DEMO URL]`  
**Final <=5-minute video:** `[FINAL VIDEO LINK]`

---

# Known limits / claims we do not make

This submission intentionally does **not** claim:

- Ledger signs Hedera settlement transactions;
- World determines booking ownership;
- unrestricted agent wallet custody;
- a universal 10% YourTurn royalty;
- whole-workflow blockchain atomicity;
- production fiat settlement;
- fully autonomous economic negotiation without human policy;
- every historical YourTurn capability as new ETHOnline work.

---

# ETHOnline 2026 tracks

- **Hedera — Continuity**
- **World — AgentKit Continuity**
- **Ledger — Continuity**

---

# Final verification

Immutable pre-event baseline:

```text
d0b5f875afb4f2b29af29bc5972cf1edc404d473
```

Final source candidate:

```text
[FINAL SHA]
```

Final evidence manifest:

```text
docs/ethonline-2026/evidence/manifest.json
```

Minimum repository verification:

```bash
npm ci
npm run build
```

Exact final qualification commands will be pinned in the reviewer guide and manifest against the final SHA.

---

## The core idea

YourTurn already knew how to recover a booking.

ETHOnline changed **who can safely do that work**.

Ledger protects the delegation. World verifies the requester. YourTurn enforces current commercial rules. Hedera makes ownership and settlement verifiable.

> **The goal is not to make the agent the user. The goal is to let the agent act for the user without becoming them.**
