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
      case "create_listing":
        return NextResponse.json({
          ok: true as const,
          result: await bookingPort.confirmCreateListing({
            previewId: parsed.data.previewId,
            approval,
          }),
        });
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
    }
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
