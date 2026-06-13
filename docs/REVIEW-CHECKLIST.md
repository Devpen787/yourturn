# Master review checklist (Booked Rights / YourTurn)

**Purpose:** One place to review product completeness, **who sees what when**, shipped vs missing behaviour, docs, and demo readiness. Use before a **PR**, **internal review**, **dry-run demo**, or **submission**.

**Suggested review order:** run **`docs/DEMO.md`** once end to end, then step through this file as the shared review doc for the meeting.

**Maintenance:** When behaviour changes, update **`docs/UI-MAP.md`** and **`docs/DEMO.md`** first; then adjust **checkbox wording** in this file if a section is no longer accurate.

**Related (detail, not duplicated here):** `docs/UI-MAP.md`, `docs/PAGE-OVERVIEW.md` (per-page controls + copy + clarity), `docs/FULL-TEST-COVERAGE.md` (route + API inventory), `docs/EXPLORATORY-TEST-SESSION.md` (manual browser pass), `docs/DEMO.md`, `docs/PERSONAS-EXPECTATIONS.md`, `docs/SPEC.md`, `docs/TASKS.md`, `docs/TX-LOG.md`, `docs/SCORECARD.md` (dated 1–5 scores), `docs/UI-RULES.md` (if present).

---

## 1. Scope: shipped vs not (sanity)

- [ ] **F1** primary booking is available in UI and backed by `POST /api/book`.
- [ ] **F2** resale (list + buy) is available and backed by `POST /api/resale-list` / `POST /api/resale-buy`.
- [ ] **F4** mark used is available from issuer UI and backed by `POST /api/mark-used`.
- [ ] **F3** freeze / unfreeze is available from issuer UI (optional demo path).
- [ ] **F7** cancel / refund is available only through the bounded Concierge release/refund path or agent API; scheduled refund/release remains deferred.
- [ ] **Gift / transfer** (non-resale peer transfer) is **not** a separate shipped path — only resale is wired; narrative matches that.
- [ ] **Listing marketplace** (browse all listings) is **not** shipped — access by serial / links only; narrative matches that.

---

## 2. Environment and operator (local / deploy)

