import assert from "node:assert/strict";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { Client } from "@hiero-ledger/sdk";
import { ETHONLINE_HEDERA_RECOVERY_PROOF as proof } from "../lib/hedera-agent-kit/ethonline-recovery-proof.ts";
import {
  YOURTURN_MCP_COMPATIBILITY,
  YOURTURN_MCP_RESPONSE_CONVENTION,
  createYourTurnRecoveryMcpOptions,
} from "../lib/hedera-agent-kit/delegated-recovery-mcp-adapter.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_INSPECT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_VERIFY_TOOL,
  yourTurnDelegatedRecoveryReviewerPlugin,
} from "../lib/hedera-agent-kit/delegated-recovery-review-plugin.ts";

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

const mcpOptions = createYourTurnRecoveryMcpOptions("0.0.8504405");
assert.equal(mcpOptions.client.operatorAccountId, null);
assert.equal(mcpOptions.configuration.context.mode, AgentMode.RETURN_BYTES);
assert.equal(mcpOptions.configuration.context.accountId, "0.0.8504405");
assert.equal(mcpOptions.configuration.plugins.length, 1);
assert.equal(
  mcpOptions.configuration.plugins[0].name,
  "yourturn-delegated-recovery-complete-plugin"
);

const reviewTools = yourTurnDelegatedRecoveryReviewerPlugin.tools({});
const inspectTool = reviewTools.find(
  (tool) => tool.method === YOURTURN_DELEGATED_RECOVERY_INSPECT_TOOL
);
const verifyTool = reviewTools.find(
  (tool) => tool.method === YOURTURN_DELEGATED_RECOVERY_VERIFY_TOOL
);
assert.ok(inspectTool, "expected read-only booking inspection tool");
assert.ok(verifyTool, "expected read-only settlement verification tool");

const reviewClient = Client.forTestnet();
const reviewContext = {};
const mirrorId = proof.settlement.mirrorTransactionId;
const exactSettlementParams = {
  transactionId: proof.settlement.transactionId,
  bookingTokenId: proof.settlement.bookingTokenId,
  bookingSerial: proof.settlement.bookingSerial,
  expectedSenderAccountId: proof.delegation.holderAccountId,
  expectedReceiverAccountId: proof.delegation.receiverAccountId,
  settlementTokenId: proof.settlement.usdcTokenId,
  settlementPayerAccountId: proof.delegation.delegatedSpenderAccountId,
  settlementRecipientAccountId: proof.delegation.holderAccountId,
  settlementAmountAtomicUnits: proof.settlement.usdcAtomicUnits,
};

const exactTransaction = {
  transaction_id: mirrorId,
  result: "SUCCESS",
  nft_transfers: [
    {
      token_id: proof.settlement.bookingTokenId,
      serial_number: proof.settlement.bookingSerial,
      sender_account_id: proof.delegation.holderAccountId,
      receiver_account_id: proof.delegation.receiverAccountId,
      is_approval: true,
    },
  ],
  token_transfers: [
    {
      token_id: proof.settlement.usdcTokenId,
      account: proof.delegation.delegatedSpenderAccountId,
      amount: -Number(proof.settlement.usdcAtomicUnits),
    },
    {
      token_id: proof.settlement.usdcTokenId,
      account: proof.delegation.holderAccountId,
      amount: Number(proof.settlement.usdcAtomicUnits),
    },
  ],
};

let transactionResponseBody = { transactions: [exactTransaction] };
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
let expectedFailureLogs = 0;

try {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (
      url.endsWith(
        `/tokens/${proof.settlement.bookingTokenId}/nfts/${proof.settlement.bookingSerial}`
      )
    ) {
      return new Response(
        JSON.stringify({
          account_id: proof.finalState.ownerAccountId,
          spender: null,
          delegating_spender: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (url.endsWith(`/transactions/${mirrorId}`)) {
      return new Response(JSON.stringify(transactionResponseBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected_mock_mirror_url:${url}`);
  };

  const inspection = await inspectTool.execute(reviewClient, reviewContext, {
    tokenId: proof.settlement.bookingTokenId,
    serial: proof.settlement.bookingSerial,
  });
  assert.equal(inspection.raw.ownerAccountId, proof.finalState.ownerAccountId);
  assert.equal(inspection.raw.readOnly, true);
  assert.equal(inspection.raw.signed, false);
  assert.equal(inspection.raw.submitted, false);

  const verified = await verifyTool.execute(
    reviewClient,
    reviewContext,
    exactSettlementParams
  );
  assert.equal(verified.raw.exactlyOneBookingNftTransfer, true);
  assert.equal(verified.raw.exactlyTwoSettlementTokenEntries, true);
  assert.equal(verified.raw.signed, false);
  assert.equal(verified.raw.submitted, false);

  console.error = () => {
    expectedFailureLogs += 1;
  };

  const expectVerifierBlock = async (body, expectedError) => {
    transactionResponseBody = body;
    const result = await verifyTool.execute(
      reviewClient,
      reviewContext,
      exactSettlementParams
    );
    assert.match(result.raw.error, expectedError);
    assert.equal(result.raw.submitted, undefined);
  };

  await expectVerifierBlock(
    {
      transactions: [
        {
          ...exactTransaction,
          transaction_id: "0.0.8504405-1789139309-785362820",
        },
      ],
    },
    /exact_transaction_missing/
  );

  await expectVerifierBlock(
    { transactions: [{ ...exactTransaction, result: "INVALID_SIGNATURE" }] },
    /transaction_not_success:INVALID_SIGNATURE/
  );

  await expectVerifierBlock(
    {
      transactions: [
        {
          ...exactTransaction,
          nft_transfers: [
            exactTransaction.nft_transfers[0],
            { ...exactTransaction.nft_transfers[0], serial_number: 999 },
          ],
        },
      ],
    },
    /nft_transfer_count:2/
  );

  await expectVerifierBlock(
    {
      transactions: [
        {
          ...exactTransaction,
          nft_transfers: [
            { ...exactTransaction.nft_transfers[0], is_approval: false },
          ],
        },
      ],
    },
    /nft_semantics_mismatch/
  );

  await expectVerifierBlock(
    {
      transactions: [
        {
          ...exactTransaction,
          token_transfers: [
            {
              ...exactTransaction.token_transfers[0],
              amount: -Number(proof.settlement.usdcAtomicUnits) + 1,
            },
            exactTransaction.token_transfers[1],
          ],
        },
      ],
    },
    /settlement_payer_mismatch/
  );

  await expectVerifierBlock(
    {
      transactions: [
        {
          ...exactTransaction,
          token_transfers: [
            ...exactTransaction.token_transfers,
            {
              token_id: proof.settlement.usdcTokenId,
              account: "0.0.9999999",
              amount: 0,
            },
          ],
        },
      ],
    },
    /token_transfer_count:3/
  );
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
}

assert.equal(expectedFailureLogs, 6);

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
      reviewerTools: {
        mirrorInspectionReadOnly: true,
        exactSettlementPositive: true,
        adversarialBlocks: 6,
        exactTransactionIdRequired: true,
        noSigningOrSubmission: true,
      },
      mcp: {
        adapterPrepared: true,
        runtimeActivated: YOURTURN_MCP_COMPATIBILITY.runtimeActivated,
        rootDependencyChanged: YOURTURN_MCP_COMPATIBILITY.rootDependencyChanged,
        operatorKeyPresent: false,
        mode: "RETURN_BYTES",
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
