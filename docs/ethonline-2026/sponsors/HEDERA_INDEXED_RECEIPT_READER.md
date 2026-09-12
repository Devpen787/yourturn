# Hedera indexed settlement receipt reader

## Scope

`readRecoverySettlementReceipt` reads one exact Hedera testnet transaction twice from the fixed public Mirror Node origin and verifies it against an immutable authenticated-server v2 payment commitment. It proves indexed settlement facts only. It never signs, submits, retries a transaction, grants authority, or reports consensus-synchronous finality.

The bounded contract requires the exact successful `CRYPTOTRANSFER`, transaction body fields, memo commitment, one delegated NFT movement, the complete two-or-three-row USDC movement, and a fee-only HBAR ledger. Bob's debit is the buyer gross, Maya's credit is seller net, and the configured collector receives the committed royalty. The business owner selects the royalty policy; 10% is only a recommendation.

The reader fails closed for pagination, duplicate transaction matches, duplicate JSON object keys, redirects, alternate URLs, oversized or non-JSON bodies, integer precision loss, unsupported batch/high-volume/custom-fee terms, staking-reward netting, transfer ambiguity, receipt drift between reads, or a five-second observation window breach. It accepts completed receipts after proposal expiry because receipt reconciliation does not create new spending authority.

The HBAR check proves the signed fee payer's exact debit, the charged-fee cap, unique nonzero rows, positive counterparty credits and a balanced complete response ledger. It records those credit recipients but does not claim that their identities independently authenticate Hedera's internal network fee distribution.

## Evidence boundary

The local and hosted qualification use synthetic Mirror JSON and public fixture identifiers. No live Mirror GET, credential, private key, signature, device action, transaction, or funds are used. A later integration must supply the expected commitment from the authenticated durable payment record and separately reconcile the retained output and operation lifecycle.

The response fields and fixed transaction-by-ID route follow Hedera's official [Get transaction by ID](https://docs.hedera.com/api-reference/transactions/get-transaction-by-id) reference. The qualification workflow runs the focused matrix, inherited resolver/payment/royalty/signing checks, actual disposable Redis regressions, build, TypeScript, and the baseline Agent Kit fixture.
