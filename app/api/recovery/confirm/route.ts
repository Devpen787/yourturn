import { NextResponse } from "next/server";
import {
  bookingPort,
  BookingPortError,
  inspectBookingPortPreview,
} from "@/lib/adapters/booking-port";
import {
  buildRecoveryPaymentAgentTrace,
  buildRefundReleaseAgentTrace,
} from "@/lib/agent/concierge-agent";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import { getActorCredentials } from "@/lib/hedera/client";
import { createScheduledRecoveryPayment } from "@/lib/hedera/schedule";
import { mintApprovalGrant } from "@/lib/server/approval-grants";
import { upsertAutomationProof } from "@/lib/store/automation-proofs";
import { upsertRecoveryReceipt } from "@/lib/store/recovery-receipts";
import { fail, recoveryConfirmBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    const parsed = recoveryConfirmBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
    if (denied) return denied;

    const preview = inspectBookingPortPreview(parsed.data.previewId);
    if (preview.action !== "create_listing" && preview.action !== "cancel_release") {
      return NextResponse.json(
        fail("Recovery confirmation only supports resale listing or release refund.", "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    if (preview.actor.kind !== "demoActor" || preview.actor.id !== parsed.data.actor) {
      return NextResponse.json(
        fail("Preview actor does not match the signed-in recovery actor.", "CONFLICT"),
        { status: 409 }
      );
    }

    const slot = await bookingPort.getSlot(preview.serial);
    if (!slot) {
      return NextResponse.json(
        fail("This ref is not part of the current demo schedule.", "NOT_FOUND"),
        { status: 404 }
      );
    }

    const actorAccountId = getActorCredentials(parsed.data.actor).accountId.toString();
    const grant = mintApprovalGrant({
      action: preview.action,
      actor: { kind: "demoActor", id: parsed.data.actor },
      serial: preview.serial,
      approvedBy: parsed.data.actor,
      source: "agent_handoff",
      ttlSeconds: 15 * 60,
    });
    const createdAt = new Date().toISOString();
    const approval = {
      approvedBy: grant.claims.approvedBy,
      approvedAt: grant.claims.approvedAt,
      source: grant.claims.source,
    } as const;
    if (preview.action === "cancel_release") {
      const result = await bookingPort.confirmCancelRelease({
        previewId: parsed.data.previewId,
        approval,
      });
      const releaseHashscanUrl = result.hashscanUrls.transferToTreasury ?? undefined;
      const agentTrace = buildRefundReleaseAgentTrace({
        serial: preview.serial,
        intent:
          "I cannot attend; release this booking right and return value under provider policy.",
        actorLabel: parsed.data.actor === "guestA" ? "Person A" : "Person B",
        approvalId: grant.claims.grantId,
        policySnapshot: slot.policySnapshot,
        refundHbar: result.refundHbar,
        refundTxId: result.txIds.transferToTreasury ?? result.txIds.audit,
      });
      const receipt = {
        title: "Refund release completed",
        statusLabel: "Refunded",
        actionLabel: "Release + test HBAR refund",
        actorLabel: parsed.data.actor === "guestA" ? "Person A" : "Person B",
        currentState:
          "The booking right was released back to the provider, closed, and a real testnet HBAR refund was sent to the holder.",
        receiptId: grant.claims.grantId,
        action: "cancel_release_refund" as const,
        actor: parsed.data.actor,
        actorAccountId,
        serial: preview.serial,
        refundHbar: result.refundHbar,
        approvalId: grant.claims.grantId,
        approvalGrantId: grant.claims.grantId,
        txId: result.txIds.transferToTreasury ?? undefined,
        releaseTxId: result.txIds.transferToTreasury ?? undefined,
        burnTxId: result.txIds.burn,
        auditTxId: result.txIds.audit,
        hashscanUrl: releaseHashscanUrl,
        releaseHashscanUrl,
        burnHashscanUrl: result.hashscanUrls.burn,
        createdAt,
        occurredAt: createdAt,
        policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
        policySnapshot: slot.policySnapshot,
        agentTrace,
        policyBasisRaw: {
          releaseAllowed: slot.policySnapshot.releaseAllowed,
          ownerRoyaltyPercent: slot.policySnapshot.ownerRoyaltyPercent,
          snapshotId: slot.policySnapshot.snapshotId,
          label: slot.policySnapshot.label,
          source: "booked_policy_snapshot" as const,
        },
      };
      await upsertRecoveryReceipt(receipt, "cancel_release_refund");
      return NextResponse.json({
        ok: true as const,
        receipt,
      });
    }

    const result = await bookingPort.confirmCreateListing({
      previewId: parsed.data.previewId,
      approval,
    });
    if (!slot.policySnapshot.scheduleAutomationEnabled) {
      return NextResponse.json(
        fail(
          "The booked policy does not allow scheduled automation for this recovery.",
          "CONFLICT"
        ),
        { status: 409 }
      );
    }
    const scheduleProof = await createScheduledRecoveryPayment({
      payerActor: parsed.data.actor,
      amountHbar: 0.01,
      serial: preview.serial,
      executeAfterSeconds: 90,
    });
    const agentTrace = buildRecoveryPaymentAgentTrace({
      serial: preview.serial,
      intent: "I cannot attend; recover value by listing and scheduling recovery settlement proof.",
      actorLabel: parsed.data.actor === "guestA" ? "Person A" : "Person B",
      approvalId: grant.claims.grantId,
      policySnapshot: slot.policySnapshot,
      amountHbar: scheduleProof.amountHbar,
      scheduleId: scheduleProof.scheduleId,
    });
    await upsertAutomationProof({
      serial: preview.serial,
      actor: parsed.data.actor,
      scheduleProof,
      agentTrace,
      createdAt,
    });
    const receipt = {
      title: "Recovery listing created",
      statusLabel: "Listed",
      actionLabel: "Concierge recovery listing",
      actorLabel: parsed.data.actor === "guestA" ? "Person A" : "Person B",
      currentState: "This pass is listed for another customer to take over.",
      receiptId: grant.claims.grantId,
      action: "create_listing" as const,
      actor: parsed.data.actor,
      actorAccountId,
      serial: preview.serial,
      askPriceHbar: result.listing.askPriceHbar,
      royaltyHbar: result.listing.royaltyHbar,
      sellerNetHbar: result.listing.sellerNetHbar,
      approvalId: grant.claims.grantId,
      approvalGrantId: grant.claims.grantId,
      auditTxId: result.auditTxId,
      hashscanUrl: result.hashscanUrl,
      createdAt,
      occurredAt: createdAt,
      policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
      policySnapshot: slot.policySnapshot,
      scheduleProof,
      agentTrace,
      policyBasisRaw: {
        resaleAllowed: slot.policySnapshot.resaleAllowed,
        ownerRoyaltyPercent: slot.policySnapshot.ownerRoyaltyPercent,
        snapshotId: slot.policySnapshot.snapshotId,
        label: slot.policySnapshot.label,
        source: "booked_policy_snapshot" as const,
      },
    };
    await upsertRecoveryReceipt(receipt, "recovery_listing");

    return NextResponse.json({
      ok: true as const,
      listing: result.listing,
      receipt,
    });
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
