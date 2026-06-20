# Architecture

## Track and proof stance

- **Primary track:** Hedera `No Solidity Allowed`
- **Minimum honest technical fit:** `HTS + Mirror Node`
- **`HCS` (merged MVP):** one topic emits JSON lifecycle events (`BOOKED`, `LISTED`, `RESOLD`, etc.) for demo traceability — still lead the story with HTS + Mirror for bounty alignment
- **Canonical proof:** real testnet transaction ids and Hashscan links in `docs/TX-LOG.md`

## Implemented stack (main branch)

Runnable app is **Next.js 14** (not Vite): server `POST /api/*` routes call `@hashgraph/sdk` with `runtime = "nodejs"`. **Upstash Redis** holds slot/listing records; **Mirror REST** is the read path. See `README.md` for reviewer setup and proof links.

Current implementation boundary: `lib/adapters/booking-port.ts` provides a server-side **`BookingPort`** with read methods plus preview/confirm write actions for `F1`, `F2`, `F3`, and `F4`. API routes now execute through that adapter so product flows and future agent work can share one contract. An agent-safe integration surface now exists under `app/api/agent/*`: reads, previews, confirms, and delegated approval grants.

For exact request and response shapes, use `docs/AGENT-INTEGRATION.md`.

## Product shape

1. Issuer publishes a scarce service slot
2. Guest books the slot and receives the booking right
3. Holder may transfer, gift, resell, or rebook only within issuer rules
4. Issuer can freeze, unfreeze, mark used, and optionally cancel or refund
5. Secondary resale routes a royalty or fee cut back to the issuer

## Current user-facing boundary

- **Route / component / API index:** `docs/UI-MAP.md` (keep updated when adding pages or client actions)
- Hero customer is SMB scheduled services and classes, not generic event ticketing
- Agent is a schedule-and-budget helper, not an autonomous wallet actor
- The app should explain booking rights in plain language first; Hedera infrastructure is the enforcement layer

## Agent helper capability

The agent layer may:

- check calendar conflicts before a booking or rebooking suggestion
- compare available slots against user preferences
- help book classes or sessions
- help rebook when a conflict appears
- help resell or transfer a slot when issuer policy permits it
- work within a user-defined booking budget
- help a user reach a target number of classes or sessions

The agent layer may not:

- sign autonomously
- bypass issuer policy
- move value without explicit user approval

## System modules (target layout after port extraction)

> **Today:** equivalent logic lives under `lib/domain/`, `lib/hedera/`, `lib/store/`, `app/api/`. The tree below is the intended end state.

- `src/domain/`
  - serializable types
  - booking lifecycle states
  - royalty, refund, and policy math
- `src/hedera/`
  - Hedera SDK client wiring
  - token and transfer transaction builders
  - freeze, use, and refund transaction paths
- `src/lib/mirror-client.ts`
  - Mirror reads for listings, holders, balances, and transaction visibility
- `src/adapters/booking-port.ts`
  - stable boundary between product flows, agent orchestration, and implementation
  - read methods plus preview/confirm action model for value-moving or issuer actions
- `src/features/guest/`
  - primary booking
  - resale or transfer
  - my booking status
  - cancel or refund if enabled
- `src/features/issuer/`
  - slot publishing
  - issuer rules
  - freeze or unfreeze
  - mark used

## Policy controls that matter

- resale allowed or blocked
- transfer or gifting allowed or blocked
- forwarding count limit
- rebook window
- expiry or lock deadline
- royalty or fee behaviour on secondary resale, including premium resale

## Engineering boundaries

- UI never imports Hedera SDK directly
- policy math stays pure and testable
- Mirror reads are read-only and can lag; signed transactions remain the source of truth for value movement
- secrets and operator keys stay out of the frontend bundle
- any agent flow must stop at preview until a human approves the transaction; `BookingPort` is the first server-side contract for that boundary
- delegated approval for agent confirms is represented by a scoped, signed approval grant minted by trusted backend code, not by raw demo-actor strings alone
- do not let a DB-backed booking app become the source of truth for booking ownership or transfer state

## Reference triage

Use this table when deciding what external product references or repos are allowed to influence the build.

| Reference type | Bucket | Strict guidance |
|---|---|---|
| Calendly / Cal.com patterns | Use now | Copy booking flow, slot picking, reschedule or cancel copy, and low-friction scheduling UX. Do not copy their backend architecture as the source of truth. |
| Eventbrite / Dice / ticket transfer patterns | Use now | Copy transfer, resale, lifecycle status, and holder-facing language patterns. Adapt them to service slots under issuer rules. |
| Apple Wallet / Google Wallet pass patterns | Use now | Copy the `my pass` or status-card feel for the holder experience and lifecycle visibility. Treat as UI inspiration only. |
| FullCalendar | Use now | Use only if a slot grid is needed quickly. Keep it presentational and behind the `BookingPort` boundary. |
| react-big-calendar | Use now | Same rule as FullCalendar: acceptable as a UI library for slot selection, not as product architecture. |
| Hedera code snippets / Hedera skills / Hedera SDK repos | Use now | These are the main technical building blocks for HTS, Mirror reads, and transaction construction in a `No Solidity` build. |
| ARKA Veterinary Booking repo | Investigate later | Inspect only for admin or operational UI ideas if needed. Do not treat it as a foundation. |
| eventseats repo | Investigate later | Maybe useful for seat or slot presentation ideas, but verify quality, licensing, and fit before borrowing anything. |
| wallet integration repos | Investigate later | Only investigate when the wallet path is concrete. Keep them out of scope until wallet integration is actually required. |
| generic booking SaaS templates | Avoid for now | Do not use as the base app. They tend to pull the architecture toward auth, DB workflows, and admin CRUD instead of on-chain booking-rights truth. |
| Wild Oasis style repos | Avoid for now | Avoid as a foundation. They create architectural confusion and encourage the wrong data model for this project. |
| any repo where Postgres, Supabase, or Prisma becomes booking truth | Avoid for now | Off-chain storage may exist later for convenience, but booking ownership, transfer state, and rights lifecycle must not be defined there. |
| any repo that adds auth or DB complexity before one real Hedera booking works | Avoid for now | Do not front-load platform complexity before `F1` is real on Hedera testnet. |

## Short conclusion

- Copy UI inspiration from Calendly, Cal.com, Eventbrite, Dice, and wallet pass patterns
- Use technical building blocks from Hedera snippets, Hedera skills, the Hedera SDK, and at most one lightweight calendar UI library
- Do not let an off-the-shelf booking SaaS repo, database-backed booking model, or generic admin template define the core architecture
