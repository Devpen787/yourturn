# Stakeholder expectations vs shipped app

Use this when **sitting in each person’s seat**: what they reasonably expect, what the app delivers today, and what is **not** available. Pair with **`docs/UI-MAP.md`** (wiring) and **`docs/DEMO.md`** (happy path).

**Demo reality:** identities are **`guestA`**, **`guestB`**, and **`issuer`** chosen in the UI (`ActorSelector` + `localStorage`), not real wallet login. Chain truth is **Mirror + HTS**.

---

## 1. Prospective customer (browsing before booking)

**Who:** Someone deciding whether to book a class or session.

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| See what sessions exist | **Yes** | `/slots` — list with title, time window, price, status badge |
| Know if a spot is still bookable | **Yes** | Status **AVAILABLE** vs held/frozen/used |
| Understand what happens after booking | **Partial** | Marketing `/` and copy on `/slots`; no personalised “your receipt” until they book |
| Trust / proof without jargon | **Partial** | Slot detail `/slots/[serial]` has HashScan links and optional HCS snippet — strong for technical reviewers, heavy for a casual browser |
| Book without installing a wallet (this demo) | **Yes** | Demo keys on server; actor picker only |

**Not available**

- Real **sign-in** or “my email” account.
- **Calendar sync** or reminders.
- **Reviews** or provider profile pages beyond slot rows.

---

## 2. Customer booking for the first time (primary booker)

**Who:** Guest who wants to secure a slot (**F1**).

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| Pick who they are in the demo | **Yes** | `ActorSelector` → guestA or guestB |
| Complete a booking in-app | **Yes** | `/slots` → Book on AVAILABLE row → `POST /api/book` |
| See confirmation / tx id | **Yes** | Success message on `/slots` (tx id when API returns it) |
| See the booking as “mine” afterward | **Yes** | `/my-bookings` filters rows where Mirror holder matches selected guest; `/slots/[serial]` shows holder + status **HELD** |
| Clear next steps (attend, resell, etc.) | **Partial** | Copy on slot detail and hub; still flagged for polish in **`docs/TASKS.md`** |

**Not available**

- **Payment UX** beyond demo HBAR path (no card, no invoice PDF).
- **F7** cancel / refund after booking.
- **Rebook** to another slot (deferred).

---

## 3. Current holder (plans changed — move or wait)

**Who:** Person who already holds the booking right.

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| See everything they hold | **Yes** | `/my-bookings` for selected guest; active HELD/FROZEN rows |
| Understand status (held, frozen, used) | **Partial** | Labels + short copy; TASKS still mention tightening language |
| Resell if policy allows | **Yes** | Link to `/resale/[serial]` when `canResell`; list + buy on resale page (**F2**) |
| See fee / royalty impact before selling | **Yes** | `/resale/[serial]` — 10% royalty copy + preview from `lib/domain/fees.ts` |
| Know when movement is blocked | **Yes** | **FROZEN** copy on hub and detail; issuer must unfreeze |
| **Transfer or gift** without a listing (peer move) | **No** | Spec mentions transfer; **shipped path is resale** (list + buy). No separate “send to friend” flow. |
| Cancel and get refund | **No** | **F7** not built. |

---

## 4. Secondary buyer (buying someone else’s listing)

**Who:** Other guest (e.g. guestB) buying guestA’s listing.

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| Find the listing | **Partial** | Must use **link or serial** (`/resale/[serial]`); no global “marketplace” of all listings |
| See price and royalty story | **Yes** | Resale page headline + preview |
| Complete purchase in-app | **Yes** | `POST /api/resale-buy` from `/resale/[serial]` |
| See outcome / tx | **Yes** | Success message includes tx id when returned |
| Trust they are the new holder | **Partial** | Refresh + `/my-bookings` / slot detail; no push notification |

**Not available**

- **Discovery** UI (browse all active listings).
- **Escrow** narrative beyond what the HTS transfer + custom fee does in code.

---

## 5. Issuer / provider (rules + operations)

**Who:** Studio or coach operating slots (**issuer** actor + console).

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| Stand up demo token + slots | **Yes** | `/issuer` — Initialize, Mint Demo Slots |
| See all slots and high-level state | **Yes** | Table: serial, title, status, holder label, listing flag |
| Match actions to real holder (avoid mistakes) | **Partial** | Table + “Select serial” pre-fills freeze holder when mapped to guestA/guestB; Mirror account id still matters for API |
| Freeze / unfreeze holder | **Yes** | **F3** — API enforces `holderActor` vs Mirror |
| Mark session used / close lifecycle | **Yes** | **F4** — mark used |
| Reset demo for another run | **Yes** | Reset Demo button |
| Edit per-slot **policy** (resale on/off, royalty %) in UI | **No** | Policy comes from seeded data / env-backed demo; not a full policy editor |
| Cancel / refund customer (**F7**) | **No** | Not built |
| Analytics / revenue dashboard | **No** | Out of hack scope |

---

## 6. Hackathon judge / technical reviewer

**Who:** Wants track fit, honesty, and proof.

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| HTS + Mirror story | **Yes** | Implementation in `lib/hedera/*`, slot detail proof links |
| No Solidity requirement | **Yes** | App matches “No Solidity Allowed” positioning |
| Observable lifecycle | **Yes** | UI statuses + optional HCS messages on detail page |
| **Recorded testnet tx ids** | **No (until filled)** | **`docs/TX-LOG.md`** still placeholders — must run flows and paste proof |
| Clear demo script | **Yes** | **`docs/DEMO.md`** + **`docs/UI-MAP.md`** |

---

## 7. Operator / developer (deploy, env, debug)

**Who:** Runs the app locally or on Vercel, configures secrets.

| Expectation | Met? | Where / how |
|-------------|------|-------------|
| Documented env and run steps | **Yes** | `README.md` |
| Initialise chain resources | **Yes** | `/issuer` or `POST /api/init` |
| Debug Mirror reads | **Partial** | `GET /api/mirror` exists; **not linked from UI** |
| Force token association | **Partial** | `POST /api/associate` exists; **not linked from UI** (book path can associate inline) |
| Safe public exposure of init/mint/reset | **No** | Routes are **not** behind product auth — gate or restrict if deployed publicly |

---

## 8. Agent-assisted user (product direction, not shipped)

**Who:** Future user helped by an agent for scheduling / previews (**`docs/SPEC.md`**).

| Expectation | Met? |
|-------------|------|
| Agent suggests slots, compares options | **No** — deferred (`docs/TASKS.md`) |
| Agent signs or moves value alone | **No** — correctly out of scope by design |

---

## Summary matrix

| Persona | Core job-to-be-done | Met well | Gaps to name honestly |
|---------|---------------------|----------|------------------------|
| Browser | Choose a session | List + status | Light trust story for non-technical users |
| Primary booker | Get a confirmed right | F1 path + hub | Refund/rebook, polish copy |
| Holder | Resell or understand blockers | Resale + frozen copy | **Gift/transfer** path, **F7** |
| Secondary buyer | Buy listing | Buy flow | Listing **discovery** |
| Issuer | Operate lifecycle | Init, mint, F3, F4, reset | Policy UI, **F7**, analytics |
| Judge | Verify claims | Architecture + UI | **TX-LOG** proof lines |
| Operator | Run and debug | README + APIs | Protect operator APIs in prod |

---

## Maintenance

When you add a **new screen or flow**, update this file if it changes what a persona can or cannot do — same discipline as **`docs/UI-MAP.md`** (see **`AGENTS.md`**).
