# Demo

For the short Week 5 recording script, see `docs/HEDERA-WEEK5-DEMO-SCRIPT.md`.

## Hero scenario

A customer booked a yoga, physio, or coaching slot and can no longer make it. They transfer or resell the slot under the issuer's rules, and the issuer still earns on the move.

## Core stage line

Booked Rights makes a booked service slot transferable without giving up issuer control.

## Must-ship demo order (spec)

1. Issuer sets up the business and live slots
2. Person A books a slot (`F1`)
3. Person A lists it for resale and Person B buys it (`F2`)
4. Issuer redeems it by marking it used (`F4`)

## Action model in the current app

- **Two-step with review dialog:** book, list for resale, buy resale, pause pass
- **Typed confirm:** start over, check in / mark used
- **One-step:** set up business, create demo sessions, save session plan, reopen pass, refresh views

Current demo limits:

- bookings move a real testnet pass in the browser demo
- Concierge recovery is live for resale-first recovery and release/refund recovery: it previews the policy-valid action, asks for approval, executes the Hedera action, and returns a receipt with an Agent Kit-guided trace
- resale recovery creates a listing and a Hedera Schedule Service recovery payment proof when the booked policy allows it
- release/refund recovery moves a real testnet HBAR refund to the holder, returns the NFT to treasury, closes the pass, and writes HCS audit proof
- optional WalletConnect/Reown approval on the Concierge page lets Person A connect a Hedera testnet wallet and sign a bounded HTS/USDC allowance budget before policy/x402 spending
- listing a pass is the seller approval step; there is no second approval after the buyer clicks purchase
- buying a listed pass transfers it immediately if the API accepts the action
- `/brand-lab/ethglobal` is a hidden static Wave 1 sandbox for premium target states only; it is not product proof and does not call live APIs
- Telegram webhook command handling is fixture-tested and mutation-gated, but live Telegram delivery requires bot credentials and an allowlisted chat; allowlisted Telegram can preview recovery and approve listing/refund actions through the same server recovery paths
- there is still no fiat/onramp in the shipped browser demo; wallet-funded USDC allowance is available through the optional WalletConnect panel when `NEXT_PUBLIC_REOWN_PROJECT_ID` is configured, and still requires the connected user wallet to sign

## Clean regression command

Use this before final rehearsal when you need a fresh proof pass:

```bash
npm run dev:clean
npm run ethglobal:e2e
npm run hedera:agent-check
npm run hedera:agent-lab-proof
npm run hedera:nft-studio-proof
```

Run the app in one terminal and the E2E command in another. The E2E command intentionally mutates demo testnet/Redis state. It logs in as issuer, Person A, and Person B; saves a 3-session plan; resets the demo; books a resale-eligible slot; books a no-resale slot; proves no-resale listing is blocked; executes a real testnet HBAR refund/release on the no-resale slot; creates a Concierge recovery listing on the resale-eligible slot; creates and inspects a Hedera Schedule Service recovery payment proof; has Person B buy the listing; marks the pass used; and verifies the non-holder, unheld, used, and Mirror deletion guardrails.

Final proof pack:

- `docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md`
- local screenshot evidence: `output/ethglobal-final-proof/screenshots/`
- public demo recording checklist: `docs/FINAL-DEMO-SCRIPT.md`
- final submission worksheet: `docs/SUBMISSION.md`

Latest final regression proof from 2026-06-14:

- `npm run ethglobal:e2e` passed with main serial `196`, refund serial `197`, open guardrail serial `198`
- schedule `0.0.9228519` executed on testnet
- scheduled execution tx `0.0.8504300-1781406966-580404829`
- refund/release tx `0.0.8504300@1781406949.343880789`
- listing receipt `6351521d-13e2-4973-9d33-08eb521fa1ca`
- refund receipt `fb0e38dd-9ed8-4d93-9bd8-82abbaa8f7aa`

Primary recorded Telegram proof for the demo story remains booking `193` for listing/schedule and booking `194` for refund/release.

The final public proof links for those refs are product-native app receipts, not internal proof labels:

- `https://yourturn-sage.vercel.app/resale/193?mode=recovery` shows **Resale recovery receipt for Booking #193**
- `https://yourturn-sage.vercel.app/resale/194?mode=recovery` shows **Release receipt for Booking #194**

These pages keep the recorded proof visible if the live demo state later moves on during rehearsal.

Telegram fixture check:

```bash
npm run telegram:fixture
```

This fixture exercises the webhook parser and confirms the fixture path cannot mutate state. A live Telegram demo additionally needs `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `TELEGRAM_ALLOWED_CHAT_IDS`; set `TELEGRAM_ALLOW_MUTATIONS=true` only after dry-run messages work from the allowlisted chat.

Supported Telegram Concierge messages:

- `show my bookings`
- `I can't make booking 123`
- `Sell booking 123`
- `Refund booking 123`
- `recover booking 123`
- `approve listing 123`
- `approve refund 123`
- shortcuts: `/bookings`, `/recover 123`, `/list 123`, `/refund 123`

