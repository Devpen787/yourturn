const mirrorTransactionId = "0.0.8504405-1789139309-785362819";

export const ETHONLINE_HEDERA_RECOVERY_PROOF = Object.freeze({
  title: "YourTurn Delegated Recovery — Hedera reviewer cockpit",
  evidenceLevel: "LIVE/TESTNET + INDEPENDENT_SECURITY" as const,
  network: "Hedera Testnet",
  sponsorHead: "411f703e164cac82b5498c1f25a2cf21af7bc4be",
  security: {
    issue: 16,
    qualificationCommentId: 5636886313,
    qualificationUrl:
      "https://github.com/Devpen787/yourturn/issues/16#issuecomment-5636886313",
    attackerHead: "12aafe157a3f854fd507b99439ef864060310165",
    runId: 34617031728,
    conclusion: "SUCCESS",
  },
  delegation: {
    scope: "one exact BOOKED NFT serial",
    tokenId: "0.0.8505698",
    serial: 213,
    holderAccountId: "0.0.8504300",
    delegatedSpenderAccountId: "0.0.8504405",
    receiverAccountId: "0.0.8504715",
    ownerKeyHeldByAgentOrBackend: false,
    transactionPreparationMode: "HAK AgentMode.RETURN_BYTES",
  },
  policy: {
    name: "BookingRightDelegationPolicy",
    minimumRecoveryUsdc: 40,
    rejectedOfferUsdc: 32,
    rejectedOfferResult: "BLOCK / BELOW_MINIMUM_RECOVERY",
    rejectedOfferNonceReservations: 0,
    rejectedOfferReturnBytesProduced: false,
    acceptedOfferUsdc: 45,
    acceptedOfferResult: "ALLOW",
  },
  settlement: {
    transactionId: "0.0.8504405@1789139309.785362819",
    mirrorTransactionId,
    result: "SUCCESS",
    bookingTokenId: "0.0.8505698",
    bookingSerial: 213,
    usdcTokenId: "0.0.429274",
    usdcAtomicUnits: "45000000",
    exactlyOneBookingNftTransfer: true,
    exactlyTwoUsdcTransferEntries: true,
    singleTransactionContainsBookingNftAndUsdc: true,
    atomicClaimAllowed: true,
    atomicScope: "single successful Hedera settlement transaction only",
    mirror: `https://testnet.mirrornode.hedera.com/api/v1/transactions/${mirrorTransactionId}`,
    hashscan: `https://hashscan.io/#/testnet/transaction/${mirrorTransactionId}`,
  },
  finalState: {
    ownerAccountId: "0.0.8504715",
    ownerMirror:
      "https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.8505698/nfts/213",
    spenderUsdcAtomicUnits: "34980000",
    holderUsdcAtomicUnits: "45020000",
  },
  hakSurface: {
    pluginName: "yourturn-delegated-recovery-complete-plugin",
    existingExecutionTools: [
      "yourturn_delegated_recovery_approve_nft_serial",
      "yourturn_delegated_recovery_revoke_nft_serial",
      "yourturn_delegated_recovery_transfer_nft_serial",
      "yourturn_delegated_recovery_settle_nft_usdc",
    ],
    additiveReviewerTools: [
      "yourturn_delegated_recovery_inspect_booking",
      "yourturn_delegated_recovery_verify_settlement",
    ],
    mcp: {
      status: "MCP_READY_ADAPTER / RUNTIME_DEPENDENCY_HELD",
      mode: "RETURN_BYTES",
      holdsSigningKey: false,
      submitsTransactions: false,
      reason:
        "Official HAK MCP runtime activation is deferred because its current Hiero SDK peer range is newer than the independently qualified shared root. No competing root upgrade is introduced by this Hedera increment.",
    },
    feePreview: {
      status: "DEFERRED_SHARED_ROOT_SDK_GATE",
      reason:
        "FeeEstimateQuery is a newer Hiero SDK API than the qualified shared dependency baseline. Do not alter the shared SDK graph solely for judge polish; activate it only after the shared-root compatibility gate selects and requalifies the SDK surface.",
    },
  },
  continuity: {
    ethOnlineNew: [
      "serial-scoped NFT delegation and revocation with wrong-serial/post-revoke network enforcement",
      "non-custodial HAK RETURN_BYTES recovery preparation with decoded-byte semantic binding",
      "BookingRightDelegationPolicy with fail-closed provider state and durable replay/idempotency coverage",
      "customer-facing recovery minimum enforcement: 32 USDC blocked, 45 USDC allowed",
      "single Hedera testnet transaction containing the approved booking NFT movement and 45 USDC settlement",
      "additive HAK reviewer plugin and MCP-ready non-custodial adapter surface",
    ],
    preEventBaselineNotNew: [
      "generic HAK v4 policies/hooks",
      "HCS audit support",
      "Schedule Service",
      "x402 HBAR/USDC service and settlement",
      "generic bounded USDC allowance",
      "WalletConnect/Reown allowance",
      "Agent Lab",
      "NFT Studio",
    ],
  },
  claimBoundary: {
    allowed:
      "On Hedera Testnet, YourTurn atomically settled the booking NFT and 45 USDC in one successful Hedera transaction.",
    notAllowed: [
      "the entire recovery workflow is atomic",
      "allowance setup happened in the same transaction as settlement",
      "durable Redis replay was exercised in the same LIVE settlement run",
      "the final Ledger -> World -> Hedera adversarial E2E is complete",
      "the official HAK MCP runtime is already installed or live",
      "FeeEstimateQuery is active on the current qualified SDK line",
    ],
  },
  submissionValidator: {
    sourceRepository: "hedera-dev/hedera-skills",
    sourceRevisionObserved: "8b1fccd8ccbbe73e928037b76028caf79900b12e",
    sourcePath: "plugins/hackathon-helper/skills/validate-submission/SKILL.md",
    sourceBlobObserved: "c087b9ab43531893aa7b7f1cf548dfed540991f4",
    purpose:
      "Structure the reviewer cockpit and CI self-audit around Hedera's current seven submission criteria without pretending a subjective score is machine proof.",
  },
  judgeChecklist: [
    {
      criterion: "Innovation",
      evidence: "narrow, revocable AI authority over one exact booking right rather than wallet-wide custody",
    },
    {
      criterion: "Feasibility",
      evidence: "policy-gated RETURN_BYTES preparation plus a proven single Hedera settlement transaction; no custom contract required",
    },
    {
      criterion: "Execution",
      evidence: "green production/continuity checks, independent adversarial review, public proof receipt and reviewer cockpit",
    },
    {
      criterion: "Integration",
      evidence: "HAK v4 lifecycle + HTS NFT allowance/approved transfer + HTS USDC settlement + Mirror/HashScan verification",
    },
    {
      criterion: "Validation",
      evidence: "independent Security attack plus exact public testnet transaction and final-state verification; no user traction is implied",
    },
    {
      criterion: "Success",
      evidence: "the product turns otherwise-lost booking value into a policy-controlled Hedera settlement path; network-impact scale remains a post-hackathon claim",
    },
    {
      criterion: "Pitch",
      evidence: "judge-visible 32 BLOCK -> 45 ALLOW -> one transaction -> public receipt, with Week-5 baseline separated from Continuity",
    },
  ],
});

export type EthOnlineHederaRecoveryProof = typeof ETHONLINE_HEDERA_RECOVERY_PROOF;
