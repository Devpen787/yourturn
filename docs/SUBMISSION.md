# Submission worksheet

Local worksheet for the final hackathon submission. This file is now filled with a repo-backed draft; only external items still need manual confirmation in the submission UI.

As of the ETHGlobal NYC 2026 packet, the submission deadline is `Sunday, June 14th, 2026 at 09:00 EDT`.

## Do not reuse the example text from the form paste

The pasted example copy about state channels, exchange onramp/offramp, MobX, Rust, Coinbase, and Bitfinex is **not this project**. Write all final submission copy from this repo's actual product and implementation.

## Current repo facts to keep aligned

- Current public repo: `https://github.com/Devpen787/yourturn`
- Current primary Hedera tracks: `Autonomous On-Chain Automation Platform`, `AI & Agentic Payments on Hedera`, and `"No Solidity Allowed" - Build with Hedera SDKs`
- Current supporting Hedera story: `Tokenization on Hedera`
- Current technical fit: `HTS + HCS + Hedera Schedule Service + Mirror Node + Hedera Agent Kit runtime/manifest`
- Current merged MVP also uses: Telegram Concierge transport, HashScan proof links, and Upstash Redis for demo metadata
- Current app stack in repo: `Next.js 14`, `React 18`, `TypeScript`, `Tailwind CSS`, `@hashgraph/sdk`, `@upstash/redis`, `zod`, `Vercel`
- Current must-ship flows: `F1` primary booking, `F2` resale / transfer with royalty, `F4` mark used, and ETHGlobal recovery proofs for Concierge listing and refund/release
- Naming still needs one final submission decision:
  - `README.md` product sentence uses `Booked Rights`
  - `docs/UI-RULES.md` says visible product name should be `YourTurn`

## Submission readiness checklist

- [x] Final project name chosen
- [x] Category confirmed
- [x] Emoji confirmed
- [ ] Demo URL captured
- [x] Short description written and length-checked
- [x] Full description written
- [x] "How it's made" written
- [x] Public repo URL confirmed
- [x] Logo exported
- [x] Cover image exported
- [x] At least 3 screenshots exported
- [x] Tech stack selections finalized
- [x] AI tooling disclosure finalized
- [x] Submission type chosen
- [x] Up to 3 partner prize selections chosen
- [x] Prize justification written for each selected partner
- [ ] Optional demo video uploaded or explicitly skipped
- [x] Future-opportunities answer chosen
- [ ] Team list checked before final submit

## Form fields

### Project details

**Project name**

- Final: `YourTurn`
- Notes: Use `YourTurn` as the visible product name. Treat `Booked Rights` as the repo / internal build codename only.

**Category**

- Current draft from form: `Wallet/Payments`
- Final: `Wallet/Payments`
- Notes: Best fit because the current proof combines controlled pass transfer, agent-assisted HBAR movement, and Hedera-backed recovery payments.

**Emoji**

- Current draft from form: `🤝`
- Final: `🤝`

**Demonstration link**

- Final URL: `TBD`
- Backup URL: `TBD`
- Notes: Add the Vercel or public tunnel URL before final submission.

**Short description**

- Limit: `100 characters max`
- Draft: `Agent-assisted recovery for tokenized bookings on Hedera.`
- Character count: `55`
- Final: `Agent-assisted recovery for tokenized bookings on Hedera.`

**Description**

- Requirement: `minimum 280 characters`
- Draft: `YourTurn turns a booked service slot into a controlled, transferable pass and gives customers a Concierge recovery path when they cannot attend. A provider sets the session and recovery policy, Person A books the slot, and YourTurn Concierge can help list the pass for resale or complete a policy-gated release/refund after human approval. The ETHGlobal build uses Hedera native services to prove the lifecycle: HTS for booking-right NFTs, HCS for audit messages, Schedule Service for an executed recovery payment proof, Mirror/HashScan for verification, and a Hedera Agent Kit-style runtime/manifest for bounded agent tools and policy checks. The user sees a normal booking and Telegram flow; judges can inspect the receipts, schedule ids, transaction ids, and agent capability endpoints.`
- Final: `YourTurn turns a booked service slot into a controlled, transferable pass and gives customers a Concierge recovery path when they cannot attend. A provider sets the session and recovery policy, Person A books the slot, and YourTurn Concierge can help list the pass for resale or complete a policy-gated release/refund after human approval. The ETHGlobal build uses Hedera native services to prove the lifecycle: HTS for booking-right NFTs, HCS for audit messages, Schedule Service for an executed recovery payment proof, Mirror/HashScan for verification, and a Hedera Agent Kit-style runtime/manifest for bounded agent tools and policy checks. The user sees a normal booking and Telegram flow; judges can inspect the receipts, schedule ids, transaction ids, and agent capability endpoints.`
- Notes: Anchored to `docs/SPEC.md`, `docs/DEMO.md`, `docs/FINAL-DEMO-SCRIPT.md`, and `docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md`.

