# Final Live Configuration — Reviewed Inputs Only

This is the configuration checklist for the final integrated ceremony. It intentionally contains **no invented live identity mapping**.

## Fixed public protocol values

These are fixed by the reviewed software/contracts:

- Hedera network: `testnet`
- Settlement token: official Hedera testnet USDC `0.0.429274`
- Settlement decimals: `6`
- Canonical World resource path: `/api/agent/confirm`
- Recovery action: Ledger `resale` → execution `RECOVER`
- Cancellation: `false`
- D-010: Bob is settlement source + receiver; Maya is holder/seller; Hedera executor is a third distinct account; Maya's minimum is checked against seller **net**.

Historical/public repo accounts such as `0.0.8504300`, `0.0.8504405` and `0.0.8504715` are **not automatically final-role assignments**. Historical evidence used those accounts under older role semantics. The final D-010 path requires holder, Bob and executor to be distinct and must use reviewed current mappings.

## Required runtime environment

### Public enrollment

```text
YOURTURN_PUBLIC_ENROLLMENT_MANIFEST_JSON=<exact complete reviewed manifest JSON>
YOURTURN_PUBLIC_ENROLLMENT_VERSION=<positive integer version>
YOURTURN_PUBLIC_ENROLLMENT_DIGEST=<sha256 of normalized reviewed manifest>
YOURTURN_PUBLIC_ENROLLMENT_MIN_VERSION=<optional rollback floor>
YOURTURN_WORLD_RESOURCE_URI=<exact HTTPS URL ending /api/agent/confirm, or approved loopback HTTP for local ceremony>
```

The manifest must contain the exact current records required by the selected operation.

### Agent enrollment record

For Maya's authenticated application owner + internal delegated agent:

```text
kind=agent
ownerId=<authenticated YourTurn owner user id>
internalAgentId=<exact signed Ledger mandate agent id>
version=<reviewed positive integer version>
holderAccountId=<Maya current Hedera holder account>
worldRequester=<enrolled nonzero World/AgentKit EVM requester address>
hederaExecutorAccountId=<distinct current Hedera executor account>
resourceUri=<exact YOURTURN_WORLD_RESOURCE_URI>
expiresAtMs=<reviewed validity>
revokedAtMs=null
```

Rules:
- `holderAccountId != hederaExecutorAccountId`;
- World requester is an identity binding only, not holder authority;
- owner/internal-agent must exactly match the Ledger mandate/application mapping;
- no value may be copied from request JSON.

### Provider enrollment record

For the exact booking/provider scope:

```text
kind=provider
providerId=<Studio A current provider-policy id>
tokenId=<final BOOKED token id>
serial=<final demo booking serial>
issuerId=<reviewed current issuer/provider identity>
version=<reviewed positive integer version>
expiresAtMs=<reviewed validity>
revokedAtMs=null
```

A booking may have only one provider enrollment in one manifest.

## Required application/persona mapping

The canonical route derives the expected holder account from the authenticated app user's `hederaPersona`, not from request JSON. Therefore before the ceremony verify:

- Maya is signed in under the intended final demo user/persona;
- that persona resolves to the same `holderAccountId` in the pinned agent enrollment;
- Bob's account in the current payment + eligibility records is distinct from Maya and the executor;
- Bob's current public key and USDC balance are read from Hedera/Mirror at execution time;
- executor current public key is read from Hedera/Mirror at signing-validation time.

## Ledger enrollment

Public EVM signer address only:

```text
LEDGER_GUEST_A_SIGNER_ADDRESS=<address shown by the Ledger Ethereum account used for the final mandate>
```

(or the corresponding Guest B variable if the final Maya persona is Guest B).

The address may be configured before the ceremony; it is not proof of physical Ledger approval. DEVICE status remains RED until the exact physical reject/approve session is captured.

## World credentials

Do not store a private signing/admin credential, raw World human identifier or proof in this repository.

The final ceremony needs the already-enrolled requester/account and whatever local/secure AgentKit/AgentBook credential material the supported live flow requires. GitHub should record only minimum reviewer-safe public evidence after the run.

## Hedera credentials

Do not paste keys into GitHub.

The final path requires access to:

- Maya/holder authority already represented by the current booking + Ledger mandate;
- Bob's external native payment authorization for the exact current commitment;
- the external executor signer for the exact current executor account;
- sufficient testnet network fee balance / token associations required by the final transaction.

The server canonical path must not substitute its own operator/private key for Bob or the executor.

## Final configuration validation before human action

Do not start the physical/live ceremony until all are true:

- [ ] exact final demo token + serial selected;
- [ ] current Maya holder account verified from Hedera state;
- [ ] current Bob account verified and distinct;
- [ ] current executor account verified and distinct;
- [ ] World requester mapping verified from the existing AgentBook/application enrollment;
- [ ] exact provider id/issuer mapping verified;
- [ ] resource URI fixed;
- [ ] complete manifest passes local provisioning validation;
- [ ] manifest digest/version pinned;
- [ ] provider policy for that exact token+serial is current and ALLOW;
- [ ] Bob eligibility is current;
- [ ] Bob has enough current testnet USDC for the exact **gross** commitment;
- [ ] Maya seller-net minimum will pass under the current royalty policy;
- [ ] exact Hedera executor public key is current;
- [ ] Security has cleared the post-confirm signing-state and one-shot submitter boundaries.

If the reviewed sources do not establish one of these values, leave it pending for the secure local ceremony rather than guessing it.