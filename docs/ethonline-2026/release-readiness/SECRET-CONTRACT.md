# ETHOnline Secret / Sensitive Runtime Contract

This document defines **names, owners, permitted use, redaction rules and evidence boundaries only**. It contains no secret values and does not authorize creating, rotating, copying, funding with, or exposing any secret.

## Non-negotiables

- No private key, recovery phrase, device secret, admin secret, World raw human identifier/proof, or authentication token may be committed to GitHub or copied into reviewer evidence.
- The final hero remains non-production and testnet-only unless Devinson explicitly changes that boundary later. No such authorization exists here.
- A secret may enable an already-approved proof action; possession of a secret never expands product authority.
- CI may validate **presence/absence contracts and redaction behavior** but must not require private signing material for the structural readiness gate.

## Runtime ownership

| Sensitive input | Owner / location | Permitted use | Forbidden use | Public evidence allowed |
| --- | --- | --- | --- | --- |
| World registered-agent private key (`WORLD_AGENT_PRIVATE_KEY`) | Local operator only | Sign the exact registered-agent request for the non-production World recovery proof | GitHub secret value disclosure; logs; screenshots; issue comments; deriving a second authority model | Registered public agent address, sanitized success/failure class, evidence level, resource/action metadata that contains no raw signature/nonce/private key |
| World approval/admin scaffold secret (`BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET` or legacy fallback where the isolated runner still requires it) | Local/non-production proof environment only | Temporary branch-local proof scaffolding until final integration consumes canonical Ledger Recovery Mandate state | Treating the scaffold as final holder authority; publishing value; carrying it into the final Ledger→World authority chain | Only the fact that legacy scaffolding was excluded/replaced from final integration |
| Ledger device/private material | Physical Ledger / local device stack only | Device-backed approval/reject/cancel ceremony for the exact Recovery Mandate after Security gate closure | Seed/recovery phrase export; private key export; CI emulation presented as LIVE/DEVICE; GitHub evidence containing device secrets | Public/reviewer-safe device outcome, exact typed-mandate hash/fields where safe, approve/reject/cancel classification, no recovery material |
| Hedera testnet signer keys / operator material | Existing authorized local or protected test environment | Sign/submit only the exact validated Hedera testnet proof transaction after its software/security gate passes | Mainnet; unrelated transfer; key rotation; logging/export; using a secret to bypass policy/mandate/World checks | Public Hedera transaction id/hash, Mirror/HashScan state, testnet account/token ids, receipt/status, final balances/ownership |
| Redis / data-store credentials | Existing non-production runtime owner | Durable replay/state tests and integrated non-production execution | Publishing credentials; weakening replay/state checks; using CI-only state as LIVE evidence | Sanitized state outcome (winner/replay/conflict/fail-closed), never credentials |

## Redaction contract

All proof runners and evidence collectors must fail review if they emit any of the following:

- private keys or seed/recovery phrases;
- raw World AgentKit signature/header values;
- raw World human identifiers;
- approval/admin secret values;
- Redis URLs/tokens/passwords;
- Ledger recovery/device secrets;
- arbitrary environment dumps.

Proof output should prefer explicit allowlisted fields rather than "log everything then redact".

## Authority contract

Sensitive credentials authenticate execution actors; they do **not** define product permission.

Final product permission remains:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

with sponsor responsibilities:

1. **Ledger** defines the holder-authorized Recovery Mandate.
2. **World** proves the signed requester is the exact human-backed delegated agent bound to that mandate.
3. **Hedera** enforces the resolved constraints and settles/proves the result.

The World branch-local approval-grant scaffold is therefore forbidden as an independent final source of holder authority.

## Pre-release verification

Before any external proof run:

- confirm target is non-production/testnet;
- confirm exact expected public account/agent identifiers without displaying secret material;
- confirm output is allowlisted/privacy-safe;
- confirm no command prints environment variables;
- confirm failure exits before mutation when required state/config does not match;
- independently inspect the resulting public artifact before upgrading its evidence class.