**How it's made**

- Requirement: `minimum 280 characters`
- Draft: `YourTurn is a Next.js 14 App Router app built with TypeScript, React, Tailwind CSS, Upstash Redis, and @hashgraph/sdk. Hedera writes run server-side in Node routes through a BookingPort boundary. HTS represents booked service slots as NFT serials with royalty and lifecycle controls. HCS records audit events. Mirror Node and HashScan provide holder/status verification. The ETHGlobal recovery flow adds a policy-gated Concierge layer with preview, human approval, receipt storage, Telegram transport, and Hedera Agent Kit-style tool metadata. The listing recovery path creates a real Hedera Schedule Service payment proof; the release/refund path sends a real testnet HBAR refund, returns/closes the pass, and writes audit proof. The verifier commands are npm run ethglobal:preflight, npm run hedera:agent-check, npm run telegram:fixture, npm run ethglobal:e2e, and npm run build.`
- Final: `YourTurn is a Next.js 14 App Router app built with TypeScript, React, Tailwind CSS, Upstash Redis, and @hashgraph/sdk. Hedera writes run server-side in Node routes through a BookingPort boundary. HTS represents booked service slots as NFT serials with royalty and lifecycle controls. HCS records audit events. Mirror Node and HashScan provide holder/status verification. The ETHGlobal recovery flow adds a policy-gated Concierge layer with preview, human approval, receipt storage, Telegram transport, and Hedera Agent Kit-style tool metadata. The listing recovery path creates a real Hedera Schedule Service payment proof; the release/refund path sends a real testnet HBAR refund, returns/closes the pass, and writes audit proof. The verifier commands are npm run ethglobal:preflight, npm run hedera:agent-check, npm run telegram:fixture, npm run ethglobal:e2e, and npm run build.`
- Notes: Keep the final form answer aligned with `docs/ARCHITECTURE.md`, `docs/DEMO.md`, and `docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md`.

**GitHub repositories**

- Primary repo: `https://github.com/Devpen787/yourturn`
- Additional repos: `None`
- Notes: Current repo state points to one public canonical repo only.

### Images and assets

**Logo**

- Status: `ready locally`
- Local file path: `public/brand/yourturn-calendar-turn-logo.png`
- Final uploaded asset: `TBD after form upload`
- Notes: This is the current canonical local logo asset.

**Cover image**

- Status: `ready locally`
- Local file path: `docs/review-screenshots/01-home.png`
- Final uploaded asset: `TBD after form upload`
- Notes: Use as the current cover image draft. Crop or export a 16:9 version before upload if the submission UI requires a tighter aspect ratio.

**Screenshots**

- Minimum required: `3`
- Screenshot 1: `output/ethglobal-final-proof/screenshots/01-telegram-recovery-preview.png` — Telegram recovery preview
- Screenshot 2: `output/ethglobal-final-proof/screenshots/02-telegram-listing-success.png` — Telegram listing success and schedule proof link
- Screenshot 3: `output/ethglobal-final-proof/screenshots/03-telegram-refund-success.png` — Telegram refund/release success
- Screenshot 4: `output/ethglobal-final-proof/screenshots/04-resale-193-recovery-proof.png` — in-app recovery proof for booking `193`
- Screenshot 5: `output/ethglobal-final-proof/screenshots/08-hashscan-schedule-9228236.png` — HashScan executed schedule
- Screenshot 6: `output/ethglobal-final-proof/screenshots/10-hashscan-refund-release.png` — HashScan refund/release transaction
- Notes: `output/` is local-only and gitignored. Use these files for upload; the tracked index is `docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md`.

### Tech stack

**Ethereum developer tools**

- Final selections: `None`
- Notes: This build is for Hedera, not EVM tooling.

**Blockchain networks**

- Likely include: `Hedera Testnet`
- Final selections: `Hedera Testnet`
- Notes: All recorded proof links in `docs/TX-LOG.md` are testnet transactions.

**Programming languages**

- Repo evidence: `TypeScript`
- Final selections: `TypeScript`

**Web frameworks**

- Repo evidence: `Next.js`, `React`
- Final selections: `Next.js`, `React`

**Databases**

- Repo evidence: `Upstash Redis` / `Redis`
- Final selections: `Redis`, `Upstash Redis`

