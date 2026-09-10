# Journey Registry

Status vocabulary: `candidate`, `review`, `GOLDEN-READY`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | Golden | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | Golden | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | Golden | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | Golden | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | candidate | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | candidate | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | candidate | P0 |
| YT-08 Successful recovery | In-scope offer completes transfer + settlement | candidate | P0 |
| YT-09 New holder | Buyer sees and can use the transferred booking | queued | P1 |
| YT-10 Activity & proof | Both parties can understand what happened; reviewer can inspect evidence | queued | P1 |

## Golden set

**YT-01 → YT-04**

Frozen executable candidate: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Golden record: `docs/product-workbench/golden/yt-01-04.md`.

Human approval was explicitly recorded after Product Reviewer #34 classified this exact candidate `GOLDEN-READY` under the hard rendered-visual gate.

Golden customer story:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → minimum/expiry/actions → secure-approval handoff`

The Golden authority contract is:
- minimum recovery: 40 USDC
- expiry: tomorrow 17:00
- allowed: find an eligible buyer / transfer as required to complete approved recovery
- forbidden: cancel, lower the minimum, touch another booking
- authority applies only to Friday Yoga

## Current active set

**YT-05 → YT-08**

Build one continuous continuation of the Golden flow. Do not create a separate sponsor demo.

Target story:

`secure approval → exact mandate authorized → verified delegated agent starts recovery → 32 USDC offer BLOCKED → optional escalation boundary remains human-controlled → 45 USDC offer ALLOWED → booking transferred → Alice receives 45 USDC → recovery complete`

### YT-05 — Delegate

User outcome: the holder understands exactly what is being authorized and can approve or reject it on the Ledger device.

Required product states:
- device not ready / connect-device state;
- awaiting confirmation on device;
- approved;
- rejected/cancelled with no authority created;
- identical human-readable mandate details to YT-04: Friday Yoga only, 40 USDC minimum, tomorrow 17:00, cancellation forbidden;
- no implication that Ledger signs Hedera HTS transactions; Ledger authorizes the off-chain Recovery Mandate.

### YT-06 — Agent working

User outcome: the holder sees that recovery is active and that the exact delegated human-backed agent is the one acting.

Required product states:
- recovery active;
- exact delegated agent verified / human-backed status is legible without exposing raw World human identifiers;
- clear statement that YourTurn may act only inside the approved rules;
- customer can understand how to stop/revoke recovery;
- reviewer proof can expose safe World verification evidence separately from the primary UI.

### YT-07 — Block / escalate

User outcome: a 32 USDC offer does not trigger an unauthorized action and the customer understands why.

Required product states:
- incoming 32 USDC offer;
- visibly `Not accepted — below your 40 USDC minimum`;
- no booking transfer and no settlement occurs;
- customer does not need to intervene merely because an invalid offer arrived;
- if the customer chooses to lower the minimum, that is a new authority decision and must return to Ledger approval rather than silently widening the mandate.

### YT-08 — Successful recovery

User outcome: a 45 USDC offer is inside the approved rules and completes the actual recovery outcome.

Required product states:
- 45 USDC offer recognized as inside the mandate;
- agent proceeds without another owner prompt;
- booking transfer completes on Hedera;
- Alice receives 45 USDC on Hedera;
- customer-facing completion: `You recovered 45 USDC`;
- Friday Yoga is no longer presented as Alice's usable booking after successful transfer;
- technical proof is available in a secondary reviewer drawer, with truthful LIVE/TESTNET labels and transaction/evidence links when integrated.

## YT-05→YT-08 visual/product rules

- Continue the exact Golden shell, booking card, typography, spacing and status vocabulary from YT-01→YT-04.
- Normal UI must remain booking/recovery-first; Ledger / World / Hedera belong at the trust boundary or reviewer proof layer, not as dashboard chrome.
- Sponsor-dependent behavior may be fixture state in the UX branch until integration, but code and proof surfaces must not label it LIVE unless wired to real sponsor evidence.
- Every material UX candidate must be rendered and screenshot-tested at desktop `1440×1000` and mobile `390×844`.
- Capture every meaningful YT-05→YT-08 state, not only the happy path.
- Product Reviewer #34 must inspect the actual PNG artifact for the exact executable candidate before `GOLDEN-READY`.
- Devinson must explicitly approve the exact candidate before YT-05→YT-08 can become Golden.

## Next set after Golden approval

**YT-09 → YT-10**

Close the product loop from the other side:
- Bob sees Friday Yoga as a normal usable booking;
- Alice and Bob can understand the completed transfer/recovery history;
- reviewer proof exposes the underlying Ledger / World / Hedera evidence without turning the customer experience into a protocol console.

## Completion principle

The hackathon product journey is not complete until the state is visible on both sides:

- Alice no longer owns the booking and has recovered value.
- Bob owns a usable Friday Yoga booking.

A transaction receipt alone does not count as journey completion.
