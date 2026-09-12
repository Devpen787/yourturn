# D-010 royalty-aware native payment qualification

This successor preserves the independently qualified zero-fee v1 protocol and its tests. It adds explicit `yourturn:hedera:testnet:exact-payment:v2` commitments. It is not an integration input or live settlement until separately reviewed and selected.

## Amounts and authority

The commitment's existing `settlementAmountAtomicUnits` is **buyer gross**, and the native frozen transfer debits that gross from Bob and credits the same nominal gross to Maya. Hedera's NFT royalty assessor redirects the applicable fee from Maya's credit to the collector. Do not add a second explicit royalty transfer: that would charge twice.

The v2 commitment additionally signs `economics`: provider fraction and collector, calculated royalty amount, seller net, explicit seller exemption and hash of the complete immutable fee metadata. The transaction memo hashes the entire strict versioned commitment, so Bob's exact native-body signature binds those facts. Provider policy ID/version, quote/hash, booking/serial, operation, payment commitment, identities, validity and fee cap remain signed.

The trusted resolver supplies provider-published policy independently from complete chain metadata. Their rate and collector must agree. The holder's and provider's minimum checks and the private HAK policy context use **seller net**. The actual frozen transaction, body validation and Bob funding check use **gross**. The public raw settlement tool remains retired; no new generic tool is registered. All asynchronous state rereads recheck the entire original authority/economic snapshot and the original signature.

Examples in atomic USDC (six decimals):

| Buyer gross | Published/enforceable rate | Seller net | Consequence |
|---|---|---|---|
| 45 | 10% | 40.5 | Meets holder minimum 40 |
| 32 | 10% | 28.8 | Does not meet holder minimum 30 |
| 32 | 5% | 30.4 | Meets holder minimum 30 if all other checks allow |
| 45 | 25% | 33.75 | Does not meet holder minimum 40 |

Ten percent is neither a floor nor a cap. Supported fractions range from zero to one, with integer-floor fee calculation. A 100% fee cannot meet a positive canonical holder minimum. Zero policy requires a zero-fee token. Unsupported or mismatched token terms fail closed; no asset/account is selected or changed by this code.

## Bounded fee model

Only a complete immutable zero-fee schedule or one NFT royalty with no fallback/fixed/fractional fees is supported. Settlement USDC must remain fee-free and immutable. The seller's equality to the token treasury or own collector derives exemption; an agent/fee payer's collector role cannot exempt another seller. Nonexempt buyer-as-collector arrangements are rejected because they alter the simple gross debit/net proceeds model. Multiple collectors, mutable schedules and complex custom fees need a separate qualification.

Source basis: [pinned Hiero royalty assessor](https://github.com/hiero-ledger/hiero-consensus-node/blob/bf5471a7a5647385fe16ffab868297029e890bac/hedera-node/hedera-token-service-impl/src/main/java/com/hedera/node/app/service/token/impl/handlers/transfer/customfees/CustomRoyaltyFeeAssessor.java), and independent canonical protocol preflight #5 5647049040. This is protocol/source reasoning, not a new chain transaction.

## Compatibility and replay

v1 retains its exact zero-fee rejection and unchanged wire memo. It cannot ignore newly supplied royalty policy/metadata: a resolver using those terms must require v2. Strict v1 commitments reject unsigned additional economics fields. Both versions share existing persistent replay keys, preventing an operation or payment commitment from reopening through a version switch. Denial after reservation does not clear tombstones or regenerate bytes.

## Receipt and remaining boundaries

`validateRecoveryRoyaltyReceipt` checks a complete trusted normalized receipt against exact operation/transaction/memo, one NFT movement and all final USDC rows: buyer gross debit, seller net credit and collector royalty credit. It rejects extra/duplicate/altered rows. It does not assume an `assessed_custom_fees` property exists. This pure checker does not authenticate or fetch a receipt and does not verify HBAR fee distribution.

The current-chain adapter, provider registry, canonical Ledger/World consumer, externally held signer, immediate pre-sign/pre-submit recheck, full receipt reader and fresh Bob-funded testnet proof remain separate required work. Metadata count flags alone are not proof that a real lookup happened. No credentials, device operation, network signing, transaction submission or account-role selection is performed here.