**Design tools**

- Final selections: `None confirmed from repo state`
- Notes: No dedicated design tool usage is documented in the repo. If Figma or another tool was used off-repo, add it manually.

**Other important technologies, libraries, frameworks, or tools**

- Repo evidence candidates:
  - `Hedera Token Service (HTS)`
  - `Hedera Consensus Service (HCS)`
  - `Mirror Node REST API`
  - `@hashgraph/sdk`
  - `Tailwind CSS`
  - `Vercel`
  - `zod`
- Final selections:
  - `Hedera Token Service (HTS)`
  - `Hedera Consensus Service (HCS)`
  - `Hedera Schedule Service`
  - `Hedera Agent Kit`
  - `Mirror Node REST API`
  - `HashScan`
  - `@hashgraph/sdk`
  - `Tailwind CSS`
  - `Vercel`
  - `zod`

**Describe how AI tools were used**

- Leave blank if not applicable.
- Draft: `OpenAI/Codex tools were used to accelerate implementation, refactors, copy iteration, browser QA, and documentation across the Next.js app and supporting repo docs. The final Hedera transaction paths, Telegram proofs, verifier commands, screenshots, and proof links were then run against Hedera testnet and recorded in the final proof packet.`
- Final: `OpenAI/Codex tools were used to accelerate implementation, refactors, copy iteration, browser QA, and documentation across the Next.js app and supporting repo docs. The final Hedera transaction paths, Telegram proofs, verifier commands, screenshots, and proof links were then run against Hedera testnet and recorded in the final proof packet.`
- Notes: If you want a stricter disclosure, replace `OpenAI tools` with the exact tools you are comfortable naming publicly.

### Judging and prizes

**Submission type**

- Options:
  - `Top 10 Finalist & Partner Prizes`
  - `Partner Prizes only`
- Final: `Top 10 Finalist & Partner Prizes`
- Notes: This assumes you want main judging plus partner judging. If you decide to skip live main judging, change this to `Partner Prizes only`.

**Partner prizes**

- Limit: `maximum 3 partners`
- Candidate partners from form:
  - `World`
  - `0G`
  - `Arc`
  - `Hedera`
  - `ENS`
  - `Uniswap Foundation`
  - `Flare`
  - `Ledger`
  - `Chainlink`
  - `WalletConnect`
  - `Unlink`
  - `Dynamic`
- Selected partner 1: `Hedera`
- Why applicable: `YourTurn uses Hedera as the proof and execution layer for tokenized booking recovery. HTS represents the booking-right NFT lifecycle, HCS records audit proof, Schedule Service creates and executes the recovery payment proof, Mirror/HashScan verify state, and the Concierge/Agent Kit path applies policy checks before approved listing or refund/release actions. The final packet records Telegram proofs for bookings 193 and 194 plus a full E2E regression.`
- Selected partner 2: `None`
- Why applicable: `Not applying for a second partner prize unless a real integration is added.`
- Selected partner 3: `None`
- Why applicable: `Not applying for a third partner prize unless a real integration is added.`

### Video upload

**Demo video**

- Optional: `Yes`
- Requirements:
  - `2 to 4 minutes`
  - `minimum 720p`
  - `audio without music`
- Status: `script prepared; video still needs recording/upload`
- Local file path: `TBD`
- Uploaded asset: `TBD`
- Notes: Use `docs/FINAL-DEMO-SCRIPT.md`. Keep it between 2 and 4 minutes, 720p or better, with spoken audio and no background music.

### Future opportunities

**Interested in continuing the project?**

- Final answer: `Yes`
- Notes: This matches the current repo direction and the fact that the MVP already has real Hedera proof plus follow-on product work in `docs/TASKS.md`.

### Final submission check

**Team**

- Team members confirmed: `TBD in ETHGlobal team editor`
- Missing invites: `TBD`
- Notes: This cannot be verified from repo state. Check the team roster in the submission UI before pressing submit.

## Suggested source material when filling this out

- `README.md`
- `docs/SPEC.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DEMO.md`
- `docs/TX-LOG.md`

## Final pre-submit pass

- [x] Submission copy matches current shipped product
- [x] Hedera track claims match repo reality
- [x] Final proof pack created
- [x] Telegram proofs `193` and `194` referenced clearly
- [ ] Demo URL works
- [x] Repo is public
- [x] Images are captured locally
- [ ] Images are uploaded to ETHGlobal form
- [x] Screenshots reflect the shipped UI
- [x] Prize selections are justified
- [ ] Demo video uploaded or intentionally skipped
- [ ] Team is complete before pressing submit
