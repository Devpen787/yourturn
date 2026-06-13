# YourTurn premium UX delta report

Status: live-app review against ClassPass/Mindbody reference journey.
Captured: 2026-06-13.

Local app reviewed at `http://localhost:3000` with the dev server running via `npm run dev`.

Reference packet:

- `PREMIUM-UX-COMPETITOR-RESEARCH.md`
- `COMPETITOR-JOURNEY-SCREENSHOT-MAP.md`

YourTurn screenshots:

`output/playwright/yourturn-premium-delta-2026-06-13/`

## Method

Browser path:

- Started with Codex in-app Browser for home, login, register, unauthenticated gates, signed-in User A routes, and brand lab.
- Switched to regular Playwright for provider, User B, mobile, and resale captures after the in-app Browser repeatedly timed out on local navigation.

Routes/screens captured:

- `/`
- `/login`
- `/register`
- `/slots`
- `/my-bookings`
- `/slots/163`
- `/slots/164`
- `/resale/164`
- `/issuer`
- `/demo-help`
- `/brand-lab`
- mobile `/`, `/slots`, `/my-bookings`

We did not execute book/list/buy/check-in actions in this pass because those mutate the demo and may create Hedera testnet activity. This pass is visual/product-structure QA only.

## Findings

### P0: `/my-bookings` throws a runtime error

Evidence:

- Screenshot: `09-userA-my-bookings.png`
- Screenshot: `15-userB-my-bookings.png`
- Screenshot: `19-mobile-my-bookings.png`
- Dev-server terminal repeated: `Element type is invalid: expected a string ... but got: undefined`
- Browser overlay showed `1 error` on `/my-bookings`.

Impact:

The pass hub is a core ClassPass-equivalent surface. For the hackathon story, this is where the user should see bookings, recovery options, tickets, and Concierge. A visible runtime error breaks premium trust immediately.

Likely ownership:

- Route tree: `app/my-bookings/*`
- Shared shell is also used by `/slots`, but `/slots` did not reproduce the error. Start with `app/my-bookings/page.tsx` and `app/my-bookings/MyBookingsClient.tsx`.

### P1: Current browse is functionally useful but not marketplace-grade

Evidence:

- YourTurn: `08-userA-slots.png`, `14-userB-slots.png`, `18-mobile-slots.png`
- Reference: ClassPass `04-classpass-search-marketplace.png`, `16-classpass-public-search-baseline.png`, filter captures `17-*`, `18-*`

Observed delta:

- YourTurn browse is a status list: available/held/used counts plus simple session rows.
- ClassPass browse is a marketplace: search, location, category, date, time, class/studio tabs, map, ratings, duration, instructor, studio name, and pricing prompt.

Needed shift:

Turn `/slots` into a discovery surface first and a lifecycle-status surface second.

Minimum premium delta:

- Add search/location/date/time/category filters.
- Add venue/class cards with photos or high-quality seeded images.
- Show instructor/provider, duration, address/neighborhood, rating/trust marker, and policy badges.
- Hide raw lifecycle states behind user-language labels where possible.

### P1: Slot detail proves the chain but undersells the service

Evidence:

- YourTurn: `10-userA-slot-detail.png`, `16-userB-slot-detail.png`, `20-userB-slot-164-detail.png`
- Reference: `05-classpass-studio-detail.png`, `06-classpass-class-detail.png`

Observed delta:

- YourTurn detail leads with pass status, holder, price, proof links, and raw history.
- ClassPass detail leads with class/studio confidence: venue profile, schedule, reviews, cancellation-policy help, preparation, amenities, directions, contact/social links.

Needed shift:

Make slot detail feel like a ticket/class page with a proof drawer, not a proof page with class metadata.

Minimum premium delta:

- Add studio/provider profile band.
- Add class description, instructor/staff, duration, location, preparation/amenities, and cancellation/recovery policy.
- Add ticket/QR/receipt area for held passes.
- Move HashScan/HCS details into a collapsed "Verified receipt" drawer.

### P1: Resale is a strong feature but reads like a transaction form

Evidence:

- YourTurn: `21-userB-resale-164.png`
- Reference: ClassPass cancellation-policy help and search/class detail journey.

Observed delta:

- Current copy says "Resell or buy this pass" and exposes holder/buyer mechanics directly.
- The flow is functionally valuable, but it does not yet feel like "I cannot attend, help me recover value."

Needed shift:

Package resale/release as a recovery workflow. The agent/Concierge should own the complexity.

Minimum premium delta:

- Rename the primary user state to "I can’t attend" or "Recover this booking."
- Show options as action cards: reschedule, release, list for resale, offer to waitlist.
- Require explicit approval before listing/buying.
- Show a calm post-action receipt with owner policy and Hedera proof.

### P1: Owner dashboard has real operational control but lacks owner-marketplace polish

Evidence:

- YourTurn: `12-issuer-dashboard.png`
- Reference: ClassPass partner pages `09-*`, `10-*`, `11-*`; Mindbody `12-*`, `13-*`, `14-*`