- [ ] `.env.local` (or deployment env) has **non-empty** `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Upstash).
- [ ] All **`HEDERA_*`** pairs required by `lib/hedera/client.ts` are set (operator, treasury, fee collector, guest A/B).
- [ ] **Private keys** are never committed, pasted in issues, or shown in UI.
- [ ] After env changes, **Next.js dev server was restarted** so `process.env` reloads.
- [ ] **`POST /api/init`** succeeds when Redis + Hedera are configured.
- [ ] **`POST /api/mint-slots`** succeeds (or intentionally skipped if reusing seeded state).

---

## 3. Progressive disclosure and navigation (what users see, when)

*Target: customers should not be overloaded; issuer tools should not look like a default consumer path.*

- [ ] **Marketing home** (`/`) explains value and points to book / hub without exposing secrets or Redis errors.
- [ ] **Global nav** is acceptable for current audience (e.g. **Provider console** visible to everyone is a **known demo trade-off**; document if you hide it later).
- [ ] **Issuer console** (`/issuer`) is understandable as **operator-heavy**; consider future: collapse init/mint after setup, or move **Reset** behind a clear “danger” pattern.
- [ ] **Guest** paths (`/slots`, `/my-bookings`, `/slots/[serial]`) do not require issuer steps to **view** catalogue or hub (beyond “token not initialised” messaging).
- [ ] **Resale** (`/resale/[serial]`) is reached when relevant (detail page, hub, or URL) — not confused with primary book.
- [ ] **Status copy** (AVAILABLE / HELD / FROZEN / USED) is consistent across list, detail, and hub where shown.
- [ ] **Royalty / fee** copy on resale matches README / spec (e.g. 10% HTS custom fee story).

---

## 4. Issuer — see, do, expect

### Should see

- [ ] Token id, topic id, mirror existence hint, seeded slot count on `/issuer`.
- [ ] Table: serial, title, status, holder, active listing flag.
- [ ] Freeze section: selected serial, status, holder; disabled or warned when holder is not a demo guest.
- [ ] Mark-used section with serial context.
- [ ] Clear success / error feedback after actions.

### Should do (happy path)

- [ ] **Initialize** (token + topic in Redis).
- [ ] **Mint demo slots**.
- [ ] **Select serial** from table for freeze / burn where applicable.
- [ ] **Freeze / unfreeze** with `holderActor` matching Mirror holder (expect **409** if wrong).
- [ ] **Mark used** to close lifecycle.

### Should expect

- [ ] Holder truth aligns with **Mirror / HTS**, not Redis alone.
- [ ] **No in-app policy editor** in MVP (seeded policy only).
- [ ] **Reset demo** affects shared Redis if env is shared — team coordination.

---

## 5. Primary buyer (guestA / guestB)

### Should see

- [ ] `/slots`: sessions, price, time window, status.
- [ ] Actor selector; booking disabled or clearly wrong if **issuer** selected where book applies.
- [ ] Post-book confirmation including **tx id** when API returns it.
- [ ] `/slots/[serial]`: status, holder, policy hints, proof links, optional HCS lines for serial.
- [ ] `/my-bookings`: holdings for **selected** guest account; links to detail and resale when allowed.

### Should do

- [ ] Book only **AVAILABLE** serial.
- [ ] Refresh or revisit after Mirror lag if state looks stale.

### Should expect

- [ ] No real wallet login — demo **actor** only.
- [ ] No **F7** refund UI.

---

## 6. Holder selling (resale lister)

- [ ] `/resale/[serial]` shows the ask, royalty story, and listing state without overstating seller proceeds.
- [ ] **Create listing** only as **current holder** (guestA / guestB).
- [ ] **Frozen** or disallowed resale is reflected in UI / API errors, not silent failure.

---

## 7. Secondary buyer

- [ ] **Buy** on `/resale/[serial]` as buyer guest; tx id when returned.
- [ ] No global discovery — intentional; links or serial URL only.
- [ ] Holder change visible after refresh on hub / detail.

---

## 8. End-to-end demo script (matches shipped UI)

Walk **`docs/DEMO.md`** step-by-step once:

- [ ] Issuer: Initialize → Mint demo slots.
- [ ] Guest: Book on `/slots`.
- [ ] Optional: slot detail + HashScan / topic links if showing proof story.
- [ ] Holder: List on `/resale/[serial]`; other guest: Buy.
- [ ] Issuer: Mark used (and optional freeze / unfreeze).
- [ ] Final states visible (USED, holder, copy).

---

## 9. Documentation and proof

- [ ] **`docs/UI-MAP.md`** matches current routes and browser-called APIs.
- [ ] **`docs/DEMO.md`** matches the script you actually run.
- [ ] **`docs/TX-LOG.md`**: real testnet **tx ids** and HashScan lines for F1 / F2 / F3 / F4 when claiming chain proof (replace `_TBD_` as you run flows).
- [ ] **`docs/PERSONAS-EXPECTATIONS.md`** still true for major personas (or update it after scope change).
- [ ] Submission / README links (Vercel URL, ids) filled when required by your programme.

---

## 10. Security and demo trust model

- [ ] Team understands: **`actor` in JSON is not end-user auth**; server maps to env keys.
- [ ] Sensitive enforcement (e.g. freeze vs Mirror holder) lives in **API routes**, not only in UI.
- [ ] **Public deployment:** operator routes (`/api/init`, mint, reset-demo, …) are **not** treated as safe without extra gates (secret header, env-only, deployment protection, etc.).

---

## 11. Known gaps registry (quick scan)

Tick **N/A** when fixed; leave unchecked to track debt.

- [ ] F7 cancel / refund (UI + API).
- [ ] Explicit **transfer / gift** path (non-resale).
- [ ] Resale **marketplace** / discovery.
- [ ] **Rebook** flow.
- [ ] **Agent** layer (per `docs/TASKS.md` deferral).
- [ ] **BookingPort** abstraction (per `docs/TASKS.md`).
- [ ] Nav / layout: hide or demote **Provider console** for production-style UX (if desired).

---

## 12. Post-review actions

- [ ] Note any unchecked items in **`docs/TASKS.md`** or an issue.
- [ ] If routes/APIs changed, PR description mentions **`docs/UI-MAP.md`** update (per **`AGENTS.md`**).
