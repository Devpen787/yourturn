# Booked Rights

Booked Rights turns a service booking into a transferable right under issuer rules.

This repo is the canonical source of truth for the hack build. The prep repo stays upstream reference material only; durable product, build, and demo decisions now live here.

## Current product frame

**Hero customer:** SMB services and classes such as yoga studios, physical therapy practices, and handstand or movement coaching.

**Hero problem:** someone booked a real service slot, cannot make it, and wants to transfer, resell, or rebook it without manual back-and-forth, while the issuer still controls the rules and economics.

## Locked technical direction

- **Primary target track:** Hedera `No Solidity Allowed`
- **Minimum honest fit:** `HTS + Mirror Node`
- **Optional depth only if it helps the demo:** `HCS`
- **No autonomous signing:** the agent can help compare options and prepare actions, but users approve every value-moving transaction

## Must-ship build scope

- **F1** Primary booking
- **F2** Transfer or resale with issuer royalty
- **F4** Mark used

## Strong next layer

- **F3** Freeze / unfreeze
- **F7** Cancel / refund

## Product rules already locked

- Issuer earns on secondary resale, including premium resale
- Issuer controls resale, transfer or gifting, forwarding count, rebook window, and expiry or lock deadline
- Product language stays plain: booking, slot, transfer, resale, rebook, refund
- Do not lead with `NFT` in the first line of user-facing copy

## Agent helper scope

The agent is a helper-only layer for booking operations. It can:

- check the user's calendar for conflicts
- compare available slots
- help book classes or sessions
- help rebook when the user has a scheduling conflict
- help resell or transfer a slot when issuer policy allows it
- work within a user-defined booking budget
- help the user meet a target number of classes or sessions

Guardrails:

- no autonomous signing
- no value-moving action without explicit user approval

## Repo map

- `docs/SPEC.md` — canonical working spec file and Sebastian paste-in surface
- `docs/DECISIONS.md` — locked decisions and dated updates
- `docs/TASKS.md` — living build checklist
- `docs/ARCHITECTURE.md` — system boundaries and Hedera service usage
- `docs/DEMO.md` — current demo order and stage rules
- `docs/TX-LOG.md` — testnet transaction ids and Hashscan proof
- `ISSUES-SEED.md` — issue-ready slices to open in GitHub

## Repo discipline

- Keep this repo strictly about the booked-rights hack project
- Do not import the whole prep archive here
- `main` only receives coherent slices with a verification path
- Coordinate before parallel edits to shared glue files such as `README.md`, `.env.example`, `src/adapters/booking-port.ts`, and the lockfile

## Setup

Fill this once the runnable app scaffold is added.

```bash
# install

# run

# test

# build
```

## Submission proof

Fill this as implementation lands:

- Testnet token id: `TBD`
- Treasury account: `TBD`
- Demo URL: `TBD`
- Hashscan links: `TBD`
- Video: `TBD`
