# Demo story → executable test steps

This turns **`docs/DEMO-STORY.md`** (spoken narrative) into **steps you can click through and assert on**, while keeping the **canonical click order** in **`docs/DEMO.md`**.

Use **`docs/DEMO.md`** for bare step numbers; use **this file** when you want each **story beat** tied to **what to verify** in the UI.

**Setup:** env + Redis per `README.md`. Prefer **three browsers** (issuer, Person A, Person B) per `docs/DEMO.md`; one browser works if you sign out between actors.

---

## How to read the tables

- **Story beat** — section from `DEMO-STORY.md`.
- **Say (short)** — cue; full wording stays in `DEMO-STORY.md`.
- **Do** — route or control (aligns with `docs/DEMO.md` where noted).
- **Pass if** — observable outcome (manual or automation).

---

## Pitch arc (before or between clicks)

| Story beat | Say (short) | Do | Pass if |
|------------|-------------|-----|---------|
| 1. Problem | Messy fallback when someone can’t attend | Optional: stay on **`/`** or **`/login`** | You can point at product framing (no dedicated “problem” screen required). |
| 2. Current method | Booking is “just a calendar row” | Same | Narrator-only is fine; no failure mode. |
| 3. Solution | Booking becomes a pass under provider rules | Navigate to **`/login`** → **Demo issuer** → **`/issuer`** | Provider dashboard loads; session plan + live inventory visible. |
| 4. Why Hedera | Pass moves, verifiable, rules + audit | During book / resale / mark-used | Success UI or slot detail shows **tx id** or traceability where the app returns it (`DEMO.md` proof point). |

---

## Recommended framing (therapy hero + optional mentions)

| Story beat | Say (short) | Do | Pass if |
|------------|-------------|-----|---------|
| Hero scenario | “Therapy-style appointment in the live path” | On **`/issuer`**, read **Session 1–3** titles / **Upcoming sessions** | Copy matches **physio / therapy**-style plan (not only “generic class”) after **Save session plan** if you changed it. |
| Flexibility | “Same engine, studio / handstand class” | Optional: open **`/`** or **Brand lab** | You can truthfully say it’s the same product; **no requirement** that the minted rows say “handstand” unless you edited the plan. |
| Wow | “Premium / boat-day — issuer earns on resale too” | During **Person A** listing on **`/resale/[serial]`** | UI states **10%** (or current MVP) royalty / resale rules honestly; optional: list **above** primary price and narrate premium resale. |

---

## Suggested spoken structure → shipped flow (happy path)

Map the **Suggested spoken structure** in `DEMO-STORY.md` to **`docs/DEMO.md`** sections **A–E** (and optional **F**).

### Opening

| Say (short) | Do | Pass if |
|-------------|-----|---------|
| “Controlled, transferable pass.” | Optional: **`/`** then start login | Home loads; nav includes browse / passes / provider path as in current layout. |

### Problem → Current method → Solution

| Say (short) | Do | Pass if |
|-------------|-----|---------|
| (Problem / calendar row) | Narrate; then **Demo issuer** | **`/issuer`** loads (**DEMO.md** A.1–A.2). |

### Hero scenario (therapy)

| Say (short) | Do | Pass if |
|-------------|-----|---------|
| “Therapy-style in this demo.” | **Save session plan** (if you edited fields) → **Set up business** → **Create demo sessions** | **DEMO.md** A.3–A.6: **Live sessions** shows expected **AVAILABLE** rows (or you accept existing minted state if already set up). |

### Live proof: book → move → redeem (engine)

| Story idea (`DEMO-STORY` skins) | Do (`DEMO.md`) | Pass if |
|---------------------------------|----------------|---------|
| Person A holds the session | **B** Person A: **Demo user A**, **`/slots`**, **Book** | Success feedback; **DEMO.md** B.9–B.11. |
| Person A can’t attend → resells | **C** **Sell pass** / **`/resale/[serial]`**, confirm list | Listing succeeds; **DEMO.md** C.13–C.16. |
| Person B takes over | **D** **Demo user B**, **`/resale/[serial]`**, buy | Holder is **Person B** on **`/slots/[serial]`** and **`/issuer`**; **DEMO.md** D.17–D.22. |
| Provider controls redemption | **E** **Demo issuer**, **Check in / mark used** (typed ref) | **USED** (or equivalent) on guest **`/slots/[serial]`**; issuer table updated; **DEMO.md** E.23–E.26. |

### Flexibility (handstand / studio)

| Say (short) | Do | Pass if |
|-------------|-----|---------|
| “Same engine, different vertical.” | Optional mention only **or** edit session **Service** to a class title and **Save session plan** + **Create demo sessions** / fresh mint per `DEMO.md` | Your narration matches what is **actually shown** in the table (do not claim handstand if UI still says physio). |

### Wow (secondary economics)

| Say (short) | Do | Pass if |
|-------------|-----|---------|
| Issuer earns on primary + secondary | Point at **issuer dashboard** + **resale** copy | You’ve completed **Book** (primary) and **Resale** (secondary); economics match **`docs/ECONOMICS.md`** / on-screen **10%** line. |

### Hedera benefit

| Say (short) | Do | Pass if |
|-------------|-----|---------|
| Verifiable movement, rules, audit | After **book**, **resale-buy**, **mark-used** | User-visible **tx id** (or message) when returned; optional **HCS** mention only if you show topic / audit context on **slot detail** (`DEMO-STORY.md` / `DEMO.md` rules). |

---

## “What to highlight consciously” → quick assertions

| Highlight (`DEMO-STORY.md`) | Where to show it | Pass if |
|----------------------------|------------------|---------|
| Not just a calendar row — live pass | After **Book** | **`/slots/[serial]`** or **My passes** shows the booked pass with status/holder context. |
| Pass moves without losing control | After **Resale buy** | Issuer **Live sessions** shows **Person B**; movement happened under resale policy. |
| Business can pause movement | Optional **F3** | **Pause pass** → guest sees frozen/paused behaviour; **Reopen pass** restores (`DEMO.md` F). |
| Business earns on handoff | Resale path | Listing/purchase completes; narration matches **10%** MVP (`ECONOMICS.md`). |
| Business controls check-in | **Mark used** | Only issuer action closes lifecycle; guest shows **USED**. |
| Cannot use twice | After **USED** | Second **mark-used** or illegal **book** → **CONFLICT** or blocked UI (`DEMO.md` E.27). |

---

## “What not to overclaim” — tester guardrails

| Do not claim | Tester check |
|--------------|--------------|
| Full multi-tenant platform | Single demo issuer / seeded flows only. |
| Full wallet auth | Demo accounts / guest mapping only unless product changed. |
| Exact resale payout without proof | Treat preview as **approximate** until **`docs/TX-LOG.md`** / live tx verified (`DEMO-STORY.md`). |

---

## Optional full regression checklist (minimal)

1. **Issuer path:** `DEMO.md` A → live table sane.  
2. **F1:** `DEMO.md` B → A holds pass.  
3. **F2:** `DEMO.md` C + D → B holds pass.  
4. **F4:** `DEMO.md` E → USED + double-use guard.  
5. **F3 (optional):** `DEMO.md` F → pause/reopen.  

---

## Related docs

- `docs/DEMO-STORY.md` — full spoken script and skins.  
- `docs/DEMO.md` — operator click order and APIs.  
- `docs/UI-MAP.md` — routes and components.  
- `docs/ECONOMICS.md` — royalty and pricing narration.
