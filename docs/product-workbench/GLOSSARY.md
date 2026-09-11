# YourTurn Domain Glossary

Use these terms across holder, acquirer and provider product surfaces. Customer-facing wording is preferred unless a reviewer/proof surface explicitly needs the technical term.

## Booking
**Meaning:** the customer's usable right to attend or consume a specific service/session.

**Customer wording:** `booking`, `your booking`, `Friday Yoga`.

**Avoid:** `pass`, `NFT`, `token`, `serial`, `asset` as the primary customer object.

Technical identifiers may appear in proof detail only when they help verification.

## Provider
**Meaning:** the business that creates and fulfils the service and defines reusable rules for its bookings.

**Customer wording:** `provider`, or the business name such as `Studio A`.

**Avoid:** `issuer` in normal product copy unless discussing a protocol/technical role in reviewer evidence.

## Current holder
**Meaning:** the customer who currently owns/controls the usable booking before transfer or recovery. In the Golden hero this is Maya.

**Customer wording:** usually `you`; use `current holder` only in explanatory/admin contexts.

**Avoid:** `seller` when the user's action may be broader than a direct resale, and avoid account IDs as identity.

## Acquirer / next holder
**Meaning:** the eligible customer who obtains the released booking and becomes its new normal holder. In the hero continuation this is Bob.

**Customer wording:** `new holder`, `next customer`, or simply the person's normal booking context. Use `acquirer` primarily in product architecture and implementation documents.

**Avoid:** `buyer wallet`, `receiver account`, `NFT recipient` in customer copy.

## Provider rule
**Meaning:** a reusable business constraint defined before an individual recovery: whether transfer/recovery is allowed, cutoff, eligibility, cancellation, pricing/fees and related service conditions.

**Customer wording:** `Studio A allows this booking to be transferred until …`, `Provider rules` where a heading is useful.

**Avoid:** generic `approval` if it could be confused with holder authorization; `provider approval` if no per-recovery manual approval is required.

## Holder mandate / Recovery Mandate
**Meaning:** the holder's booking-scoped authorization defining what YourTurn may do, for how much, until when, and what it may not do.

**Customer wording:** `your recovery rules`, `what YourTurn may do`, `recovery authorization` when a formal label is needed.

**Proof/reviewer wording:** `Recovery Mandate` is the canonical formal term.

**Avoid:** `wallet permission`, `account-wide permission`, `agent access`, generic `approval` without naming what is being approved.

## Recovery
**Meaning:** YourTurn finds and completes a permitted outcome for a booking the current holder cannot use, inside provider rules and holder authority.

**Customer wording:** `recovery`, `let YourTurn handle it`, `recover value`.

**Avoid:** `liquidation`, `token sale`, `agent trade`.

## Recovery value
**Meaning:** the value returned to the current holder when recovery succeeds.

**Customer wording:** `You recovered 45 USDC`, `minimum recovery 40 USDC`.

**Avoid:** `settlement atomic units` or raw token precision outside proof detail.

## Minimum recovery
**Meaning:** the lowest recovery amount the holder has authorized YourTurn to accept, subject also to provider/acquirer constraints.

**Customer wording:** `Minimum 40 USDC`, `40 USDC or more`.

**Avoid:** `floor`, `slippage`, `minOut` unless a technical proof specifically requires it.

## Transfer
**Meaning:** the authoritative booking holder changes from the current holder to the eligible next holder while the booking remains valid.

**Customer wording:** `Transferred`, `This booking is now in Bob's bookings`.

**Avoid:** `NFT transfer` in the main product journey.

## Recovery active
**Meaning:** a valid holder mandate exists and YourTurn may act autonomously inside its current limits.

**Customer wording:** `Recovery active` plus the active minimum, expiry, booking scope and forbidden actions.

**Avoid:** `agent running` without showing the authority boundary.

## Needs your approval
**Meaning:** the requested action is outside current holder authority and requires a new authorization before YourTurn may proceed.

**Customer wording:** `Needs your approval`, `Authorize new limits`.

**Avoid:** implying the existing mandate changed before approval succeeds.

## Exact delegated agent
**Meaning:** the specific agent identity bound to the holder's authorized recovery, not any arbitrary agent.

**Customer wording:** `Exact delegated agent verified`, `Human-backed`.

**Avoid:** raw World human identifiers, private AgentBook identifiers, wallet addresses as the trust headline.

## Human-backed
**Meaning:** the product has a privacy-safe trust signal that the exact delegated agent is backed by a verified human under the relevant World verification path.

**Customer wording:** `Human-backed`.

**Avoid:** `World ID user 0x…`, raw human IDs, or claims that World establishes booking ownership/provider entitlement.

## Ledger authorization
**Meaning:** the holder authorizes the off-chain Recovery Mandate at the Ledger trust boundary.

**Customer wording:** `Approve on your Ledger`, `Review your recovery rules on your Ledger`.

**Avoid:** `Ledger signs the Hedera transfer`, `Ledger approves HTS`, or language implying a rejected/cancelled ceremony created authority.

## Offer blocked
**Meaning:** an offer cannot proceed under the current intersection of rules/authority/eligibility.

**Customer wording:** state the reason first, e.g. `Not accepted — below your 40 USDC minimum`, followed by the consequence `No booking transfer. No settlement.`

**Avoid:** generic `transaction failed` for a deliberate policy block.

## Eligible
**Meaning:** the next holder satisfies the provider-defined conditions for receiving/using the booking.

**Customer wording:** `Eligible for this booking`, then explain any relevant requirement.

**Avoid:** unexplained `policy pass` or protocol-level eligibility codes in primary UI.

## Proof / evidence
**Meaning:** inspectable information showing how an important product result was established.

**Customer wording:** `View technical proof`, `How this happened`.

**Evidence labels:** `LIVE`, `TESTNET`, `CI`, `LOCAL`, `CONFIGURED`, `SIMULATED`, `RESEARCH`, and `FIXTURE` in the Product Workbench where applicable.

**Avoid:** upgrading an evidence class through optimistic copy or styling.

## Fixture
**Meaning:** a product/workbench state transition used to lock UX behavior before the real implementation owner is wired.

**Customer wording:** normally none; keep this classification in reviewer/proof surfaces.

**Avoid:** presenting fixture state as LIVE, TESTNET execution, or production truth.

## Golden
**Meaning:** a product behavior/presentation contract bound to an exact executable candidate after direct review and explicit human freeze approval.

**Internal wording only.**

**Avoid:** treating Golden as proof that sponsor-dependent fixtures are already integrated or LIVE.

## Core permission sentence

Use this architecture rule consistently in product/implementation documents:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Customer copy should translate the intersection into the concrete reason an action is allowed or blocked rather than displaying the formula.
