import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import { accountsEqual, getActorCredentials } from "@/lib/hedera/client";
import { fail, recoveryPreviewBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

function blocked(reason: string, code: string) {
  return NextResponse.json({
    ok: true as const,
    status: "blocked" as const,
    reason,
    code,
  });
}

export async function POST(req: Request) {
  try {
    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    const parsed = recoveryPreviewBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
    if (denied) return denied;

    const actor = parsed.data.actor;
    const serial = parsed.data.serial;
    const slot = await bookingPort.getSlot(serial);
    if (!slot) {
      return blocked(
        "This ref is not part of the current demo schedule.",
        "UNKNOWN_SERIAL"
      );
    }

    const requestedAction = parsed.data.action;
    const activeListing = await bookingPort.getListing(serial);
    if (activeListing?.active) {
      return NextResponse.json({
        ok: true as const,
        status: "already_listed" as const,
        listing: activeListing,
        recommendation: {
          action: "view_listing" as const,
          reason: "This pass is already listed for resale.",
        },
      });
    }

    if (slot.status === "AVAILABLE") {
      return blocked(
        "No customer holds this pass yet, so there is nothing to recover.",
        "NOT_HELD"
      );
    }
    if (slot.status === "FROZEN") {
      return blocked(
        "The provider has paused this pass. It can be recovered after the provider reopens it.",
        "FROZEN"
      );
    }
    if (slot.status === "USED") {
      return blocked(
        "This pass has already been checked in and closed.",
        "USED"
      );
    }
    if (requestedAction === "create_listing" && !slot.policySnapshot.resaleAllowed) {
      return blocked(
        "The provider policy active when this pass was booked does not allow resale recovery.",
        "RESALE_NOT_ALLOWED"
      );
    }
    if (
      requestedAction === "cancel_release_refund" &&
      !slot.policySnapshot.releaseAllowed
    ) {
      return blocked(
        "The provider policy active when this pass was booked does not allow release recovery.",
        "RELEASE_NOT_ALLOWED"
      );
    }

    const actorAccountId = getActorCredentials(actor).accountId.toString();
    if (!slot.holderAccountId || !accountsEqual(slot.holderAccountId, actorAccountId)) {
      return blocked(
        "Only the current holder can start recovery for this pass.",
        "NOT_CURRENT_HOLDER"
      );
    }

    if (requestedAction === "cancel_release_refund") {
      const preview = await bookingPort.previewCancelRelease({
        holder: { kind: "demoActor", id: actor },
        serial,
      });
      return NextResponse.json({
        ok: true as const,
        status: "recommended" as const,
        action: "cancel_release_refund" as const,
        previewId: preview.previewId,
        expiresAt: preview.expiresAt,
        summary: preview.summary,
        refund: preview.details,
        recommendation: {
          action: "cancel_release_refund" as const,
          reason:
            "Release returns this pass to the provider, closes it, and sends a real testnet HBAR refund to the current holder.",
          proofTarget: "HBAR refund transfer + HCS release audit",
        },
        policyBasis: {
          releaseAllowed: slot.policySnapshot.releaseAllowed,
          ownerRoyaltyPercent: slot.policySnapshot.ownerRoyaltyPercent,
          snapshotId: slot.policySnapshot.snapshotId,
          label: slot.policySnapshot.label,
          source: "booked_policy_snapshot" as const,
        },
      });
    }

    const askPriceHbar = parsed.data.askPriceHbar ?? slot.primaryPriceHbar;
    const preview = await bookingPort.previewCreateListing({
      seller: { kind: "demoActor", id: actor },
      serial,
      askPriceHbar,
    });

    return NextResponse.json({
      ok: true as const,
      status: "recommended" as const,
      action: "create_listing" as const,
      previewId: preview.previewId,
      expiresAt: preview.expiresAt,
      summary: preview.summary,
      listing: preview.details,
      recommendation: {
        action: "create_listing" as const,
        reason:
          "Listing this pass lets another customer take it over under the provider policy active when it was booked.",
        proofTarget: "HCS listing audit",
      },
      policyBasis: {
        resaleAllowed: slot.policySnapshot.resaleAllowed,
        ownerRoyaltyPercent: slot.policySnapshot.ownerRoyaltyPercent,
        snapshotId: slot.policySnapshot.snapshotId,
        label: slot.policySnapshot.label,
        source: "booked_policy_snapshot" as const,
      },
    });
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
