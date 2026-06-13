# Exploratory test session — manual browser pass

**Date:** 2026-04-04  
**Environment:** Local `http://localhost:3000` (Next dev).  
**Method:** Manual route walk as **Person A**, **Person B**, and **Provider**.  
**Companion:** `docs/FULL-TEST-COVERAGE.md` for route/API inventory.  
**Deep consolidation (auth matrix, edge cases, automation caveats):** `docs/internal/BROWSER-AUDIT-CONSOLIDATED.md`

This file is for the **experience-level pass**: does the app make sense on screen, and does the copy line up with what the actions actually do?

---

## Confirmed working

- Global chrome: **YourTurn**, **Browse**, **My passes**, **Provider dashboard**
- Home route: customer app vs provider dashboard split is clear
- Browse route: Person A / Person B switcher, booking CTA, detail links
- Pass hub: active holdings and resale entry points
- Resale route: seller/buyer handoff language, ask input, buy CTA
- Provider route: setup, session table, pause/reopen, check-in / mark used
- Invalid session refs: `/slots/99999` now shows **Session not found** instead of a fake bookable session

---

## Remaining UX caveats

- The provider dashboard is still dense because setup, lifecycle controls, and state review all live on one screen.
- `Recently finished` on **My passes** is now honestly labelled as shared demo history, but it is still not personal history.
- Resale discovery is still link/serial based; there is no marketplace browse surface yet.
- The optional proof/audit sections are still more technical than the customer-facing parts of the app.

---

## Suggested repeat pass

1. Start on `/`
2. Browse as Person A on `/slots`
3. Open `/my-bookings`
4. Open `/resale/[serial]`
5. Open `/issuer`
6. Check one invalid detail URL (`/slots/99999`)
7. Cross-check with `docs/DEMO.md`

If route/API confidence is the question instead of UX, use `docs/FULL-TEST-COVERAGE.md`.
