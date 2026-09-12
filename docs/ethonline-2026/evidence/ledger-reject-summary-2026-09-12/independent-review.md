## Independent preserved Ledger rejection review — evidence incomplete; historical summary safe to publish

Exact reviewed checker: `cf5186ece7c470d7f6385c9195bf775ae188be95`, verified tree `96d5ce2590382efa7d213cd380455c51245a8a1f`.

This review follows the live Security disposition [5646905579](https://github.com/Devpen787/yourturn/issues/16#issuecomment-5646905579). The checker repair remains cleared at SOURCE/CI/LOCAL scope. This independent review does not modify or self-certify that repair.

### Preserved artifact and disposition

Reviewed `session-2/reject-failure-6985.json`: **894 bytes**, SHA-256:

```text
74aa44db804109c01a4515ae74e9c941cb283ecaaddcf6ee6f2776f40269affa
```

The exact hash matched before and after inspection. The artifact declares capture time `2026-09-12T15:12:32.922Z` and source `e1a908be6f1aeb551a07a170f8ee407f4a94aacc`. Those are record metadata, not independently authenticated capture provenance.

**Disposition: safe to publish unchanged as a historical failure summary, but insufficient for LIVE/DEVICE rejection qualification.** It is a 19-field summary, not the canonical device-proof/v1 artifact. Preserve its original result `FAILED_REJECTION_CODE_MISMATCH`, historical required code `6982`, and `qualificationPassed=false`. Attach this review separately; do not retrofit the payload into a successful proof.

### Field-level assessment

| Requirement | Result |
|---|---|
| Accepted rejection code | PASS as recorded: `observedErrorCode="6985"` |
| `EthAppCommandError` tag | UNVERIFIED: missing |
| Exact `signer.eth.steps.signTypedData` interaction event | UNVERIFIED: summary boolean only, no event |
| Observable signing states | FAIL: `signingStates` missing |
| No Completed | Reported only: `completedObserved=false` |
| No signature/output | Partial: no signature bytes in the file; `signaturePersisted=false` does not establish no output |
| No Stopped | UNVERIFIED: missing |
| Host `cancelRequested=false` | UNVERIFIED: missing |
| No authority activation | Reported only: `activationAttempted=false`; server authority state was not independently queried |
| Canonical proof schema/result | FAIL: missing schema; historical failed result and qualification false remain |
| Prepared/device identity binding | UNVERIFIED: correlation UUID and digest are present, but canonical proof signer/device identity and derivation-path evidence are absent |

### Checks actually executed

- Read repo-local ETHOnline continuity baseline, master plan, build loop, acceptance, progress, Ledger task and mission; inspected the current Security #16 contract.
- Verified the exact checker commit tree through Git.
- Inspected exact `ceremony.mjs`, `ceremony-check.mjs`, `qualification.mjs`, `device-proof.mjs`, and `capture-prepared.mjs` source.
- On Node `v24.1.0`, imported the pure `ceremony.mjs` module directly from the exact Git object and supplied the preserved record's signing-state/signature/cancel fields without creating events or filling missing evidence. Exact result: **FAIL — `no Ledger device states were observed`**.
- Confirmed exported accepted rejection codes are exactly `6982` and `6985`.
- Reviewed all 19 summary fields for public packaging and recomputed its byte hash.
- Did not run the full prepared-proof qualification validator: canonical proof requirements are absent. No build or new complete deterministic test-suite run is claimed by this evidence-only review.

The exact device runner writes canonical proof only after the ceremony assertion succeeds. This is consistent with the preserved file being a separate failure summary. The reviewed summary cannot recover the missing observable state sequence.

### Adjacent evidence inventory and expiry

Filename/size/mtime inspection of the `ledger-qualification` directory found only:

| Relative file | Bytes | Modified UTC |
|---|---:|---|
| `preparation-receipt.json` | 493 | 2026-09-12T15:10:25.840463Z |
| `prepared.json` | 3793 | 2026-09-12T15:09:53.448745Z |
| `session-1/expiry-stop.json` | 261 | 2026-09-12T15:07:49.831995Z |
| `session-1/preparation-receipt.json` | 467 | 2026-09-12T10:12:46.694757Z |
| `session-1/prepared.json` | 3793 | 2026-09-12T10:12:05.364061Z |
| `session-1/reject-attempt-2-failure.json` | 893 | 2026-09-12T10:16:27.752179Z |
| `session-1/reject-failure.json` | 1360 | 2026-09-12T10:14:02.387867Z |
| `session-2/reject-failure-6985.json` | 894 | 2026-09-12T15:12:32.924168Z |

No separately named canonical device-proof or sanitized signing-state artifact was identified. Session-1 failure payloads and preparation receipts were not read; filenames alone do not establish their sanitization or usefulness for the session-2 attempt. Generic logs, credentials, environment files and signature files were not inspected.

The exact capture source establishes `prepared.json` as the unsigned CONFIGURED prepare envelope and states that cookies are not persisted. Only expiry/evidence-level and correlation equality were extracted from the current envelope. Its mandate ID matches the summary, and snapshot/message expiry agree at `1789232993`, or **2026-09-12 17:09:53 UTC / 19:09:53 Europe/Zurich**. At the local clock reading **2026-09-12 15:51:40 UTC**, that envelope was not expired. The summary's recorded rejection timestamp is before that expiry. This is temporal/correlation metadata only; it does not qualify identity binding, prove signature freshness for future use, or authorize any device/server action. Recheck expiry before any later human-approved ceremony.

### Public packaging boundary and next action

No credentials, signature material, raw personal identifiers, wallet addresses, local paths or embedded URLs were observed in the 894-byte summary. It retains a mandate correlation UUID and 32-byte digest; neither is a credential. This privacy review applies only to that exact summary, not surrounding envelopes or other files. Copy its exact bytes if publishing, and present it as historical failure evidence alongside this assessment.

The next evidence step is to recover an existing sanitized observable signing-state record, if one was preserved and its inspection is authorized. Do not manufacture canonical events from summary booleans. The blocker has narrowed from artifact access to missing canonical evidence; checker clearance alone cannot promote the rejection. No new hardware touch is requested by this review.

No source/evidence edits, hardware operation, signing, authority activation, booking/server mutation, secret access, transaction submission, funds movement, deployment or GitHub posting occurred. Only this independent review note was created for the execution lead. Ledger reject remains **not LIVE/DEVICE-qualified**; approve, host-cancel and full Ledger qualification remain separate.
