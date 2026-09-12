# Final Lock Checklist — ETHOnline 2026

No branch is submission-final until every blocking item below is green on one exact candidate lineage and Devinson explicitly approves the final package.

## 1. Exact source identity

- [ ] Product remains byte-identical to approved R5 `342f46ee6e0c4d0f332287d8433735c5ac015528`.
- [ ] Security-sensitive runtime remains descended from and intentionally reviewed against frozen checkpoint `25bc842b2c92772e17350ac6dffc021d144cbe32`.
- [ ] Issue #5 names the exact final integrated SHA.
- [ ] `FINAL_EVIDENCE.json` names the same exact code candidate and evidence runs.
- [ ] README, runbooks and submission draft are on the final package lineage.

## 2. Software qualification

- [ ] Finish-line runtime job PASS.
- [ ] Finish-line Product job PASS.
- [ ] R5 desktop/mobile browser evidence PASS.
- [ ] Single-begin ownership PASS.
- [ ] Current business eligibility/public enrollment/payment authorization PASS.
- [ ] External-signing BEFORE_SIGN / BEFORE_SUBMIT regressions PASS.
- [ ] Indexed receipt reader regression PASS.
- [ ] TypeScript PASS.
- [ ] Production build PASS.
- [ ] Final one-shot Hedera submitter exists, matches `HEDERA_ONE_SHOT_SUBMITTER_SPEC.md`, and has independent adversarial review.

## 3. Independent Security

- [ ] Frozen runtime checkpoint has an explicit #16 disposition; silence is not clearance.
- [ ] Any finding is repaired on a successor, not by rewriting the frozen target.
- [ ] Exact final integrated candidate receives an independent whole-candidate Security disposition.
- [ ] No unresolved HIGH/CRITICAL or other blocking finding remains.

## 4. Ledger DEVICE

- [ ] Same prepared mandate DEVICE REJECT recorded.
- [ ] Host-cancel state recorded where required by the qualification runner.
- [ ] Same prepared mandate DEVICE APPROVE recorded.
- [ ] Reviewer-safe identical-mandate bundle produced.
- [ ] Wrong signature denied.
- [ ] Hardware-approved mandate accepted exactly once.
- [ ] Replay denied.
- [ ] No claim that Ledger signs the Hedera settlement transaction.

## 5. World LIVE/SIGNED-ROUTE

- [ ] Exact canonical GET challenge captured.
- [ ] Credential-bearing signed AgentKit request accepted at exact configured resource.
- [ ] AgentBook/application enrollment resolution recorded at minimum necessary disclosure.
- [ ] Tampered intent/statement denied.
- [ ] Wrong resource denied.
- [ ] Unresolved requester denied/fails closed.
- [ ] Replayed World nonce cannot create a second effect.
- [ ] No raw/unnecessary World human identity leaked into public evidence.

## 6. Hedera LIVE/TESTNET

- [ ] Fresh final canonical operation retains exact unsigned transaction bytes.
- [ ] BEFORE_SIGN PASS.
- [ ] External executor signs exact returned bytes once.
- [ ] BEFORE_SUBMIT PASS on exact fully signed bytes.
- [ ] Human explicitly authorizes one testnet submission.
- [ ] Exact transaction ID recorded.
- [ ] No automatic retry occurred on ambiguous outcome.
- [ ] HashScan reference captured.
- [ ] Mirror/indexed receipt captured.
- [ ] Exact NFT serial Maya → Bob verified.
- [ ] Bob gross USDC debit verified.
- [ ] Maya seller-net USDC credit verified.
- [ ] Exact configured royalty verified when non-zero.
- [ ] Intended fee payer/network fee verified.
- [ ] No additional NFT/fungible/HBAR movement.
- [ ] Operation reaches `completed` with exact receipt digest.

## 7. Cold judge

- [ ] Starts from README, not a private/internal handoff.
- [ ] Desktop `1440×1000` run PASS.
- [ ] Mobile `390×844` run PASS.
- [ ] Maya → Bob → Studio A story understandable without hidden context.
- [ ] First payment failure creates no false receipt.
- [ ] Explicit retry succeeds once.
- [ ] Reload PASS.
- [ ] Back/Forward PASS.
- [ ] Duplicate/invalid-state checks PASS.
- [ ] Claim language matches evidence class.
- [ ] Final disposition is `PASS — COLD JUDGE` rather than software-only.

## 8. Submission package

- [ ] README is ETHOnline-specific and no longer sends judges to Week-5 as the primary path.
- [ ] Continuity before/after is explicit and honest.
- [ ] Exactly three sponsor tracks are claimed.
- [ ] Ledger feedback present.
- [ ] World feedback present.
- [ ] Hedera integration feedback present.
- [ ] Final machine-readable evidence manifest updated.
- [ ] Final screenshots reference the exact final candidate.
- [ ] Demo video follows `DEMO_VIDEO_SCRIPT.md` and uses only final-candidate live evidence for LIVE claims.
- [ ] Submission fields have no unresolved placeholders.
- [ ] `cannot claim` language remains consistent with evidence truth.

## 9. Human final lock

Before merge/default-branch/submission lock, show Devinson:

- exact final SHA;
- Security disposition;
- integrated CI run;
- Ledger/World/Hedera evidence references;
- cold-judge result;
- final README/submission copy/video link;
- any remaining non-blocking limitation.

Only Devinson's explicit approval of that exact package is the final lock.