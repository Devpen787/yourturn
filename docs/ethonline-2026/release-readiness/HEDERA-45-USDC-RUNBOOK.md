# Hedera 45-USDC LIVE/TESTNET Proof Runbook

Purpose: make the eventual canonical Hedera proof mechanical and reviewer-safe. This document **does not authorize funding, signing, submission, secret changes, mainnet use, or production deployment**.

## Frozen product semantics

- Booking: Friday Yoga.
- Holder mandate minimum: **40 USDC**.
- Below-minimum negative: **32 USDC** → blocked before transfer/settlement.
- Canonical successful offer: **45 USDC**.
- Customer outcome: **`You recovered 45 USDC`**.
- Provider policy is pre-defined/load-bearing; no manual provider approval is added for a compliant recovery.

## Current external prerequisite

Public-state preflight previously established testnet account `0.0.8504405` at **19.98 testnet USDC**. The canonical 45-USDC proof therefore requires **+25.02 testnet USDC** to that existing testnet account.

That top-up is a human/external action. Automation must not perform it. No real/mainnet funds are requested or authorized.

## Software gate before the run

Use exact Hedera sponsor head:

`40890aab7729075edbf5efac5f5367f4b5a022e1`

Required precondition:

- SEC-HEDERA-007 remains independently CLOSED at CI/LOCAL (independent run `34489546446`).
- Exact-head Continuity remains green (`34487132901`) or a newer exact-head run is explicitly reviewed.
- No unreviewed sponsor-head drift is substituted for this SHA.

## Preflight — no mutation

Before signing/submission, verify only public/config state:

1. Hedera network is exactly **testnet**.
2. Testnet USDC token is exactly the intended existing token for this proof (`0.0.429274`).
3. Existing role/account mapping is the reviewed mapping for the current runner.
4. `0.0.8504405` has at least **45.00 testnet USDC** after the external top-up.
5. Required BOOKED serial/ownership state still matches the runner's expected holder/spender/receiver roles.
6. Provider policy state resolves to the exact allowed state/version expected by the recovery invocation.
7. No secret values are printed; only secret presence may be checked.
8. The 32-USDC negative remains executable and fails before nonce/RETURN_BYTES/value movement.

If any preflight fails, stop before mutation.

## Canonical proof sequence

The exact proof should establish, in order:

1. **32-USDC negative**
   - same booking/mandate/provider rule;
   - decision is below-minimum BLOCK;
   - no prepared/submitted transfer;
   - no booking ownership change;
   - no settlement movement.

2. **45-USDC positive**
   - same 40-USDC mandate minimum;
   - exact provider rule remains valid;
   - exact delegated recovery action is allowed;
   - prepared bytes decode to exactly one intended BOOKED NFT movement and exactly one 45-USDC HTS movement;
   - no extra token/HBAR movement;
   - signing/submission uses the reviewed noncustodial/external signer boundary;
   - Hedera testnet receipt succeeds.

3. **Authoritative reconciliation**
   - Mirror/HashScan/public state confirms the intended BOOKED serial owner changed to the intended receiver/acquirer role;
   - Maya/current holder received exactly 45 USDC;
   - transaction/receipt/final-state references agree;
   - replay of the same execution cannot cause a second transfer/settlement.

## Evidence capture

Only public/reviewer-safe fields may be recorded:

- exact source SHA;
- workflow/run/artifact identifier if GitHub Actions is used;
- Hedera **testnet** transaction id/hash;
- token id and booking serial;
- public account ids needed to establish role/state;
- receipt status;
- pre/post public ownership;
- pre/post public USDC balances sufficient to establish exact 45-USDC movement;
- 32-USDC negative result;
- evidence timestamp;
- explicit evidence class.

Never record private keys, raw environment output, secret values, recovery material, or unrelated account data.

## Promotion rule

A successful builder-run artifact is **not self-certifying**. After the run, Security #16 must independently inspect the exact live artifact and verify the transaction literally contains the intended booking and USDC movements with no widening.

Only after that review may the new customer recovery path be promoted to LIVE/TESTNET or marked integration-ready.

Do not use the word **atomic** for the customer recovery claim until one actual independently verified Hedera transaction contains both movements and final state reconciles.
