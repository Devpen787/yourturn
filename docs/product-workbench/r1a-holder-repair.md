# #44 R1a — holder state-safe navigation candidate

## Permission and scope

After the executed R0 baseline, Devinson explicitly said **“I approve - please keep going.”** This permits the bounded engineering successor below. It is not an independent Product Reviewer disposition, `GOLDEN-READY`, Golden freeze, renewed standing freeze approval, or sponsor/release authority. #34 must independently review the resulting exact candidate and its evidence. Historical Golden records stay unchanged.

This first R1 increment addresses the holder/Maya ownership blocker and approval navigation, plus visible actor identity in the shared preview header. **It does not complete R1, R2, R3 or R4.** Bob payment/check-in, provider state, the four bridges, editable provider flows and connected cross-actor acceptance remain open.

## Implementation boundary

- `holder-fixture-state.ts` is a pure, versioned holder-only fixture reducer. A location/URL is not an action and cannot approve, recover, revoke or restore ownership.
- `useHolderJourney.ts` adapts that model to namespaced browser storage and addressable Next task locations. Persist before showing completion. Refresh, body return, header return and browser history resolve the stored facts.
- Initial prepared Maya booking remains an explicit demo boundary. A success URL cannot manufacture a completed recovery or approved mandate.
- Active/pending recovery is visible in bookings/detail; leaving pending approval does not cancel or approve it. Replacement reject/cancel preserves the current 40-USDC mandate.
- Malformed, unavailable or failed storage shows loading/error/retry rather than silently replacing a known result with a fresh owned booking. No storage clear/reset control is added.
- Preview header actor names remain visible on mobile, and navigation links meet 44px target height. Customer/provider route destinations outside the holder repair remain unchanged and may still expose the recorded R0 defects.

This browser fixture is not trusted authorization, a server store, payment execution, a multi-actor booking source, or a complete concurrency solution. Do not import it into a sponsor/API route. Further R1 work must extend the coherent scenario model rather than create more unrelated success flags. Live implementation belongs to `integration-ledger.md`.

## Reuse decisions

Read `feat/product-issuer-holder-ux/app/my-bookings/page.tsx`: held-booking presentation is derived from independent booking-state reads. Adapt that separation into the fixture reducer; do not import the live server/wallet code into this branch.

Read `main/app/my-bookings/MyBookingsClient.tsx`: list ownership comes from row predicates, not which link was clicked. Reuse that principle; reject its legacy actor selector/protocol-first wording and preserve the Golden visual family.

## Verification required

1. Pure model tests: initial/replacement approve/reject/cancel, pending serialization, bounds, revoked state, duplicate recovery and forged success URLs.
2. Existing four segment suites retained. The two direct rejection-state captures now use explicit isolated test-fixture preconditions, not URL-created state; all existing visible authority assertions remain.
3. R1a browser suite: clicked holder recovery -> header/reload/Back/Forward, pending -> header/reload/resume, replacement cancel retention, forged URLs, corrupt storage and failed writes; desktop/mobile PNGs and exact-head JSON.
4. R0 integrity assertions remain unchanged and RED for unrepaired Bob/provider/bridge gaps. No expected-failure or continue-on-error waiver.
5. Production build/type validation and exact-head screenshot artifact; direct #34 review still needed.

Local model/syntax checks are not full-app browser proof. GitHub Actions is the available production-build/Chromium environment. Do not declare the whole UX complete from an R1a pass.
