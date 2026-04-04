# Product scorecard (Booked Rights / YourTurn)

**Last scored:** 2026-04-05  
**Basis:** shipped code + docs; scales are **1–5** (5 = strong for stated scope).

**Re-score when:** `docs/TX-LOG.md` or submission proof changes materially, or after major UX/nav / public deployment hardening — update this file and bump the date.

**Use with:** `docs/REVIEW-CHECKLIST.md` (tick boxes), `docs/UI-MAP.md`, `docs/DEMO.md`.

---

## Scores

| Area | Score | Notes |
|------|-------|--------|
| Must-ship flows (F1, F2, F4) | **4.5** | UI + APIs wired; minor polish / Mirror lag UX only. |
| Strong next (F3 freeze) | **4.5** | Issuer UI + APIs; server checks holder vs Mirror. |
| Honest scope vs `docs/SPEC.md` | **4.0** | F7, gift/transfer, marketplace not shipped — fine if narrative matches; docs support that. |
| Issuer experience (capabilities) | **4.0** | Init, mint, reset, table, freeze, burn; one dense page. |
| Guest / buyer / seller journeys | **3.5** | Browse → book → hub → detail → resale; no listing discovery, no F7, demo actor only. |
| Progressive disclosure | **2.5** | Provider console in global nav for everyone; issuer console shows all controls at once — known demo trade-off. |
| Documentation & reviewability | **4.5** | UI-MAP, DEMO, PERSONAS, REVIEW-CHECKLIST, AGENTS links. |
| Chain proof package (judges / submission) | **4.5** | `docs/TX-LOG.md` has F1/F2/F3/F4 rows with tx ids + HashScan + resource table; optional F7 row still TBD. |
| Security / public-deploy readiness | **2.0** | Appropriate for local / trusted demo; operator APIs + demo `actor` need gates + auth for production. |
| Maintainability (code shape) | **3.5** | Clear `lib/` + API split; some client duplication and large panels. |

---

## Summary

| Lens | Approx. overall |
|------|------------------|
| **Hedera hack MVP** (flows + docs + proof) | **~4.0–4.5 / 5** |
| **Shipped demo / checklist pass** | **~4.0 / 5** |
| **Submission-ready** (proof story) | **~4.0 / 5** — TX-LOG backs claims; finish any programme-specific README / `docs/SUBMISSION.md` links if required. |
| **Production product** | **~2.5 / 5** — progressive disclosure + operator API auth + real accounts still open. |

---

## Method

Scores are judgement calls from architecture review, `docs/REVIEW-CHECKLIST.md`, and known gaps (F7, transfer path, marketplace). They are **not** automated metrics.

When re-scoring, adjust the table above and add a line under **Changelog** below.

---

## Changelog

- **2026-04-05:** Re-scored after `docs/TX-LOG.md` filled with F1/F2/F3/F4 testnet proof rows and HashScan links; chain proof **2.0 → 4.5**; split “submission-ready” vs “production product” in summary.
- **2026-04-04:** Initial scorecard (conversation baseline).
