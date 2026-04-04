# Email login (planned) — Upstash Redis

**Owner:** Sebastian (chain / platform slice)  
**Status:** **Phase A shipped** — register/login/logout + Redis user records + signed session cookie (`br_session`). Hedera flows unchanged (Guest A/B actor selector).

## Goal

Add **user accounts with email** (sign-up + sign-in), persisting data in the **same KV store** already used by the app: **Upstash Redis** (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). No new database service for v1 of this feature.

## Relationship to the current demo

Today, **Guest A / Guest B** and **Issuer** are **env-based Hedera actors** (`HEDERA_GUEST_*`, `HEDERA_TREASURY_*`), not app users. Email auth is an **additional** layer:

- **Phase A (likely first):** Email login gates or labels the **browser session**; Hedera actions still use the **Actor** selector + server-side keys as today (demo safety).
- **Phase B (later, optional):** Map `userId` → linked Hedera account ids or wallet; out of scope until Phase A is stable.

The partner should assume **no breaking change** to slot/resale flows until an explicit PR removes or replaces the actor model.

## Implementation (Phase A — shipped)

- **Storage:** `bookedrights:user:id:{uuid}` → JSON user (includes `appRole`: **`issuer`** | **`user`**); `bookedrights:user:email:{normalized}` → user id. Older rows without `appRole` are treated as **`user`**, except the **demo issuer email** (`DEMO_ISSUER_EMAIL` or default) which maps to **`issuer`**.
- **Secrets:** `AUTH_SESSION_SECRET` (min **16** chars) for **production** / `next start`. **`npm run dev`** uses a **built-in dev-only fallback** if unset so local login works; set a real secret for deploy or to match teammates’ cookies.
- **Passwords:** Node **scrypt** (`lib/auth/password.ts`).
- **API:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/demo-login` `{ "role": "issuer" | "guestA" | "guestB" }` — **User A** and **User B** are separate Redis accounts, each locked to **Hedera Guest A** or **Guest B** (`hederaPersona` on the user row + session). Override with `DEMO_USER_A_*` / `DEMO_USER_B_*` (legacy `DEMO_GUEST_*` still maps to Guest A for old rows). Disable demo with `ENABLE_DEMO_LOGIN=false`.
- **Demo UX:** Header **Demo issuer** / **Demo user**; **Sign in** triple-click (within ~500ms) → issuer demo; `/login` has the same one-click buttons + triple-click the **Sign in** title for issuer.
- **UI:** `/login`, `/register`; header shows **Sign in / Register** or **Signed in … / Log out** (`SiteHeader` + async `RootLayout`). Header uses the **signed cookie only** (no Redis on every navigation) so pages are not blocked if KV is slow; `GET /api/auth/me` still checks Redis.
- **Role-gated pages (server layouts):** **`/issuer`** requires an **issuer** session; **`/slots`**, **`/my-bookings`**, **`/resale`** require a **user** session. Wrong role or logged out → redirect to `/login?need=issuer` or `?need=user` with an explanatory banner.
- **Guest Hedera APIs** (`/api/book`, `/api/associate`, `/api/resale-list`, `/api/resale-buy`) require a signed-in **guest app user** cookie; if `hederaPersona` is set (demo User A/B), the request `actor` must match (server-enforced).

## Coordination

- **Shared / product:** Header now includes auth links; further copy changes — review together.
- **Chain:** Hedera keys unchanged; **guest** book/resale/associate APIs require an app session and respect **User A / B** locks as above. Issuer **`/api/mark-used`** stays issuer-console only (no guest session required).

## Files touched

- `lib/auth/password.ts`, `lib/auth/session.ts`, `lib/auth/get-session.ts`, `lib/auth/app-role.ts`, `lib/auth/require-session-role.ts`
- `lib/store/users.ts`, `lib/store/redis.ts` (`REDIS_KEYS`)
- `app/api/auth/*`, `app/login/*`, `app/register/*`
- `app/layout.tsx` (`dynamic`, `getSessionUser`), `components/SiteHeader.tsx`

---

_Last updated: 2026-04-04._