Observed delta:

- YourTurn owner dashboard has inventory, session plan, status table, pause/reopen, and check-in.
- ClassPass/Mindbody owner surfaces frame value around business setup, schedule sync, listing quality, economics, reviews, payouts, and operational software.

Needed shift:

Keep the current provider controls, but add a premium owner shell around them.

Minimum premium delta:

- Business profile card with photos/location/service type.
- Policy builder as a first-class section: resale allowed, release window, refund language, waitlist, scheduled automation.
- Inventory calendar/list view with upcoming sessions and capacity.
- Owner economics panel: booked, held, released/resold, waitlisted, revenue, fees.
- Integrations/import placeholder: "Sync schedule" or "Import booking calendar" even if demo-only.

### P2: The best design work is in `/brand-lab`, not shipped product routes

Evidence:

- `07-brand-lab.png`
- Current shipped `/slots`, `/my-bookings`, `/issuer` screenshots.

Observed delta:

The brand lab has richer product concepts, better visual hierarchy, and more premium component ideas than the live customer/provider routes. For the hackathon, the shipped routes need to inherit this polish.

Needed shift:

Promote the strongest brand-lab patterns into the actual demo path instead of leaving them as an internal artifact.

### P2: Mobile is usable but feels like stacked admin content

Evidence:

- `17-mobile-home.png`
- `18-mobile-slots.png`
- `19-mobile-my-bookings.png`

Observed delta:

- Mobile layout does not visibly break, but the browse route becomes long stacked status cards and text explanations.
- ClassPass mobile expectation is fast scannability: search, cards, filters, and concise booking actions.

Minimum premium delta:

- Compress status counters.
- Make session cards visual and tappable.
- Replace demo explanations with a small helper drawer.
- Keep CTA/states sticky where useful: ticket, recover, book, ask Concierge.

## What Already Works

- The homepage is much closer to premium than the app routes: clear promise, good hero hierarchy, restrained styling.
- The app has real product primitives: demo auth, customer/provider split, slot status, resale, proof links, HCS history, and provider controls.
- Provider dashboard is functionally strong for a hackathon proof.
- Slot detail already contains proof and lifecycle history, which is valuable once moved behind better UX.
- Resale already demonstrates tokenized booking value; it just needs a consumer recovery wrapper.

## Delta Matrix

| Expectation from ClassPass/Mindbody | Current YourTurn | Delta |
| --- | --- | --- |
| Search/location/date/time filters | Minimal route tabs and status counters | Add marketplace filtering |
| Rich class/studio cards | Plain status rows | Add venue images, ratings, instructor, category, duration |
| Studio profile depth | No real venue profile | Add provider/studio page or detail band |
| Class detail confidence | Pass proof/status page | Reframe as class/ticket detail with proof drawer |
| Cancellation/recovery help | Resale transaction form | Add recovery action flow and Concierge cards |
| User pass hub | Runtime error and empty/finished state | Fix error, add ticket/QR/recovery state |
| Owner business software feel | Functional admin controls | Add profile, policy builder, economics, schedule/integrations |
| Trust through polish | Demo IDs and technical copy visible | Hide demo/technical details in drawers |
| On-chain proof | Strong but too prominent | Keep proof, make it a verified receipt layer |

## Recommended Next Wave

Do this before deeper wallet or agent expansion:

1. Fix `/my-bookings` runtime error.
2. Promote brand-lab visual language into `/slots`, `/slots/[serial]`, `/my-bookings`, and `/resale/[serial]`.
3. Redesign `/slots` as marketplace browse:
   - search
   - date/time/category filters
   - class/studio cards
   - policy badges
4. Redesign `/slots/[serial]` as class/ticket detail:
   - provider profile
   - policy snapshot
   - ticket/QR/receipt
   - proof drawer
5. Redesign `/resale/[serial]` as "Recover this booking":
   - action cards
   - approval step
   - proof receipt
6. Add owner policy builder to `/issuer`:
   - resale/release/waitlist/scheduled automation settings
   - policy snapshot language
7. Only then wire the Concierge/Telegram/Hedera Schedule Service demo into the polished surfaces.

## Screenshot Index

YourTurn:

- `01-home.png`
- `08-userA-slots.png`
- `09-userA-my-bookings.png`
- `10-userA-slot-detail.png`
- `12-issuer-dashboard.png`
- `18-mobile-slots.png`
- `21-userB-resale-164.png`

Reference:

- `output/playwright/ethglobal-ux-research-2026-06-13/journey/04-classpass-search-marketplace.png`
- `output/playwright/ethglobal-ux-research-2026-06-13/journey/05-classpass-studio-detail.png`
- `output/playwright/ethglobal-ux-research-2026-06-13/journey/06-classpass-class-detail.png`
- `output/playwright/ethglobal-ux-research-2026-06-13/journey/09-classpass-partner-how-it-works.png`
- `output/playwright/ethglobal-ux-research-2026-06-13/journey/14-mindbody-business-app.png`
