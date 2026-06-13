# Demo spoken script + where to click

**Purpose:** Read this aloud while demoing. Each block tells you **what to say** and **what to click** (or which browser to use).

**Canonical detail:** `docs/DEMO.md` (operator runbook) · **Pitch depth:** `docs/DEMO-STORY.md` · **Assertions:** `docs/DEMO-STORY-TEST-STEPS.md`

**Setup:** Prefer **three browsers** (or three profiles): **Demo issuer**, **Demo user A**, **Demo user B**. One browser works if you **sign out** between actors (slower, easier to mis-click).

**Product name on screen:** YourTurn (some older docs say “Booked Rights” for the concept).

---

## Before you touch the app (optional, 20–30 seconds)

**Say**

> “YourTurn turns a booked service slot into a controlled, transferable pass.  
> When someone can’t make a session, the usual fallback is calls, messages, and informal swaps — the business loses control.  
> Here the booking becomes a **pass**: it can move to another customer under **provider rules**, and the provider still does **check-in** so it can’t be used twice.”

**Click**

- Optional: open **`/`** (home) so people see the product, then move on.

---

## A — Issuer: prepare the demo (Browser 1: issuer)

**Say**

> “This is the provider dashboard — they set up sessions and keep oversight.”

**Click**

1. **`/login`** → button **Demo issuer** (App → Issuer console).  
2. You should land on **`/issuer`** (header: **Provider dashboard**).

**Say**

> “They shape the plan — we’ll use a therapy-style session in the story, even if the row labels are yoga or physio in the seed.”

**Click**

3. (Optional) Edit **Business name** and the three session cards (**Service**, **Starts**, **Ends**, **Location**, **Price**, **Resale**).  
4. **Save session plan**.  
5. **Set up business** (first-time / after reset).  
6. **Create demo sessions** (mints from the saved plan).  

**Check**

- **Live inventory snapshot**: expect **Bookable now** > 0.  
- **Live sessions** table: rows **AVAILABLE** where expected.

---

## B — Person A: book (Browser 2: User A)

**Say**

> “Person A books the slot — that’s the primary sale. The calendar row becomes a pass they hold.”

**Click**

7. **`/login`** → **Demo user A**.  
8. Land on **`/slots`**.  
9. On an **AVAILABLE** row: **Book** → review dialog → **Book this session**.

**Check**

- Success / feedback (tx id if shown).  
10. Open **`/my-bookings`** and/or **`/slots/[serial]`** (use the serial from the row you booked).

**Say**

> “They now hold the pass — we’ll use this same serial for resale.”

**Check (issuer)**

11. On **`/issuer`** (Browser 1): **Use this pass** / **Ref #** to that serial — **current holder** should show **Person A**.

**Note:** If **My passes** is empty right after booking, click **Refresh list** once (mirror lag).

---

## C — Person A: list for resale (still Browser 2: User A)

**Say**

> “Person A can’t make it — they list under issuer rules. Listing **is** the seller approval in this MVP. There’s a fixed **10%** provider fee on resale in the UI — we treat the preview as approximate until we verify the tx.”

**Click**

12. From **`/slots/[serial]`** → **Sell pass**, **or** go straight to **`/resale/[serial]`**.  
13. Set **Ask (ℏ)** if needed → **List this pass** → confirm in the review dialog.

**Check**

- Listing success message; **Active listing** state on resale page.  
14. **`/my-bookings`**: row should show **FOR_SALE** (or equivalent) for that serial.

---

## D — Person B: buy (Browser 3: User B)

**Say**

> “Person B takes over — buying the listing transfers the pass. No second seller approval after they click buy.”

**Click**

15. **`/login`** → **Demo user B**.  
16. Open **`/resale/[serial]`** (same serial as above).  
17. **Buy this pass** → confirm in the review dialog.

**Check**

- Success message; resale page reflects new holder where shown.  
18. **`/my-bookings`** as B: pass **HELD**.  
19. **`/slots/[serial]`** as B (or A’s browser refreshed): holder narrative should match **Person B**.

**Check (issuer)**

20. **`/issuer`**: same **Ref #** → **current holder: Person B**.

---

## E — Issuer: check-in / close (Browser 1: issuer)

**Say**

> “Only the provider closes the lifecycle — check-in burns the pass for reuse. That’s the redemption story, not housekeeping.”

**Click**

21. **`/issuer`**: select **Ref #** for the serial ( **Use this pass** on the row if needed).  
22. **Person** dropdown: match **Person B** (mirror holder).  
23. **Check in / mark used** → in the dialog, type the **ref number** exactly → confirm **Check in / mark used**.

**Check**

24. **Guest browser** (A or B): open **`/slots/[serial]`**.

**Say**

> “We need a **guest** session for this screen — the issuer account is blocked from customer routes by design.”

**Click**

- If you only have one machine: **Sign out** issuer → **Demo user A** (or B) → **`/slots/[serial]`**.

**Check**

- Status: **used / checked in / closed**; **Pass history** includes the final **USED** / provider check-in event.

**Say**

> “Optional proof: you can’t sell or use it again — the UI and API block that.”

**Click**

25. **`/resale/[serial]`** as guest: should be **read-only** / **pass closed** / cannot resell.

**Optional**

26. Second **mark-used** or illegal action → expect **CONFLICT** or disabled controls (`docs/DEMO.md` E.27).

---

## F — Optional: pause / reopen (Browser 1 + guest)

**Say**

> “The provider can also pause movement — freeze — then reopen when ready.”

**Click**

- **`/issuer`**: **Pause or reopen a pass** — **Ref #** + **Person** must match **current holder**.  
- **Pause pass** (confirm dialog) → guest sees paused/frozen on **`/slots/[serial]`** or **My passes**.  
- **Reopen pass** (one step).

---

## Closing line (Hedera, plain English)

**Say**

> “Hedera gives us a transferable pass, visible moves, fee behaviour at the asset layer, and an audit trail — without Solidity in this MVP. We’re not saying ‘because blockchain’; we’re saying the business keeps rules while the pass can move.”

---

## Quick reminder — do not overclaim

- MVP engine, not full multi-tenant SaaS.  
- Demo app auth, not full wallet login for everyone.  
- Resale **preview** vs final amounts — honest until **`docs/TX-LOG.md`** proof.

---

## Related

- `docs/DEMO.md` — numbered steps and API names  
- `docs/DEMO-STORY.md` — full narrative and skins (therapy / studio / premium)  
- `docs/UI-MAP.md` — routes and components
