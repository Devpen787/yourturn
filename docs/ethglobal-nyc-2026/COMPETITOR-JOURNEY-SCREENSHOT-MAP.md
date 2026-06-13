# Competitor journey screenshot map

Status: reference library for YourTurn premium UX build.
Captured: 2026-06-13.

Screenshots are stored in:

`output/playwright/ethglobal-ux-research-2026-06-13/journey/`

This capture is intentionally non-mutating. We did not accept updated terms, complete signup, submit lead forms, reserve a class, change account settings, or enter checkout/payment. When a competitor flow requires one of those actions, the screenshot captures the gate and the boundary is documented.

## Journey Index

| Step | File | Surface | What it teaches YourTurn |
| --- | --- | --- | --- |
| 01 | `01-classpass-home-logged-shell.png` | ClassPass home / shell | One clear promise, simple nav, trial CTA, broad category coverage |
| 02 | `02-classpass-credits-explainer.png` | Credits education | Explain booking budget through example routines, not mechanics |
| 03 | `03-classpass-plans-pricing.png` | Plans/pricing | Pricing is a lifestyle-fit decision with FAQ coverage |
| 04 | `04-classpass-search-marketplace.png` | Logged-in search gate | Search is date/time-led, but updated terms block deeper logged-in action |
| 05 | `05-classpass-studio-detail.png` | Studio profile | Venue page needs schedule, reviews, tags, amenities, preparation, directions |
| 06 | `06-classpass-class-detail.png` | Class detail | Specific class pages need class/studio title, schedule, reviews, policy help, contact links |
| 07 | `07-classpass-how-it-works.png` | Signup redirect/gate | Education links may redirect to signup when account state is incomplete |
| 08 | `08-classpass-cancellation-help.png` | Cancellation policy help | Users expect plain policy help outside the booking flow |
| 09 | `09-classpass-partner-how-it-works.png` | Partner onboarding | Owner story is incremental revenue, low upfront risk, profile setup, synced inventory |
| 10 | `10-classpass-partner-earnings-calculator.png` | Partner earnings calculator | Owners expect economics before onboarding |
| 11 | `11-classpass-partner-integrations.png` | Partner integrations | Owners expect schedule sync with existing booking systems |
| 12 | `12-mindbody-home-business.png` | Mindbody business home | Owner-first OS: payments, marketing, staff, booking, scheduling, reporting |
| 13 | `13-mindbody-pricing.png` | Mindbody pricing | B2B software packaging and trust/support expectations |
| 14 | `14-mindbody-business-app.png` | Mindbody app for businesses | Marketplace distribution, dynamic pricing, reviews, payouts |
| 15 | `15-mindbody-explore.png` | Mindbody explore | Consumer marketplace with deal cards and app-like discovery |
| 16 | `16-classpass-public-search-baseline.png` | Public search baseline | Search cards, map mode, category filters, ratings, listing density |
| 17 | `17-classpass-public-filter-fitness.png` | Category filter open | Category selection is visual and user-language-first |
| 18 | `18-classpass-public-filter-activities.png` | Activity filter open | Filters need clear/done controls and should not overwhelm cards |
| 19 | Not captured | Time filter | Not available in this public variant; logged-in search had date/time controls |
| 20 | Not captured | More filter | Not available in this public variant; logged-in search had a More control |

Supporting manifests:

- `journey-manifest.json`
- `filter-state-manifest.json`

## Consumer Expectations

People coming from ClassPass expect the booking app to answer these questions quickly:

1. What can I do nearby, today or next?
2. What type of class/appointment is it?
3. Who is the studio/provider?
4. How trusted is it?
5. What does it cost in my booking budget?
6. What happens if I cancel, miss it, or need help?
7. Can I see enough venue/class detail to feel confident?

For YourTurn, this means the Hedera layer cannot be the first-order interface. The first-order interface is still discovery, schedule, ticket, recovery, and owner policy.

## Owner Expectations

Owners coming from ClassPass/Mindbody expect:

1. A clear way to list the business and create a profile.
2. Existing booking/schedule integration or a simple inventory builder.
3. Control over availability and policies.
4. Revenue expectations before committing.
5. Reporting on bookings, payouts, reviews, and demand.
6. Automation that reduces admin without losing owner control.

For YourTurn, this means the owner side must feel like an operating surface, not a wallet demo.

## YourTurn Build Implications

### Must-Have Screens

- Discover / marketplace browse.
- Search filters for category, date, time, location, and policy.
- Studio or provider profile.
- Slot or class detail page.
- Booking confirmation / ticket / QR / receipt.
- My bookings.
- Concierge recovery action screen.
- Owner inventory setup.
- Owner policy builder.
- Owner dashboard.
- Proof drawer / audit view.

### Must-Have UI Details

- Realistic photos or image placeholders that feel intentional.
- Ratings/reviews or seeded trust indicators.
- Class/studio metadata: instructor, time, duration, address, category, amenities.
- Clear policy labels: transferable, resale allowed, release allowed, waitlist active, auto-execution scheduled.
- Clear owner economics: booked, released, resold, waitlisted, executed, revenue/proof.
- Hedera proof as a receipt/detail layer, not the main user-facing vocabulary.

### Demo Expectations

The winning demo should feel familiar first, then reveal the superpower:

1. Booker discovers a premium class.
2. Booker sees clear policy and books a tokenized slot.
3. Booker cannot attend.
4. Concierge recommends a policy-valid recovery action.
5. User approves.
6. Hedera executes/records the lifecycle proof.
7. Another booker can claim the slot or the owner sees the recovery event in the dashboard.

## Boundaries Still Open

- We did not accept ClassPass updated terms.
- We did not complete signup.
- We did not inspect full paid-member booking confirmation or post-booking ticket flows.
- We did not inspect ClassPass studio admin dashboards.
- We did not inspect logged-in Mindbody owner dashboards.

Those flows require explicit approval because they involve account/session state, legal terms, or possible transaction/account effects.
