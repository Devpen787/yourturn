# Security notes

Short trust-model and hardening notes for the current **YourTurn / Booked Rights** hack app.

This is not a production security spec. It explains what is intentionally demo-grade today, what is risky if the app is exposed publicly, and what to harden before wider access.

## Current trust model

### 1. Demo actors are not real auth

The browser sends a demo actor such as:

- `guestA`
- `guestB`
- `issuer`

The server maps those values to env-backed Hedera keys and performs real signing on behalf of that actor.

That means:

- the actor selector is a **demo convenience**
- it is **not** a user identity system
- anyone who can call the route with a valid actor value can trigger that actor's action unless another protection layer is added

This is acceptable for a tightly controlled hack demo. It is not safe as a public identity model.

### 2. Server routes are the real trust boundary

Security-sensitive checks belong in server code, not client components.

Examples in the current app:

- booking / resale actions execute through server-side route handlers
- freeze / unfreeze validates requested holder against Mirror-derived holder state
- mark-used runs on the server and uses privileged keys

The UI may guide the operator, but the UI is not a security boundary.

### 3. Redis is convenience state, not booking-right truth

Redis stores:

- token / topic ids
- slot metadata
- listing state

Booking ownership and lifecycle truth still depend on Hedera transactions plus chain / Mirror reads, not just Redis rows.

## High-risk realities if exposed publicly

### Operator-only routes are currently open

These routes perform privileged actions and should be treated as operator-only:

- `/api/init`
- `/api/mint-slots`
- `/api/reset-demo`
- `/api/freeze`
- `/api/unfreeze`
- `/api/mark-used`

Today they rely on server-side keys but do not have a real product auth boundary. If the app is publicly reachable, these routes should not be assumed safe just because they are only linked from `/issuer`.

### Guest transaction routes still trust demo actor input

These routes are also unsafe as public identity surfaces:

- `/api/book`
- `/api/resale-list`
- `/api/resale-buy`
- `/api/associate`

They are fine for a guided demo where the audience is not interacting freely with the deployment. They are not safe as a public end-user auth model.

## What is okay for the hack demo

Reasonable for a controlled demo:

- private or limited-access deployment
- server-held demo keys
- actor selector instead of wallet auth
- operator manually controlling issuer actions

Not reasonable for a public open deployment:

- assuming UI links protect sensitive routes
- assuming `guestA` / `guestB` request bodies are identity proof
- exposing init / reset / mint to the public internet without a gate

## Minimum hardening before public exposure

If the app will be reachable by anyone outside the team, do these first:

1. Add a protection layer for operator-only routes.
   - simplest acceptable option for the hack: shared secret header or deployment protection
   - better option later: real auth / operator allowlist

2. Protect demo transaction routes or keep the whole deployment private.
   - if the app remains demo-only, deployment protection is usually enough
   - if public interaction is required, actor-based signing must be replaced with real user auth / wallet approval

3. Keep `.env.local` and real private keys out of git and logs.

4. Rotate secrets if the app was ever exposed publicly while unprotected.

5. Upgrade Next.js before broader exposure.
   - `14.x` is now unsupported under the official Next.js support policy
   - if new middleware or hosting behavior is added later, re-check security advisories against the deployed version

## Current security review summary

### Demo-safe enough

- server-side signing is kept out of the frontend bundle
- client components do not hold private keys
- server routes perform the sensitive chain actions
- some business checks are re-validated server-side

### Still demo-grade

- actor = identity
- no real auth layer
- privileged operator routes are open by default
- no explicit route protection strategy for a public deployment

## Recommended next step

Before any public demo URL is shared broadly:

1. decide whether the deployment is **private demo only** or **public interactive**
2. if private demo only, add one simple route/deployment gate and document it
3. if public interactive, redesign the identity and signing boundary before treating the app as secure
