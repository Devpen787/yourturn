import { NextResponse } from "next/server";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import {
  getScheduleById,
  getScheduledTransactionExecution,
} from "@/lib/hedera/mirror";
import { getScheduleExecutionStatus } from "@/lib/hedera/schedule";
import {
  getLatestAutomationProofForSerial,
  upsertAutomationProof,
} from "@/lib/store/automation-proofs";
import { automationInspectBodySchema, fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = automationInspectBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    if (parsed.data.actor && parsed.data.actor !== "issuer") {
      const appUser = await requireGuestAppUser();
      if (appUser instanceof NextResponse) return appUser;
      const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
      if (denied) return denied;
    }
    const record = await getLatestAutomationProofForSerial(parsed.data.serial);
    if (!record) {
      return NextResponse.json(
        fail("No automation proof exists for this serial.", "NOT_FOUND"),
        { status: 404 }
      );
    }
    const mirrorSchedule = await getScheduleById(record.scheduleProof.scheduleId);
    const mirrorExecution = await getScheduledTransactionExecution(
      record.scheduleProof.createTxId
    );
    let status: Awaited<ReturnType<typeof getScheduleExecutionStatus>> = {
      status: "unknown",
    };
    if (mirrorSchedule?.executed_timestamp || mirrorExecution) {
      status = {
        status: "executed",
        executedAt:
          mirrorSchedule?.executed_timestamp ??
          mirrorExecution?.consensus_timestamp,
        memo: mirrorSchedule?.memo ?? record.scheduleProof.memo,
      };
    } else if (mirrorSchedule?.deleted) {
      status = {
        status: "deleted",
        memo: mirrorSchedule.memo ?? record.scheduleProof.memo,
      };
    } else if (mirrorSchedule) {
      status = {
        status: "scheduled",
        memo: mirrorSchedule.memo ?? record.scheduleProof.memo,
      };
    } else {
      try {
        status = await getScheduleExecutionStatus(record.scheduleProof.scheduleId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("INVALID_SCHEDULE_ID")) throw e;
      }
    }
    const updated = await upsertAutomationProof({
      ...record,
      scheduleProof: {
        ...record.scheduleProof,
        status: status.status,
        executedAt: status.executedAt,
        executionTxId: mirrorExecution?.transaction_id,
        executionHashscanUrl: mirrorExecution
          ? getHashscanTxUrl(mirrorExecution.transaction_id)
          : record.scheduleProof.executionHashscanUrl,
      },
    });
    return NextResponse.json({
      ok: true as const,
      proof: updated,
      scheduleStatus: status,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
