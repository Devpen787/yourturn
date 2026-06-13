# Submission worksheet

Local worksheet for the final hackathon submission. This file is now filled with a repo-backed draft; only external items still need manual confirmation in the submission UI.

As of `2026-04-05`, the form notes that live judging for Top 10 finalists is on `Sunday, April 5th, 2026 at 09:30 CEST`.

## Do not reuse the example text from the form paste

The pasted example copy about state channels, exchange onramp/offramp, MobX, Rust, Coinbase, and Bitfinex is **not this project**. Write all final submission copy from this repo's actual product and implementation.

## Current repo facts to keep aligned

- Current public repo: `https://github.com/Devpen787/yourturn`
- Current locked track: Hedera `No Solidity Allowed`
- Current technical fit: `HTS + Mirror Node`
- Current merged MVP also uses: `HCS` lifecycle messages
- Current app stack in repo: `Next.js 14`, `React 18`, `TypeScript`, `Tailwind CSS`, `@hashgraph/sdk`, `@upstash/redis`, `zod`, `Vercel`
- Current must-ship flows: `F1` primary booking, `F2` resale / transfer with royalty, `F4` mark used
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
- Notes: Best fit for the current MVP because the core proof is controlled transfer and resale of a booking-backed pass.

**Emoji**

- Current draft from form: `🤝`
- Final: `🤝`

**Demonstration link**

- Final URL: `TBD`
- Backup URL: `TBD`
- Notes: A public deployed demo URL was not found in repo state on `2026-04-05`. Add the Vercel URL before final submission.

**Short description**

- Limit: `100 characters max`
- Draft: `Transferable booking passes for classes and services with provider-controlled resale.`
- Character count: `85`
- Final: `Transferable booking passes for classes and services with provider-controlled resale.`

**Description**

- Requirement: `minimum 280 characters`
- Draft: `YourTurn turns a booked service slot into a controlled, transferable pass. In the MVP, a provider can mint limited session slots, a customer can book one, the current holder can resell it under provider rules, the provider earns a 10% royalty on secondary resale, and the provider can freeze movement or mark the pass used. The point is not generic ticketing. It is a cleaner way for studios, coaches, and therapy-style services to handle last-minute changes without losing control of the booking lifecycle.`
- Final: `YourTurn turns a booked service slot into a controlled, transferable pass. In the MVP, a provider can mint limited session slots, a customer can book one, the current holder can resell it under provider rules, the provider earns a 10% royalty on secondary resale, and the provider can freeze movement or mark the pass used. The point is not generic ticketing. It is a cleaner way for studios, coaches, and therapy-style services to handle last-minute changes without losing control of the booking lifecycle.`
- Notes: Anchored to `docs/SPEC.md`, `docs/DEMO-STORY.md`, and the shipped flows in `docs/DEMO.md`.

**How it's made**

- Requirement: `minimum 280 characters`
- Draft: `YourTurn is a Next.js 14 App Router app built with TypeScript, React, and Tailwind CSS. All Hedera write actions run in Node.js API routes using @hashgraph/sdk. We use Hedera Token Service for the transferable booking pass itself, including NFT serials, custom royalty fees, freeze and unfreeze controls, and final redemption via return-to-treasury plus burn. We use Mirror Node REST for holder and status reads, Hedera Consensus Service for lifecycle audit messages, Upstash Redis for slot and listing metadata, and HashScan links for proof during the demo. The result is a no-Solidity MVP that shows booking, resale, issuer control, and real testnet verification.`
- Final: `YourTurn is a Next.js 14 App Router app built with TypeScript, React, and Tailwind CSS. All Hedera write actions run in Node.js API routes using @hashgraph/sdk. We use Hedera Token Service for the transferable booking pass itself, including NFT serials, custom royalty fees, freeze and unfreeze controls, and final redemption via return-to-treasury plus burn. We use Mirror Node REST for holder and status reads, Hedera Consensus Service for lifecycle audit messages, Upstash Redis for slot and listing metadata, and HashScan links for proof during the demo. The result is a no-Solidity MVP that shows booking, resale, issuer control, and real testnet verification.`
- Notes: Keep the final form answer aligned with `docs/ARCHITECTURE.md` and `docs/TX-LOG.md`.

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
- Screenshot 1: `docs/review-screenshots/01-home.png` — marketing home
- Screenshot 2: `docs/review-screenshots/05-provider-dashboard.png` — provider console
- Screenshot 3: `docs/review-screenshots/08-resale-person-a.png` — resale listing flow
- Screenshot 4: `docs/review-screenshots/09-resale-person-b.png` — resale buy flow
- Screenshot 5: `docs/review-screenshots/07-session-detail-available.png` — pass detail and proof
- Screenshot 6: `docs/review-screenshots/02-slots.png` — browse and book
- Notes: These are already checked into the repo under `docs/review-screenshots/`.

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
  - `Mirror Node REST API`
  - `HashScan`
  - `@hashgraph/sdk`
  - `Tailwind CSS`
  - `Vercel`
  - `zod`

**Describe how AI tools were used**

- Leave blank if not applicable.
- Draft: `OpenAI tools were used to accelerate implementation, refactors, copy iteration, and documentation across the Next.js app and supporting repo docs. The final Hedera transaction paths, UI wiring, and proof transactions were then reviewed and run manually against testnet before being written into the submission materials.`
- Final: `OpenAI tools were used to accelerate implementation, refactors, copy iteration, and documentation across the Next.js app and supporting repo docs. The final Hedera transaction paths, UI wiring, and proof transactions were then reviewed and run manually against testnet before being written into the submission materials.`
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
- Why applicable: `This project was built specifically for the Hedera No Solidity Allowed track. The core product flow relies on HTS for the transferable booking pass and enforced royalty behavior, Mirror Node for holder and lifecycle reads, and HCS for lifecycle audit messages. The repo includes real testnet proof for booking, resale, freeze / unfreeze, and redemption in docs/TX-LOG.md.`
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
- Status: `not prepared yet`
- Local file path: `TBD`
- Uploaded asset: `TBD`
- Notes: If you record one, keep it between 2 and 4 minutes, 720p or better, with spoken audio and no background music.

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
- [ ] Demo URL works
- [x] Repo is public
- [ ] Images are ready and correctly sized
- [x] Screenshots reflect the shipped UI
- [x] Prize selections are justified
- [ ] Team is complete before pressing submit
