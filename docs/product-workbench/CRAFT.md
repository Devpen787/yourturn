# YourTurn Product Craft Rules

These are brand-agnostic execution/review rules for new YourTurn product states. They complement `DESIGN.md`, `GLOSSARY.md`, `invariants.md`, and the Product Reviewer checklist.

They apply prospectively. Do not reopen an approved Golden journey only to manufacture additional states or normalize implementation style unless a concrete user-impact, trust, security, or accessibility defect is found.

## 1. State coverage before screen polish

For every new networked or interactive state, decide which of these are materially possible for the user:
- untouched / ready;
- loading or submitted-pending;
- populated / success;
- empty / no result;
- error / recovery;
- edge / partial / extreme state.

Authority or financial actions additionally consider:
- not authorized;
- waiting for approval;
- rejected;
- cancelled;
- timeout / retry;
- active;
- replacement authority pending;
- revoked;
- expired.

Only promote states that can actually occur and matter to the user. State completeness is not a reason to add decorative branches.

## 2. State truth must survive negative paths

The page after failure must describe what is still true, not only what failed.

Examples:
- initial Ledger rejection: no recovery authority was created;
- replacement Ledger rejection: the proposed replacement failed, but the existing mandate remains active;
- below-minimum offer: offer blocked, no transfer and no settlement;
- provider-policy denial: holder mandate cannot override provider rules;
- timeout: authority/payment/booking state must not be guessed; give a safe retry or verification path.

Never reuse a generic failure screen if it changes the meaning of existing authority or ownership.

## 3. One primary action per decision state

The primary action should reflect the safest expected continuation.

Secondary actions may exist, but hierarchy must remain obvious. At authority/payment boundaries:
- approval must not look equivalent to cancel/reject;
- retry must not imply the previous attempt succeeded;
- changing limits must be visually distinct from continuing under existing limits;
- destructive/stop actions must not be disguised as ordinary navigation.

## 4. Progressive disclosure for proof

Customer path:
1. outcome;
2. reason/rule if relevant;
3. next action;
4. optional proof.

Do not lead with sponsor name, hashes, addresses, chain objects, SDK state, or CI evidence.

Proof detail must name its evidence class. A fixture or CI result may demonstrate the product contract or implementation property, but it is not LIVE execution.

## 5. Plain errors with exact recovery

Every user-visible error should answer:
- what did not happen?
- what remains unchanged?
- what can the user do now?

Prefer `The new 30 USDC limit was not approved. Your current 40 USDC recovery is still active.` over `Authorization failed`.

Do not expose raw internal exception text to the primary customer surface.

## 6. Empty states must preserve the object model

An empty screen should explain the missing product object and next useful action.

Examples:
- no bookings: explain that confirmed bookings will appear in `My bookings` and offer a relevant browse/find action;
- no eligible released bookings: say no matching spots are available under the current filters/provider conditions;
- no recovery activity: do not invent technical history just to fill the page;
- provider has no sessions: create/connect inventory is the relevant action.

Avoid empty dashboards full of zero metric cards when one sentence plus one action is clearer.

## 7. Partial and race states fail closed

For ownership, authority, eligibility, payment and provider-policy races:
- do not optimistically display success from an earlier snapshot;
- refresh/revalidate mutable facts at the decision boundary;
- if final truth is unknown, show a checking/pending state rather than success;
- if execution fails after a one-shot authorization is consumed, do not offer a retry that silently reuses invalid authority;
- user-visible rollback state must match the real booking/payment/authority result.

The Product Workbench may model these as fixtures, but `integration-ledger.md` must name the real implementation owner and evidence required.

## 8. Ownership must reconcile across stakeholders

A transfer/recovery success is not complete because one screen or transaction says success.

The same underlying booking must reconcile:
- provider: valid current holder and fulfilment state;
- previous holder: booking no longer usable + correct recovery outcome;
- next holder: normal usable booking + eligibility/check-in state.

If one perspective cannot be accounted for, the end-to-end product state is partial.

## 9. Provider policy is load-bearing, not interruptive

Provider rules are reusable policy, not a manual approval queue for each compliant recovery.

A compliant action can proceed only inside:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

If provider policy blocks or requires review, the product must fail closed. Do not ask provider staff to manually click approve for every normal recovery just to make the architecture visible.

## 10. Accessibility execution rules

For changed/new states:
- use native semantic controls where practical;
- provide visible keyboard focus;
- primary touch targets at least 44px;
- no status communicated by color alone;
- validation/error copy associates with the relevant control;
- disabled controls explain why when the reason is not obvious;
- focus order follows visual/task order;
- async state changes use readable text; do not rely only on spinners;
- destructive/reject/cancel actions are clearly named.

Product Reviewer accessibility PASS is a bounded review, not exhaustive WCAG certification.

## 11. Responsive execution rules

Full visual evidence remains mandatory at:
- desktop approximately `1440×1000`;
- mobile approximately `390×844`.

For new material states also add cheap assertions where practical at `360`, `430`, `768`, `1024` for:
- no horizontal document scroll;
- primary control visible/reachable;
- no critical text/control clipping;
- navigation does not collapse into mixed-audience clutter.

Do not multiply screenshot artifacts solely for breakpoint vanity; the two canonical widths remain the direct-review evidence set.

## 12. Copy review rules

Use `GLOSSARY.md` before writing customer copy.

Good copy is:
- specific to the booking/state;
- outcome-first;
- explicit about what changed and what did not;
- short enough to scan;
- free of protocol vocabulary until proof detail.

Avoid:
- `pass` when the customer object is a booking;
- generic `approval` when provider policy vs holder authorization could be confused;
- `failed` without consequence/recovery;
- `AI agent` as the hero when the user is trying to recover a booking;
- claims such as `verified`, `settled`, or `transferred` unless the current evidence/implementation state supports them.

## 13. Visual craft review

Before review, inspect the actual rendered state for:
- clipping and overflow;
- primary action hierarchy;
- excess dead space vs cramped density;
- card/radius/status consistency with Golden;
- mobile information order;
- sponsor/proof prominence;
- mixed customer/provider navigation;
- generic AI/SaaS dashboard patterns that obscure the booking task.

Memorability check: if the YourTurn logo vanished, the booking-first hierarchy, deep-slate decision surfaces, rounded customer actions, compact authority facts and quiet proof disclosure should still make the product recognizable.

## 14. Render/evidence gate

Every material executable UX change must:
1. pass the strongest available production build;
2. run the real Chromium journey;
3. capture every meaningful changed/adjacent state at canonical desktop/mobile widths;
4. upload `product-workbench-rendered-evidence` bound to the exact executable SHA;
5. receive direct Product Reviewer inspection of the PNGs before `GOLDEN-READY`.

A green compile/test with missing rendered evidence is not enough.

## 15. Integration boundary

Clickable/fixture states are product evidence, not automatically the production implementation owner.

Before wiring a Golden state, use `integration-ledger.md` to determine:
- UI owner;
- real backend/sponsor owner;
- current evidence class;
- interface replacing the fixture;
- required acceptance proof;
- failure/rollback behavior.

If the real sponsor interface cannot satisfy Golden without changing the user contract, record the precise mismatch for review. Do not silently mutate Golden and do not weaken backend/security semantics to fit a mock.
