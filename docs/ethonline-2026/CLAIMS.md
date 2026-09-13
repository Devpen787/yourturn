# What the demo proves — and what it doesn't

We'd rather be precise than impressive. Here is exactly what each piece of evidence supports.

## What is demonstrated

- **The full product journey works.** Maya → Bob → Studio A runs end to end as a deterministic product fixture, including provider-floor changes, expiry, a first-payment failure with explicit retry, successful receipt, check-in, fulfilment, and cancellation that preserves the prior receipt.
- **A below-minimum offer is refused without payment.** The 32 USDC offer is rejected and no settlement is attempted.
- **Minimums apply to seller net.** A 45 USDC gross offer clears a 40 USDC floor only because net proceeds are 40.5 after the demo's 10% provider royalty.
- **AgentBook registration and resolution evidence is live.**
- **A real World ID Sandbox round trip completed** — the Sandbox app produced a signed request and World's verify endpoint accepted it.
- **A physical Ledger device exercised the rejection path**, refusing an unapproved mandate.
- **A real Hedera testnet transaction exists**: `0.0.8504405@1789139309.785362819` moved a booking NFT and 45 USDC together. That single transaction is atomic and independently checkable through Mirror with no credentials.
- **The application code passes type checking, production build, and local browser QA** at desktop 1440×1000 and mobile 390×844 with zero server errors.

## What is deliberately not claimed

- **The product journey is a fixture, not live settlement.** It is real product behavior with deterministic data.
- **The Ledger rejection is not an approval.** We exercised the refusal path; we do not present it as device-approved provenance for the integrated flow.
- **The World ID Sandbox is not production identity.** It is genuine non-production evidence.
- **The historical Hedera transaction moved a flat 45 USDC.** It therefore does **not** demonstrate the newer 40.5 / 4.5 royalty split, which is demo economics.
- **The cross-system workflow is not atomic.** Atomicity applies only to the single Hedera transaction boundary above.
- **Ledger does not sign the Hedera settlement transaction.** It authorizes the mandate that makes a recovery permissible.
- **World identity is not booking authority.** A verified agent asking for something it was never granted is still refused.
- **There is no single continuous live Ledger → World → Hedera execution.** These are independent proofs, each at its own level.
- **The public confirmation route does not sign or submit automatically.** It stops at durable retained unsigned transaction bytes; signing and submission are external, human-authorized steps.

## Demo economics

| | |
| --- | --- |
| Maya's minimum | 40 USDC net |
| Rejected offer | 32 USDC |
| Successful offer | 45 USDC gross |
| Provider royalty (demo) | 10% |
| Maya receives | 40.5 USDC |
| Studio A receives | 4.5 USDC |

The 10% royalty is demo configuration, not a universal rate.
