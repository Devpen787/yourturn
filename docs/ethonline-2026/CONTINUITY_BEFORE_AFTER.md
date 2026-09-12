# ETHOnline 2026 Continuity Before/After

Pre-event baseline: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`.

This ledger prevents pre-event YourTurn capabilities from being relabelled as ETHOnline work.

| Capability | Before ETHOnline | ETHOnline change | Sponsor | Classification |
| --- | --- | --- | --- | --- |
| Booking-right NFT | Existing Hedera product capability | Exact booking object in delegated recovery | Hedera | REUSED |
| Booking transfer/resale | Existing | Connected to new delegated-authority path | Hedera/Product | REUSED + NEW INTEGRATION |
| Provider royalty | Existing | Buyer gross, provider royalty and seller net are reconciled in the new recovery model | Hedera/Product | REUSED PRIMITIVE + NEW SEMANTICS |
| HCS/Mirror/HashScan | Existing | Reused for proof/evidence where applicable | Hedera | REUSED |
| Hedera Agent Kit/policies | Existing pre-event work | New recovery adds stricter delegated authority and separated buyer-funding semantics | Hedera | REUSED SDK + NEW ARCHITECTURE |
| Ledger Recovery Mandate | Absent | EIP-712 bounded human authorization over one recovery action | Ledger | NEW_ETHONLINE |
| Mandate replacement/current authority | Absent | Current-authority, reject/cancel retention, expiry and replay semantics | Ledger | NEW_ETHONLINE |
| Physical Ledger qualification | Absent | Device approve/reject/cancel qualification programme | Ledger | NEW_ETHONLINE; FINAL DEVICE PROOF PENDING |
| World AgentKit requester verification | Absent | Exact human-backed requester binding for recovery | World | NEW_ETHONLINE |
| AgentBook | Absent | Registration/resolution evidence for the delegated requester | World | NEW_ETHONLINE |
| World Sandbox | Absent | Real non-production verification path and hardened transport | World | NEW_ETHONLINE |
| Account/session/product shell | Mature baseline capability | Reused and extended | Product | REUSED |
| Provider configuration | Existing provider concepts | Published session/recovery settings become runtime product truth | Product | NEW_ETHONLINE PRODUCT WORK |
| Maya/Bob/Studio A lifecycle | Existing pieces | One versioned booking lifecycle drives holder, payment, attendance and fulfilment/history | Product | NEW_ETHONLINE PRODUCT WORK |
| Adversarial browser journey programme | Not this completion programme | Desktop/mobile state-integrity, retry and navigation gates | Product | NEW_ETHONLINE QUALITY WORK |
| Independent Product/Security gates | Not this event workflow | Exact-candidate independent review before advancement | Cross-cutting | NEW_ETHONLINE PROCESS/EVIDENCE |

## Pre-event capabilities not claimed as new

Booking NFTs, royalties, HCS audit, Mirror/HashScan proof, Schedule Service, prior Concierge recovery, Hedera Agent Kit/policies, earlier payment/allowance experiments, and the mature auth/customer/provider shell are baseline/reused capabilities.

## Continuity thesis

> An existing booking-recovery product gained a constrained autonomous recovery architecture: Ledger-bounded holder authority, World-backed exact requester verification, current provider/buyer/payment constraints, and Hedera-verifiable ownership/economics, all projected through one product lifecycle.