Users find the booking number in **My bookings**; each pass now shows it as **Booking #123**. The Telegram adapter accepts plain-English recovery messages and maps them to the same bounded Agent Kit-backed actions. `recover booking 123` previews the resale ask, provider share, amount Person A recovers, and in-app Concierge link. `Sell booking 123` / `approve listing 123` use the same bounded recovery listing path as the app: it mints a scoped server-side approval, creates the listing, creates a Hedera Schedule Service proof, stores a Hedera Agent Kit proof receipt, and replies with the listing and proof links. `Refund booking 123` / `approve refund 123` remain the separate release/refund path and send a real testnet HBAR refund only when mutations are enabled.

Agent proof checker:

```bash
npm run hedera:agent-check
```

This verifies the `yourturn-concierge` manifest, policy gates, approval requirements, and blocked-state scenarios used by the Hedera Agent Kit proof receipts.

The same check also verifies the Agent Kit runtime adapter, HCS-14 identity, A2A/capabilities descriptors, and demo budget overflow block.

Hedera Week 5 reviewer proof:

- Hidden page: `/week5-proof`
- JSON proof: `/api/agent/week5-proof`

These are verifier surfaces, not product navigation. They show the official Agent Kit policies, bounded USDC allowance proof, HBAR/USDC x402 settlement tx ids, and the policy controls without requiring a terminal during demo review.

Week 5 companion proof artifacts:

- Agent Lab packet: `docs/agent-lab/YOURTURN-CONCIERGE-AGENT-LAB.md`
- Agent Lab verifier: `npm run hedera:agent-lab-proof`
- NFT Studio metadata/risk proof API: `/api/nft-studio/proof`
- NFT Studio local packet: `npm run hedera:nft-studio-proof`

## Economic framing for the live demo

The audience should be able to understand the incentives quickly:

- the issuer earns on the primary booking
- the issuer can also earn on secondary movement
- the current holder can resell at a premium, at cost, or at a loss
- the buyer becomes the new current holder
- the issuer must mark the pass **used** at redemption to close the lifecycle

For the current MVP, the resale royalty is a fixed **10%**.

See `docs/ECONOMICS.md` for examples and the intended product policy model.

## Shipped UI walkthrough (happy path)

This section matches the **current** Next.js app. Use it for dry runs and judges. For **component and API mapping**, see `docs/UI-MAP.md`.

**Prerequisites:** env + Redis configured per `README.md`; use **three browser sessions or computers** when possible:

- sign in as **demo issuer**
- sign in as **demo user A**
- sign in as **demo user B**

The Hedera demo actors underneath are still `guestA` / `guestB` / `issuer`, but the app now uses a signed-in app session first and locks customer pages to **Person A** or **Person B** when you use the one-click demo accounts.

### A. Issuer — prepare chain state

1. Open **`/login`** and use **Demo issuer**.
2. Land on **`/issuer`** (Provider dashboard).
3. Optional but now real: set the **Business name** and shape the 3 planned sessions (title, time, location, price, resale policy), then save the plan.
4. **Set up business** — `POST /api/init` (token + topic ids).
5. **Create demo sessions** — `POST /api/mint-slots`; seeds slots and NFTs from the saved session plan (after **Save session plan** → `POST /api/session-plan`).
6. Confirm the **Live sessions** table shows rows with status **AVAILABLE** where expected.

### B. Person A — primary book (`F1`)

7. Open **`/login`** in a second browser and use **Demo user A**.
8. Land on **`/slots`**.
9. Use the premium browse cards and local search/filter if helpful, then click **Book** on an **AVAILABLE** card, review the booking dialog, then confirm — `POST /api/book`.
10. Confirm success message (includes tx id when returned).
11. Open **`/slots/[serial]`** or **`/my-bookings`** and confirm the pass tile now belongs to Person A.
12. Return to **`/issuer`** and confirm the issuer can also see Person A as the current holder.

### C. Person A — resale (`F2`)

13. From **`/my-bookings`**, choose **Recover booking** on the held pass, which opens **`/resale/[serial]?mode=recovery`**.
14. User A is already the locked customer for this browser. Choose the plain-English outcome, then use **Check options** to call `POST /api/recovery/preview`.
15. Review the Concierge recommendation, then choose **Approve resale** to call `POST /api/recovery/confirm`.
16. Show the verified recovery receipt: approval id, audit tx, policy snapshot, schedule id, scheduled payment status, Hedera Agent Kit proof, and HashScan links.
16a. Optional Week 5 proof: in the **Wallet-funded policy budget** panel, connect a Hedera testnet wallet and approve the bounded USDC budget. This is not required for the recovery listing path, but it proves the product path for wallet-funded policy budgets.
17. If the schedule is still pending, wait for the scheduled execution window and use **Inspect schedule proof**; the receipt should update from `scheduled` to `executed` using Mirror proof.
18. Refresh **`/resale/[serial]`** if useful and show that the proof state remains visible.
19. Explain the economics honestly: the current MVP proves a fixed **10%** HTS royalty on resale, and the holder may list above cost, at cost, or below cost.

