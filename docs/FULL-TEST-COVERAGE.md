# Full test coverage report — routes and APIs

**Date:** 2026-04-04  
**Environment:** Local `http://localhost:3000` on Next dev after a clean restart.  
**Methods:** `curl` for all page routes and all non-destructive or low-risk API handlers; light UI render check through page responses.  
**Not used:** Playwright, automated E2E suite, production deploy.

This document answers **“did we hit every surface?”** at the route and handler level. It does **not** claim every business-state permutation was exercised.

If Next dev starts failing with missing chunk errors from `.next/server`, restart with a clean cache before repeating this pass:

```bash
npm run dev:clean
```

**Related:** `docs/REVIEW-CHECKLIST.md`, `docs/EXPLORATORY-TEST-SESSION.md`, `docs/DEMO.md`.

---

## 1. App pages (`app/**/page.tsx`)

| Route | Result | Notes |
|-------|--------|-------|
| `/` | **200** | Home renders. |
| `/slots` | **200** | Browse list renders. |
| `/my-bookings` | **200** | Pass hub renders. |
| `/issuer` | **200** | Provider dashboard renders. |
| `/slots/34` | **200** | Known live session detail renders. |
| `/resale/34` | **200** | Resale page renders. |
| `/slots/99999` | **200** | Returns an explicit **Session not found** in-app state, not a fake live session. |
| `/nope-route-xyz` | **404** | Next not-found route. |

**Total page modules in tree:** 6  
**Coverage:** all 6 page modules were requested successfully.

---

## 2. API routes (`app/api/**/route.ts`)

| API | Case run | Result |
|-----|----------|--------|
| `POST /api/init` | `{}` | **200** `ok: true`, existing token/topic reused |
| `POST /api/mint-slots` | `{"reseed":false}` | **200** `minted: false`, existing serials returned |
| `POST /api/reset-demo` | Not run | **Skipped intentionally** because it mutates shared demo state |
| `POST /api/book` | `{}` | **400** validation error |
| `POST /api/resale-list` | `{}` | **400** validation error |
| `POST /api/resale-buy` | `{"actor":"guestA","serial":34}` | **404** `No active listing for this serial` |
| `POST /api/freeze` | `{"serial":34,"holderActor":"guestA"}` | **404** `Serial not found or already burned` |
| `POST /api/unfreeze` | `{"serial":34,"holderActor":"guestA"}` | **404** `Serial not found or already burned` |
| `POST /api/mark-used` | `{"serial":999}` | **500** `HEDERA_TX_ERROR` with invalid NFT id from chain |
| `POST /api/associate` | `{"actor":"guestA"}` | **200** `associated: false` (already associated) |
| `GET /api/mirror` | no `action` | **400** `Missing action` |
| `POST /api/agent/read` | `{"action":"listSlots"}` | **200** with chain-enriched slot rows |
| `POST /api/agent/preview` | bad serial `999` | **404** `Unknown serial` |
| `POST /api/agent/confirm` | bogus preview/grant | **400** `Invalid preview token` |
| `POST /api/agent/approval-grant` | no secret header | **400** `Missing x-booked-rights-approval-secret` |

**Total route modules in tree:** 15  
**Coverage:** 14 of 15 route modules exercised. The only skipped handler was `POST /api/reset-demo`, because it mutates shared demo state.

---

## 3. What this coverage means

| Layer | Coverage this pass |
|-------|--------------------|
| Every app `page.tsx` | **Yes** |
| Every API route module | **14/15** |
| Every destructive route | **No** — `reset-demo` intentionally skipped |
| Every business-state permutation | **No** |
| Every browser interaction | **No** — see exploratory report |
| Production/Vercel runtime | **No** |

---

## 4. Remaining gaps to close manually

1. Run `POST /api/reset-demo` during a deliberate clean-state pass, then re-run the happy path.
2. Spot-check additional `GET /api/mirror` actions with real ids when debugging proof details.
3. Spot-check `POST /api/agent/read` branches like `getSlot`, `getListing`, and `getLifecycle` if the agent surface is in active use.
4. Run the full browser-level F1 → F2 → F4 walkthrough from `docs/DEMO.md` after any major UX or chain changes.

---

## 5. Re-run snippets

```bash
# Pages
for p in / /slots /my-bookings /issuer /slots/34 /resale/34 /slots/99999 /nope-route-xyz; do
  curl -sS -o /dev/null -w "$p %{http_code}\n" "http://localhost:3000$p"
done

# Representative API probes
curl -s -X POST http://localhost:3000/api/init -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/mint-slots -H 'Content-Type: application/json' -d '{"reseed":false}'
curl -s -X POST http://localhost:3000/api/book -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/resale-list -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/resale-buy -H 'Content-Type: application/json' -d '{"actor":"guestA","serial":34}'
curl -s -X POST http://localhost:3000/api/freeze -H 'Content-Type: application/json' -d '{"serial":34,"holderActor":"guestA"}'
curl -s -X POST http://localhost:3000/api/unfreeze -H 'Content-Type: application/json' -d '{"serial":34,"holderActor":"guestA"}'
curl -s -X POST http://localhost:3000/api/mark-used -H 'Content-Type: application/json' -d '{"serial":999}'
curl -s -X POST http://localhost:3000/api/associate -H 'Content-Type: application/json' -d '{"actor":"guestA"}'
curl -s http://localhost:3000/api/mirror
curl -s -X POST http://localhost:3000/api/agent/read -H 'Content-Type: application/json' -d '{"action":"listSlots"}'
curl -s -X POST http://localhost:3000/api/agent/preview -H 'Content-Type: application/json' -d '{"action":"book","buyer":{"kind":"demoActor","id":"guestA"},"serial":999}'
curl -s -X POST http://localhost:3000/api/agent/confirm -H 'Content-Type: application/json' -d '{"previewId":"bogus","approvalGrant":"bogus"}'
curl -s -X POST http://localhost:3000/api/agent/approval-grant -H 'Content-Type: application/json' -d '{"scope":{"action":"book","actor":{"kind":"demoActor","id":"guestA"},"serial":34,"expiresAt":"2030-01-01T00:00:00.000Z"}}'
```
