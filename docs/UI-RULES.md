# UI rules

Lightweight defaults for building **YourTurn** without turning the UI into a demo harness, a blockchain explainer, or a rigid design prison.

Use this with:

- `docs/UI-MAP.md` for route / component / API wiring
- `docs/DEMO.md` for the shipped walkthrough
- `docs/BRAND-UI.md` for **tokens**, **calendar + turn** mark usage, glass surfaces, and rollout checklist
- Local persona notes under `docs/internal/` (gitignored) if you maintain them

These are **defaults**, not hard laws. If breaking one improves the shipped product, do it intentionally and explain why in the PR or issue.

## 1. Product language first

### Default

- Use **YourTurn** as the visible product name.
- Prefer customer language:
  - session
  - booking
  - pass
  - provider
  - status
  - next step
- Keep chain language secondary:
  - HTS
  - HCS
  - Mirror
  - serial
  - treasury
  - burn

### Why

The app should feel familiar to people who know booking apps, ticket transfer, and wallet-style passes. The blockchain model matters, but it should not be the first thing a user has to decode.

### When to break it

- Technical proof screens
- provider or operator tooling
- judge-facing proof moments where the underlying mechanism is the point

## 2. Customer and provider surfaces should feel different

### Default

Customer-facing routes should focus on:

- finding a session
- booking it
- holding the pass
- moving it when allowed
- understanding current status

Provider-facing routes can focus on:

- preparing inventory
- freezing or unfreezing
- marking used
- resets and proof support

### Why

The front of the product should feel simple. Provider controls are necessary, but they should not dominate customer-facing screens.

### When to break it

If a provider control directly improves a live customer flow and does not add confusion, it can appear outside `/issuer`. Keep it narrow and obvious.

## 3. Every screen needs one clear job

### Default

Each route should have one primary job:

- `/` = explain the product and where to start
- `/slots` = browse and book
- `/slots/[serial]` = understand one booking right
- `/my-bookings` = manage what I currently hold
- `/resale/[serial]` = list or buy under policy
- `/issuer` = operate the demo safely

Every screen should make these obvious:

- current state
- next action
- primary CTA
- blocked reason when action is unavailable

### Why

Hackathon apps get noisy fast. One screen doing three jobs usually means nothing feels finished.

### When to break it

Sometimes a small screen can carry one secondary supporting function if it reduces navigation friction. Do not add a second “main” purpose casually.

## 4. Proof is important, but secondary

### Default

- Show user value and state first
- show proof links second
- hide raw implementation details behind secondary UI when possible

Good order:

1. status
2. what happens next
3. proof link
4. raw chain detail

### Why

Judges need proof. Users need confidence and clarity. Those are related, but not the same thing.

### When to break it

If the page exists specifically to prove a technical claim, lead with proof there.

## 5. Avoid internal instructions in primary UI

### Default

Do not lead customer-facing surfaces with:

- demo order
- must-ship criteria
- internal track language
- actor labels like `guestA` / `guestB`
- setup instructions

Keep that material in:

- `/issuer`
- docs
- PR notes
- optional debug or proof UI

### Why

Internal instructions help builders, but they make the product feel fake when they leak into the customer path.

### When to break it

If a small inline note prevents a real user mistake in the current demo, keep it concise and product-worded.

## 6. Prefer consistency over novelty

### Default

- Reuse status badge treatments across screens
- reuse tone and CTA hierarchy
- reuse the same names for the same state
- keep spacing and card structure coherent

### Why

Consistency makes the MVP feel more trustworthy than a pile of one-off “nice” sections.

### When to break it

Break consistency if a specific page has a stronger metaphor or visual job and the difference is intentional, not accidental.

## 7. Build quality bar for UI changes

Before merging a meaningful UI change, check:

- Does this feel more like a product and less like a harness?
- Is the primary action obvious?
- Is the current state obvious?
- Is internal/demo language out of the first read?
- Does it still match `docs/UI-MAP.md` and `docs/DEMO.md` if flow changed?
- Is it safe on mobile and desktop?

## 8. Rule of thumb

If you are unsure, prefer:

- **Calendly / Cal.com** clarity for booking
- **Eventbrite / Dice** language for transfer and resale
- **wallet pass** clarity for what the user holds

Do **not** let generic SaaS admin UI or chain-debug language define the product experience.