### C2. Person A — release/refund (`F7`, optional strong Hedera proof)

Use a separate held pass from the resale path.

1. From **`/my-bookings`**, choose **Recover booking** on a held pass whose provider policy allows release.
2. On **`/resale/[serial]?mode=recovery`**, choose **Release + refund** when available.
3. Use **Check options** to confirm the refund amount and policy basis.
4. Choose **Approve release**. The server executes a real testnet HBAR refund transfer from treasury to Person A, returns the NFT to treasury, burns/closes it, and writes the HCS `CANCEL_RELEASED` event.
5. Show the receipt fields: refund amount, release/refund tx, close tx, audit tx, approval id, Hedera Agent Kit proof, and HashScan links.
6. Refresh **`/slots/[serial]`** and **`/issuer`** to show the pass is closed and the recovery proof remains visible.

### D. Person B — buy the resale (`F2`)

20. Open **`/login`** in a third browser and use **Demo user B**.
21. Open **`/resale/[serial]`** for the listed pass.
22. Show that Person B can see the resale offer and current ask.
23. Buy the listed pass — review the purchase dialog, then `POST /api/resale-buy`.
24. Refresh **`/slots/[serial]`** and **`/my-bookings`** to confirm Person B is now the current holder and Person A is not.
25. On **`/slots/[serial]`**, show the verified lifecycle timeline: booked, listed, resold.
26. Return to **`/issuer`** and confirm the issuer also sees the holder change. If the Concierge recovery flow created a scheduled recovery payment, the live session row also shows the Schedule Service proof status and HashScan links.

### E. Issuer — close lifecycle (`F4`)

27. Return to **`/issuer`**. Confirm table shows Person B as the current holder for the serial.
28. Use **Check in / mark used** for that ref, type the ref number in the confirm dialog, and submit — `POST /api/mark-used`.
29. Refresh the affected guest page if you are still looking at the same pass, then show **USED** state on **`/slots/[serial]`** or the guest hub.
30. Make it explicit that the issuer is the one who closes the lifecycle, so the pass cannot be used again.
31. If needed, show the anti-double-use proof: a second `mark-used` or `book` attempt for the same serial now fails with `CONFLICT`.

### F. Optional — pause / reopen (`F3`)

- On **`/issuer`**, use the **Pause or reopen a pass** section: set **Ref #** and **Person** to match the **current holder** (table **Use this pass** pre-fills). **Pause pass** uses a confirm dialog; **Reopen pass** is one step — `POST /api/freeze` or `POST /api/unfreeze`.
- On **`/slots/[serial]`** or **`/my-bookings`**, explain that movement is blocked until the provider **Reopen**s the pass.
- On **`/my-bookings`**, **Recover booking** is the live Wave 2 Concierge entry for resale-eligible held passes.

**Note:** The UI says **Pause pass** / **Reopen pass**; APIs remain `/api/freeze` and `/api/unfreeze`.

## Strong optional add-ons

- Freeze / unfreeze (`F3`) — wired as above
- Cancel / release / refund (`F7`) — available in the in-app Concierge recovery flow and through the agent API as `cancel_release`. The latest E2E proves real testnet HBAR refund/release plus HCS audit proof; scheduled token release/expiry remains future work.

## Demo rules

- Keep the happy path under 60 seconds
- Use plain language, not blockchain jargon
- Show at least one real Hedera testnet proof point (log tx ids in `docs/TX-LOG.md`)
- Make the three-party story obvious: issuer, Person A, Person B
- When using the new app auth, keep one browser per demo account for the cleanest story
- Treat **Mark used** as the live redemption step, not just cleanup
- Show that Person A is no longer the valid holder after resale
- If another browser is already sitting on the same page when a different user changes the pass, refresh that page before narrating the new state
- If showing `F7`, use a separate booking from the one you plan to resell and mark used
- Only show `HCS` if it helps the audience understand the story faster (topic messages appear on slot detail)

## Related docs

- `docs/HEDERA-WEEK5-DEMO-SCRIPT.md` — short Week 5 recording script
- `docs/HEDERA-WEEK5-FINAL-STEPS.md` — final bounty submission checklist
- `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md` — Week 5 claim and proof packet
- `docs/UI-MAP.md` — routes, components, APIs, flow diagram
- `docs/SPEC.md` — acceptance criteria for the booking-right product surface
