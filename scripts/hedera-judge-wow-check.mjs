import assert from "node:assert/strict";
import { ETHONLINE_HEDERA_RECOVERY_PROOF as proof } from "../lib/hedera-agent-kit/ethonline-recovery-proof.ts";
import {
  YOURTURN_MCP_COMPATIBILITY,
  YOURTURN_MCP_RESPONSE_CONVENTION,
} from "../lib/hedera-agent-kit/delegated-recovery-mcp-adapter.ts";

assert.equal(proof.network, "Hedera Testnet");
assert.equal(proof.sponsorHead, "411f703e164cac82b5498c1f25a2cf21af7bc4be");
assert.equal(proof.security.qualificationCommentId, 5636886313);
assert.equal(proof.security.runId, 34617031728);
assert.equal(proof.security.conclusion, "SUCCESS");

assert.equal(proof.policy.minimumRecoveryUsdc, 40);
assert.equal(proof.policy.rejectedOfferUsdc, 32);
assert.equal(proof.policy.rejectedOfferResult, "BLOCK / BELOW_MINIMUM_RECOVERY");
assert.equal(proof.policy.rejectedOfferNonceReservations, 0);
assert.equal(proof.policy.rejectedOfferReturnBytesProduced, false);
assert.equal(proof.policy.acceptedOfferUsdc, 45);
assert.equal(proof.policy.acceptedOfferResult, "ALLOW");

assert.equal(proof.settlement.transactionId, "0.0.8504405@1789139309.785362819");
assert.equal(proof.settlement.bookingTokenId, "0.0.8505698");
assert.equal(proof.settlement.bookingSerial, 213);
assert.equal(proof.settlement.usdcTokenId, "0.0.429274");
assert.equal(proof.settlement.usdcAtomicUnits, "45000000");
assert.equal(proof.settlement.exactlyOneBookingNftTransfer, true);
assert.equal(proof.settlement.exactlyTwoUsdcTransferEntries, true);
assert.equal(proof.settlement.singleTransactionContainsBookingNftAndUsdc, true);
assert.equal(proof.settlement.atomicClaimAllowed, true);
assert.equal(proof.settlement.atomicScope, "single successful Hedera settlement transaction only");
assert.match(proof.claimBoundary.allowed, /one successful Hedera transaction/);
assert.ok(proof.claimBoundary.notAllowed.includes("the entire recovery workflow is atomic"));

assert.equal(proof.delegation.ownerKeyHeldByAgentOrBackend, false);
assert.equal(proof.delegation.transactionPreparationMode, "HAK AgentMode.RETURN_BYTES");
assert.equal(proof.hakSurface.existingExecutionTools.length, 4);
assert.equal(proof.hakSurface.additiveReviewerTools.length, 2);

assert.equal(proof.submissionValidator.sourceRepository, "hedera-dev/hedera-skills");
assert.equal(
  proof.submissionValidator.sourcePath,
  "plugins/hackathon-helper/skills/validate-submission/SKILL.md"
);
assert.deepEqual(
  proof.judgeChecklist.map((item) => item.criterion),
  ["Innovation", "Feasibility", "Execution", "Integration", "Validation", "Success", "Pitch"]
);

assert.equal(YOURTURN_MCP_COMPATIBILITY.runtimeActivated, false);
assert.equal(YOURTURN_MCP_COMPATIBILITY.rootDependencyChanged, false);
assert.equal(YOURTURN_MCP_COMPATIBILITY.currentRepoHieroSdkRange, "^2.81.0");
assert.equal(YOURTURN_MCP_COMPATIBILITY.currentOfficialMcpHieroPeerRangeObserved, "^2.86.2");
assert.equal(YOURTURN_MCP_RESPONSE_CONVENTION.transactionBytesEncoding, "base64");
assert.match(YOURTURN_MCP_RESPONSE_CONVENTION.safetyNote, /unsigned and unsubmitted/i);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI/LOCAL",
      check: "hedera_judge_wow_and_interop_surface",
      canonicalLiveProofPreservedAt: proof.sponsorHead,
      policyStory: "32_BLOCK__40_MINIMUM__45_ALLOW",
      atomicClaimScope: proof.settlement.atomicScope,
      hakTools: {
        execution: proof.hakSurface.existingExecutionTools.length,
        reviewer: proof.hakSurface.additiveReviewerTools.length,
      },
      mcp: {
        adapterPrepared: true,
        runtimeActivated: YOURTURN_MCP_COMPATIBILITY.runtimeActivated,
        rootDependencyChanged: YOURTURN_MCP_COMPATIBILITY.rootDependencyChanged,
      },
      feePreview: proof.hakSurface.feePreview.status,
      submissionValidatorCriteria: proof.judgeChecklist.map((item) => item.criterion),
      secretsLoaded: false,
      transactionSubmitted: false,
    },
    null,
    2
  )
);
