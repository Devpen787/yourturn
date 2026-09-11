import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import {
  RecoveryMandateAuthorityBoundaryError,
  withRecoveryMandateAuthorityMutation,
  type RecoveryMandateAuthorityBoundaryStore,
} from "@/lib/ledger/recovery-mandate-authority-boundary";
import { getRedis } from "@/lib/store/redis";
import { fail, resaleBuyBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    const parsed = resaleBuyBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
    if (denied) return denied;
    const preview = await bookingPort.previewBuyListing({
      buyer: { kind: "demoActor", id: parsed.data.actor },
      serial: parsed.data.serial,
    });
    const boundaryStore = getRedis() as unknown as RecoveryMandateAuthorityBoundaryStore;
    const result = await withRecoveryMandateAuthorityMutation({
      store: boundaryStore,
      bookingSerial: parsed.data.serial,
      mutate: () =>
        bookingPort.confirmBuyListing({
          previewId: preview.previewId,
          approval: {
            approvedBy: parsed.data.actor,
            approvedAt: new Date().toISOString(),
            source: "ui_click",
          },
        }),
    });
    return NextResponse.json({ ok: true as const, ...result });
  } catch (e) {
    if (e instanceof RecoveryMandateAuthorityBoundaryError) {
      return NextResponse.json(fail(e.message, "CONFLICT"), { status: 409 });
    }
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
