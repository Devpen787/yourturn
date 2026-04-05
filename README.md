# YourTurn

YourTurn helps small and medium-sized businesses recover value from cancellations and no-shows by turning a booking into a controlled, transferable pass.

Customers can safely relist a slot they can no longer use.  
Businesses keep control of the booking lifecycle, keep visibility over the current holder, and can earn on secondary resale.

Designed for issuer websites and existing booking operations, YourTurn adds controlled transferability without forcing businesses to replace their normal scheduling and check-in flow.

## Live project

- Production app: [yourturn-sage.vercel.app](https://yourturn-sage.vercel.app)
- Repository: [github.com/Devpen787/yourturn](https://github.com/Devpen787/yourturn)
- Demo video: uploaded in the ETHGlobal submission flow

## What It Solves

When a customer cannot make a booked session, most businesses fall back to:

- manual rescheduling
- lost revenue
- no-show waste
- informal handoffs the business cannot properly control

YourTurn keeps the slot alive instead of letting it die unused:

- the customer keeps flexibility
- the business keeps control
- the issuer keeps visibility over the valid holder
- the issuer can earn on secondary movement when policy allows it

## Hero Scenario

Think of a therapy, yoga, or coaching slot:

- Person A books a session
- Person A can no longer attend
- Person A lists the pass for resale under issuer rules
- Person B takes over
- the provider still controls final check-in and closure

This same engine also fits classes, coaching, and premium appointment-style experiences where secondary movement matters.

## Why Hedera / No Solidity

This project is built for the Hedera **No Solidity Allowed** track.

Hedera is useful here because it gives us:

- a transferable booking pass
- visible holder changes
- royalty economics on resale
- a verifiable lifecycle trail

Native services used:

- **HTS** for the transferable booking pass and royalty behavior
- **HCS** for lifecycle messages such as `BOOKED`, `LISTED`, `RESOLD`, `USED`
- **Mirror Node REST** for read-side status, holder, and lifecycle visibility

What it does **not** use:

- no Solidity
- no custom smart contracts

## Current MVP

The current MVP proves one real service-booking lifecycle:

1. A business publishes live bookable sessions
2. Person A books a session
3. Person A lists the pass for resale
4. Person B buys and becomes the new holder
5. The issuer checks the holder in and closes the pass

The product is designed for service businesses such as:

- therapy and physio sessions
- studios and classes
- coaching and appointment-led services
- premium experiences where resale value matters

## Product Rules

- the issuer keeps control of booking movement and final redemption
- the issuer can earn on secondary resale where policy allows it
- the customer can move the booking only within issuer rules
- the pass lifecycle ends only when the issuer checks it in and closes it
- no autonomous signing in the shipped MVP

## What we built during the hackathon

This repository is the hackathon build.

The product-specific work in this repo includes:

- the Next.js app and customer/provider flows
- Hedera booking, resale, freeze, and mark-used transaction paths
- shared booking truth via Mirror-backed reads
- provider dashboard and customer pass surfaces
- demo auth for issuer, Person A, and Person B
- submission-facing docs, proof logs, and demo runbooks

Reused pieces are limited to public libraries, framework tooling, and starter infrastructure such as:

- Next.js
- React
- Tailwind CSS
- `@hashgraph/sdk`
- `@upstash/redis`
- `zod`
- Vercel

## AI usage disclosure

AI tools were used as coding and documentation assistants during the hackathon, including for:

- implementation support
- refactoring assistance
- QA prompt generation
- documentation drafting
- browser-based verification support

All product direction, scope choices, verification decisions, and final shipped changes were reviewed and directed by the team. This repo also includes planning and documentation artifacts so the build process stays transparent.

## Demo flow

For the live demo and judging story:

- [docs/DEMO.md](docs/DEMO.md) — operator runbook
- [docs/DEMO-STORY.md](docs/DEMO-STORY.md) — spoken framing

Core story:

1. issuer prepares inventory
2. Person A books
3. Person A lists
4. Person B buys
5. issuer checks in and closes the lifecycle

## Architecture Truth

- HTS serial ownership and Hedera transactions are the entitlement truth
- Mirror Node is the read model for holder, status, and lifecycle visibility
- Redis stores convenience metadata such as slots and active listings; it is not the source of truth for booking ownership

## How To Run

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm run lint
```

Then open:

- `/login`
- `/issuer`
- `/slots`

## Environment Variables

Copy `.env.example` to `.env.local` and provide the required Hedera and Redis values.

The deployed app uses the same runtime shape on Vercel:

- Hedera operator / treasury / demo accounts
- Upstash Redis
- Mirror / HashScan public endpoints
- app auth session secret

Main required variables include:

- Hedera operator / treasury / fee collector ids and keys
- demo customer ids and keys for Person A and Person B
- Redis REST URL and token
- public Mirror / HashScan base URLs
- app session secret

## Tech stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Hedera SDK (`@hashgraph/sdk`)
- Upstash Redis
- Zod
- Vercel

## Demo Path

1. Sign in as issuer and reset the live inventory
2. Sign in as Person A and book one available session
3. Open the same pass on the resale page and list it
4. Sign in as Person B and buy that listed pass
5. Return to issuer and show the holder changed
6. Issuer checks the pass in and closes it
7. Return to the guest side and show the pass is now closed and cannot be resold

## Proof

Canonical proof lives in [docs/TX-LOG.md](docs/TX-LOG.md).

Current testnet resources:

- Token ID: `0.0.8505698`
- Topic ID: `0.0.8505699`
- Treasury: `0.0.8504300`
- Person A: `0.0.8504405`
- Person B: `0.0.8504715`

HashScan links:

- Token: [0.0.8505698](https://hashscan.io/testnet/token/0.0.8505698)
- Topic: [0.0.8505699](https://hashscan.io/testnet/topic/0.0.8505699)
- F1 book: [transaction](https://hashscan.io/testnet/transaction/0.0.8504300-1775311056.646893028)
- F2 resale buy: [transaction](https://hashscan.io/testnet/transaction/0.0.8504300-1775311076.681678722)
- F3 freeze: [transaction](https://hashscan.io/testnet/transaction/0.0.8504300-1775311165.395183233)
- F3 unfreeze: [transaction](https://hashscan.io/testnet/transaction/0.0.8504300-1775311174.322191867)
- F4 mark used / return: [transaction](https://hashscan.io/testnet/transaction/0.0.8504300-1775311104.625214821)
- F4 burn: [transaction](https://hashscan.io/testnet/transaction/0.0.8504300-1775311102.263715214)

## Repo guide

Key docs:

- [docs/SPEC.md](docs/SPEC.md) — product and flow spec
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — technical boundaries and Hedera usage
- [docs/UI-MAP.md](docs/UI-MAP.md) — routes, components, APIs
- [docs/PAGE-OVERVIEW.md](docs/PAGE-OVERVIEW.md) — route-by-route UX status
- [docs/TASKS.md](docs/TASKS.md) — shipped vs deferred work
- [docs/SUBMISSION.md](docs/SUBMISSION.md) — submission worksheet

## Known limitations

- demo auth is not wallet auth
- no cancel / refund flow in the shipped MVP
- no open marketplace discovery layer; resale is a direct handoff flow
- some pages may need refresh if another signed-in role changed the same pass
- this is a hackathon MVP, not a production-grade permissions system
