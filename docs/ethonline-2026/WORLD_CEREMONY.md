# World Canonical Ceremony — Exact HTTP Contract

This is the final credential-bearing World proof contract for the canonical YourTurn recovery path. Use only after issue #5 names the exact integrated candidate and issue #16 has no blocking finding for the ceremony boundary.

## 1. Read-only challenge

Authenticated owner session required.

Request exactly:

```http
GET /api/agent/confirm?mandateId=<MANDATE_ID>&operationId=<OPERATION_ID>
```

No other query keys or duplicate keys are accepted.

Expected 200 response fields:

```json
{
  "operationId": "<OPERATION_ID>",
  "intentHash": "<64-hex>",
  "statement": "<exact canonical statement>",
  "resourceUri": "<exact configured /api/agent/confirm URI>",
  "executionPermit": false
}
```

Record the exact `operationId`, `intentHash`, `statement` and `resourceUri`. Do not edit or normalize the statement/resource before World/AgentKit signing.

## 2. Credential-bearing signed request

Use the enrolled World requester and supported AgentKit/AgentBook flow to create a fresh signed request for the exact challenge and exact configured resource. The application owner still comes from the authenticated YourTurn session; World must not supply Maya's owner identity.

POST must use the exact base resource with **no query string**:

```http
POST /api/agent/confirm
Content-Type: application/json
agentkit: <FRESH_SIGNED_AGENTKIT_HEADER>
```

Body must contain exactly these three string fields:

```json
{
  "mandateId": "<MANDATE_ID>",
  "operationId": "<OPERATION_ID>",
  "intentHash": "<INTENT_HASH_FROM_GET>"
}
```

The signed AgentKit payload must bind the exact server-provided statement/resource/requester and use a fresh nonce. The route rejects cross-site/resource drift, wrong content type, oversized bodies, extra JSON authority and missing AgentKit evidence.

## 3. Positive evidence

Capture reviewer-safe evidence showing:

- exact integrated SHA;
- exact configured `resourceUri`;
- challenge `operationId` + `intentHash`;
- enrolled requester address / AgentBook resolution at the minimum disclosure required by the sponsor;
- successful credential-bearing canonical POST;
- returned operation state;
- World did not supply holder account, booking serial, provider policy, payment terms or Hedera executor permission.

Never publish unnecessary raw World/human identity material.

## 4. Required negatives

Use independent fresh operations/nonces where required so one negative cannot contaminate another.

### Tampered statement/intent

Sign a payload that does not match the server challenge or submit a different `intentHash`. Expected result: denial and no new effect.

### Wrong resource

Bind/sign for a URI other than the configured exact `/api/agent/confirm`. Expected result: denial and no new effect.

### Unresolved requester

Use a requester that cannot resolve through the required AgentBook/application enrollment. Expected result: fail closed and no new effect.

### Replay

Reuse the exact same World nonce/header after the first accepted request. Expected result: no second effect. If status is needed, use a **new signed nonce** for the same operation status path; do not replay the original authorization.

## 5. Success condition

World is GREEN for final signed-route evidence only when one credential-bearing canonical request is accepted on the exact selected candidate and tampered/resource/unresolved/replay cases demonstrably fail closed. This proves a human-backed requester signal only; it does not prove booking ownership, honesty, provider eligibility or settlement permission.