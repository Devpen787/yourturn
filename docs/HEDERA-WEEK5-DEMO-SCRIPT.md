# Week 5 Demo Script (No-Terminal, 90–120 Seconds)

## Use this exact walkthrough for recording

Purpose: prove the policy layer is active, approval is human-scoped, and Hedera proof is visible, without terminal commands.

## Preflight (open before record)

Tabs to have ready:

- `https://yourturn-sage.vercel.app`
- `https://yourturn-sage.vercel.app/week5-proof`
- `https://yourturn-sage.vercel.app/api/agent/week5-proof`
- `https://yourturn-sage.vercel.app/api/wallet-budget/config`
- `https://yourturn-sage.vercel.app/api/x402/recovery-policy`
- `https://yourturn-sage.vercel.app/resale/193?mode=recovery`

Use these spoken lines in order. Keep each step one clear sentence.

## 0:00–0:12 — state the problem

1. Open the app and go to **`/login`**.
2. Click **Demo user A**.

Say:

> “When a customer can’t attend a booked service, this app shows a practical policy-driven recovery flow instead of a manual workaround.”

## 0:12–0:30 — open a live policy receipt

3. Go to **`/my-bookings`**.
4. Click **Recover booking** on a booking you can use (historical proof booking **#193** is already available).
5. Confirm the route is **`/resale/193?mode=recovery`**.

Say:

> “I’m using a real recovery receipt to show the interface + policy envelope end-to-end.”

## 0:30–0:50 — show Concierge policy gates

6. In the **Concierge recovery** card, read/point to the two lines: current holder, and why this action is allowed.
7. If the action radio card is visible, click **Someone else can take my spot**.
8. Click **Check options**.

Say:

> “Recovery is never blind here. Concierge checks holder ownership, policy flags, duplicate listing rules, and budget permission before approval.”

## 0:50–1:08 — explicit approval

9. If preview is available, click **Approve resale**.
10. Confirm the confirmation toast / status message after approval.

Say:

> “No money moves without explicit approval. The flow is bounded by policy checks and wallet budget policy.”

## 1:08–1:32 — proof surface in-app

11. Scroll to the receipt fields and read:
   - action label
   - policy basis
   - approval id
   - schedule id
   - audit / HashScan link
12. Click one proof link (HashScan or scheduled proof) and return to page.

Say:

> “This receipt is the execution evidence for the same checked action — holder, policy, approval, and proof are all tied together.”

## 1:32–1:50 — no-terminal verifier views

13. In another tab, open **`/week5-proof`**.
14. Open the **Runtime Policy Surface** and **What This Proves** cards.
15. Open **`/api/agent/week5-proof`** and call out the JSON status keys for:
   - HBAR x402 settlement
   - USDC x402 settlement
   - USDC allowance
16. Open **`/api/x402/recovery-policy`** and **`/api/wallet-budget/config`** briefly.

Say:

> “This is the Week 5 reviewer path: policy intent and runtime checks are machine-readable, no terminal needed.”

## 1:50–2:00 — final close

17. Show the page title and end line:

> “This is a policy-constrained recovery agent: holder check, provider rules, explicit approval, and auditable Hedera proof in one flow.”

## Branch if state is different

- If booking **#193** is read-only (recorded receipt mode), skip steps 7–10 and go directly to step 11.
- If action is blocked, read the block reason, switch to the same booking number next serial, and continue from step 7.

## One-minute backup version (if you need it shorter)

1. Demo user A login.
2. `/my-bookings` → **Recover booking**.
3. `/resale/<booking>?mode=recovery` and show policy checks.
4. If interactive: Check options → Approve resale.
5. Show receipt + proof links.
6. Open `/week5-proof` and `/api/agent/week5-proof`.

## Must-have shot list while recording

- `Concierge recovery` panel (policy checks visible)
- Receipt section with approval and policy fields
- One HashScan or schedule proof link
- `/week5-proof` runtime policy cards
- `/api/agent/week5-proof` JSON showing HBAR/USDC policy status

If posting to X, include hashtags: `#HederaAgent` and `#HederaAIBounty`, and mention both `@hedera` and `@hedera_devs`.
