import { NextResponse } from "next/server";
import { bookingPort } from "@/lib/adapters/booking-port";
import { requireGuestAppUser } from "@/lib/auth/guest-api-auth";
import { getActorCredentials } from "@/lib/hedera/client";
import {
  RecoveryMandateBookingStateError,
  assertRecoveryMandateLiveBookingState,
} from "@/lib/ledger/recovery-mandate-booking-guard";
import type { RecoveryMandate } from "@/lib/ledger/recovery-mandate";
import { loadProvisionedPublicEnrollmentFromEnvironment } from "@/lib/policy/public-enrollment-server-config";
import { createCanonicalWorldConfirmHandler } from "@/lib/recovery/canonical-world-http";
import { createCanonicalWorldRuntime } from "@/lib/recovery/canonical-world-runtime";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";
const RESOURCE_ENV = "YOURTURN_WORLD_RESOURCE_URI";

async function handle(req: Request) {
  try {
    if ((process.env.HEDERA_NETWORK ?? "testnet") !== "testnet") {
      return NextResponse.json(fail("Canonical delegated recovery is locked to Hedera testnet for ETHOnline evidence.", "NOT_CONFIGURED"), { status: 503 });
    }
    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    if (!appUser.hederaPersona) {
      return NextResponse.json(fail("This account has no verified guest Hedera persona for the holder-authority check.", "NOT_CONFIGURED"), { status: 503 });
    }
    const resourceUri = process.env[RESOURCE_ENV];
    if (!resourceUri) return NextResponse.json(fail(`Missing ${RESOURCE_ENV}.`, "NOT_CONFIGURED"), { status: 503 });
    const provisioned = loadProvisionedPublicEnrollmentFromEnvironment();
    const expectedHolderAccountId = getActorCredentials(appUser.hederaPersona).accountId.toString();
    const revalidateMutableAuthority = async (mandate: RecoveryMandate) => {
      if (mandate.ownerId !== appUser.id) throw new RecoveryMandateBookingStateError("Recovery mandate owner no longer matches the authenticated owner");
      if (mandate.bookingSerial > BigInt(Number.MAX_SAFE_INTEGER)) throw new RecoveryMandateBookingStateError("Recovery mandate booking serial is outside the supported live-state range");
      const serial = Number(mandate.bookingSerial);
      const [slot, listing] = await Promise.all([bookingPort.getSlot(serial), bookingPort.getListing(serial)]);
      assertRecoveryMandateLiveBookingState({ mandate, live: { slot, listing, expectedHolderAccountId } });
    };
    const dependencies = createCanonicalWorldRuntime({
      authenticatedOwnerId: appUser.id,
      expectedHolderAccountId,
      resourceUri,
      publicEnrollmentManifest: provisioned.manifest,
      revalidateMutableAuthority,
    });
    const handler = createCanonicalWorldConfirmHandler({
      dependencies,
      resourceUri,
      // Authentication was already performed above from the signed application
      // session. AgentKit proves the exact delegated requester; it never chooses
      // Maya's owner id from request JSON or the World signature.
      authenticateOwner: async () => ({ ownerId: appUser.id }),
    });
    return handler(req);
  } catch (error) {
    if (error instanceof RecoveryMandateBookingStateError) {
      return NextResponse.json(fail(error.message, "CONFLICT"), { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(fail(message, "NOT_CONFIGURED"), { status: 503 });
  }
}

/** Read-only canonical challenge; no World nonce or operation is consumed. */
export async function GET(req: Request) { return handle(req); }
/** Fresh AgentKit-signed confirmation/status path. No legacy ApprovalGrant exists. */
export async function POST(req: Request) { return handle(req); }
