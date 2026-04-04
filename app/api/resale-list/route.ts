import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import { fail, resaleListBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    const parsed = resaleListBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
    if (denied) return denied;
    const preview = await bookingPort.previewCreateListing({
      seller: { kind: "demoActor", id: parsed.data.actor },
      serial: parsed.data.serial,
      askPriceHbar: parsed.data.askPriceHbar,
    });
    const result = await bookingPort.confirmCreateListing({
      previewId: preview.previewId,
      approval: {
        approvedBy: parsed.data.actor,
        approvedAt: new Date().toISOString(),
        source: "ui_click",
      },
    });
    return NextResponse.json({
      ok: true as const,
      listing: {
        serial: result.listing.serial,
        sellerAccountId: result.listing.sellerAccountId,
        askPriceHbar: result.listing.askPriceHbar,
        active: result.listing.active,
      },
      auditTxId: result.auditTxId,
      hashscanUrl: result.hashscanUrl,
    });
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
