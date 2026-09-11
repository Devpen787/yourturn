import { NextResponse } from "next/server";
import {
  bookingPort,
  BookingPortError,
  inspectBookingPortPreview,
} from "@/lib/adapters/booking-port";
import { accountsEqual, getActorCredentials } from "@/lib/hedera/client";
import { verifyApprovalGrant } from "@/lib/server/approval-grants";
import { agentConfirmBodySchema } from "@/lib/validation/agent";
import { fail } from "@/lib/validation/api";
import type { BookingActorRef } from "@/lib/types/booking-port";
import { createRedisWorldAgentNonceStore } from "@/lib/world-agentkit/nonce-store";
import {
  authorizeWorldRecoveryWrite,
  isWorldProtectedRecoveryAction,
} from "@/lib/world-agentkit/recovery-write-gate";
import {
  confirmWorldCancelRelease,
  confirmWorldCreateListing,
  RecoveryOperationReconcileError,
} from "@/lib/world-agentkit/recovery-saga";

export const runtime = "nodejs";

function actorsMatch(a: BookingActorRef, b: BookingActorRef): boolean {
  if (a.kind === "demoActor" && b.kind === "demoActor") {
    return a.id === b.id;
  }
  const aAccountId =
    a.kind === "demoActor"
      ? getActorCredentials(a.id).accountId.toString()
      : a.accountId;
  const bAccountId =
    b.kind === "demoActor"
      ? getActorCredentials(b.id).accountId.toString()
      : b.accountId;
  return accountsEqual(aAccountId, bAccountId);
}

export async function POST(req: Request) {
  try {
    const parsed = agentConfirmBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }

    const preview = inspectBookingPortPreview(parsed.data.previewId);
    const worldProtectedRecovery = isWorldProtectedRecoveryAction(preview.action);

    // Recovery authority may not rely on the legacy development fallback secret.
    // A server-issued, exact-scoped grant is the independent YourTurn mandate
    // carrier; the AgentKit request must separately prove the requesting agent.
    if (worldProtectedRecovery && !process.env.BOOKED_RIGHTS_APPROVAL_SECRET) {
      return NextResponse.json(
        fail(
          "World-protected recovery requires explicit approval-grant signing configuration.",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }

    const grant = verifyApprovalGrant(parsed.data.approvalGrant);

    if (grant.action !== "any" && grant.action !== preview.action) {
      return NextResponse.json(
        fail("Approval grant action does not match preview action", "CONFLICT"),
        { status: 409 }
      );
    }
    if (grant.serial != null && grant.serial !== preview.serial) {
      return NextResponse.json(
        fail("Approval grant serial does not match preview serial", "CONFLICT"),
        { status: 409 }
      );
    }
    if (grant.actor && !actorsMatch(grant.actor, preview.actor)) {
      return NextResponse.json(
        fail("Approval grant actor does not match preview actor", "CONFLICT"),
        { status: 409 }
      );
    }

    let worldTrust: ReturnType<
      typeof import("@/lib/world-agentkit/trust-boundary").toWorldPublicTrustSummary
    > | null = null;

    if (worldProtectedRecovery) {
      let nonceStore;
      try {
        nonceStore = createRedisWorldAgentNonceStore();
      } catch {
        return NextResponse.json(
          fail(
            "World AgentKit replay protection is not configured.",
            "NOT_CONFIGURED"
          ),
          { status: 503 }
        );
      }

      const world = await authorizeWorldRecoveryWrite({
        agentkitHeader: req.headers.get("agentkit"),
        expectedResourceUri: req.url,
        grant,
        previewAction: preview.action,
        previewSerial: preview.serial,
        nonceStore,
      });
      if (world.status === "blocked") {
        return NextResponse.json(
          fail(`World AgentKit blocked recovery write: ${world.reason}`, "FORBIDDEN"),
          { status: 403 }
        );
      }
      worldTrust = world.publicTrust;
    }

    const approval = {
      approvedBy: grant.approvedBy,
      approvedAt: grant.approvedAt,
      source: grant.source,
    } as const;

    switch (preview.action) {
      case "book":
        return NextResponse.json({
          ok: true as const,
          result: await bookingPort.confirmBook({
            previewId: parsed.data.previewId,
            approval,
          }),
        });
      case "create_listing": {
        const delegatedAgentAddress = grant.delegatedAgentAddress?.trim();
        if (!delegatedAgentAddress) {
          return NextResponse.json(
            fail("World recovery authorization is missing delegated agent", "FORBIDDEN"),
            { status: 403 }
          );
        }
        return NextResponse.json({
          ok: true as const,
          worldTrust,
          result: await confirmWorldCreateListing({
            previewId: parsed.data.previewId,
            authorization: {
              grantId: grant.grantId,
              delegatedAgentAddress,
            },
          }),
        });
      }
      case "buy_listing":
        return NextResponse.json({
          ok: true as const,
          result: await bookingPort.confirmBuyListing({
            previewId: parsed.data.previewId,
            approval,
          }),
        });
      case "freeze":
        return NextResponse.json({
          ok: true as const,
          result: await bookingPort.confirmFreeze({
            previewId: parsed.data.previewId,
            approval,
          }),
        });
      case "unfreeze":
        return NextResponse.json({
          ok: true as const,
          result: await bookingPort.confirmUnfreeze({
            previewId: parsed.data.previewId,
            approval,
          }),
        });
      case "mark_used":
        return NextResponse.json({
          ok: true as const,
          result: await bookingPort.confirmMarkUsed({
            previewId: parsed.data.previewId,
            approval,
          }),
        });
      case "cancel_release": {
        const delegatedAgentAddress = grant.delegatedAgentAddress?.trim();
        if (!delegatedAgentAddress) {
          return NextResponse.json(
            fail("World recovery authorization is missing delegated agent", "FORBIDDEN"),
            { status: 403 }
          );
        }
        return NextResponse.json({
          ok: true as const,
          worldTrust,
          result: await confirmWorldCancelRelease({
            previewId: parsed.data.previewId,
            authorization: {
              grantId: grant.grantId,
              delegatedAgentAddress,
            },
          }),
        });
      }
    }
  } catch (e) {
    if (e instanceof RecoveryOperationReconcileError) {
      return NextResponse.json(
        {
          ok: false as const,
          error: e.message,
          code: "RECOVERY_RECONCILING" as const,
          recovery: {
            operationId: e.operationId,
            status: "reconciling" as const,
            phase: e.phase,
          },
        },
        { status: 202 }
      );
    }
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
