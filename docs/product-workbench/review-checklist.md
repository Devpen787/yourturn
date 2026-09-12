# Product Review Checklist

Use this gate for each candidate journey before calling it Golden.

## Customer comprehension
- Can a non-crypto user explain the situation and next action?
- Is the primary object a booking, not blockchain plumbing?
- Is the value proposition visible before technical proof?

## Journey continuity
- Does the journey have a clear entry state?
- Does every primary action produce an understandable next state?
- Does the exit state connect naturally to the next journey?
- Are there dead ends, unexplained demo shortcuts, or screens that exist only to trigger a sponsor feature?

## Authority clarity
- Does the user know exactly what is being delegated?
- Are minimum recovery, expiry and forbidden actions understandable?
- Is the boundary between autonomous action and human re-approval explicit?

## Sponsor fit
- Ledger: is human authorization visible at the right risk boundary without turning the journey into a wallet demo?
- World: is the exact delegated human-backed agent meaningful to the product decision?
- Hedera: does authority + transfer + settlement change the actual booking state and customer outcome?

## Proof truth
- Can a reviewer inspect technical evidence without cluttering the core journey?
- Are LIVE/TESTNET/CI/LOCAL/CONFIGURED/SIMULATED/RESEARCH labels truthful?
- Is any sponsor name being used to imply more than the implementation proves?

## End-to-end outcome
- If the flow claims success, has Alice actually lost the booking?
- Has Alice actually received the promised recovery value?
- Can Bob see the transferred booking as usable?
- Can both parties understand what happened afterward?

## UX consistency
- Does navigation match prior Golden journeys?
- Does booking-card anatomy remain stable?
- Are statuses drawn from the shared vocabulary?
- Are money, dates, errors and confirmation patterns consistent?
- Is the flow credible at laptop demo width and mobile width?

## Rendered visual QA — required
A passing build is not visual approval. Every reviewable candidate must be rendered in a real browser and captured at both desktop and mobile widths.

Required evidence for the active journey:
- desktop render at approximately `1440×1000`;
- mobile render at approximately `390×844`;
- screenshots at each meaningful state/transition, not just the first and last screen;
- screenshots must be bound to the exact candidate SHA being reviewed;
- the automated rendered-journey check must pass before `GOLDEN-READY`.

The Product Reviewer must inspect the actual PNG evidence, not just the workflow's green status, and explicitly look for:
- clipping, overflow, hidden controls, truncation and broken responsive stacking;
- weak hierarchy, excessive whitespace, cramped density or visually unbalanced columns;
- unclear primary/secondary actions and controls that do not look interactive;
- inconsistent spacing, type scale, card anatomy, status treatment or navigation across states;
- prototype/workbench/debug chrome leaking into the customer experience;
- sponsor terminology or technical proof becoming more visually prominent than the customer outcome;
- mobile flows that become unreasonably long or reorder information badly;
- desktop layouts with dead space or panels that visually overpower the core task;
- a visual identity that regresses from the strongest existing YourTurn language.

If the reviewer cannot inspect the actual rendered images for the exact candidate, it may still classify semantic/interaction quality, but it must not advance the candidate to `GOLDEN-READY` on visual grounds.

Current automation contract: `.github/workflows/product-workbench-visual.yml` launches the production build, exercises `/product-preview` in Chromium, and uploads `product-workbench-rendered-evidence`. `scripts/product-workbench-visual-check.mjs` captures the journey states and enforces core rendered assertions.

## Freeze decision

The independent reviewer may classify a candidate `GOLDEN-READY`, but may not freeze it.

A journey becomes `Golden` only after:
1. the flow is understandable, connected and implementable without redesign;
2. build/render/relevant interaction evidence is acceptable;
3. the reviewer has inspected the exact desktop/mobile screenshot evidence and marks the exact candidate `GOLDEN-READY`; and
4. Devinson explicitly approves that candidate for freeze.

Until that explicit approval is recorded, keep it `candidate` or `review` even if it is technically ready. Do not create a second competing canonical version.
