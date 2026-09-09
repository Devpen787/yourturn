# PRD 01 — Hedera Native Authority Spike

## Goal

Prove, on Hedera testnet, that a booking owner can delegate one specific booking NFT serial to an agent/spender, that the spender can exercise only that serial, and that revocation removes the authority.

## Requirements

- Use Hedera-native NFT allowance semantics; no `approvedForAll` in the hero path.
- Prefer current `@hiero-ledger/sdk` APIs for new code.
- Record exact owner, spender, token, serial and tx evidence without committing secrets.
- Provide a small reusable domain adapter rather than burying the spike in a one-off script if the path proves viable.

## Assertions

1. A serial-scoped allowance can be created on testnet.
2. The intended spender can transfer the allowed serial through the approved path.
3. The same spender cannot transfer a different serial without authority.
4. The owner can revoke the allowance.
5. A transfer attempt after revocation fails.
6. Mirror/HashScan evidence is emitted for successful network actions.

## Out of scope

- World integration.
- Ledger integration.
- polished customer UI.
- mainnet.

## Failure behavior

If the current SDK/HAK path cannot express the required allowance cleanly, stop with a precise technical blocker and the smallest recommended custom BaseTool/SDK adapter. Do not fake testnet success.
