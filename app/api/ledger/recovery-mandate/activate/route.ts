import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingPort } from "@/lib/adapters/booking-port";
import { requireGuestAppUser } from "@/lib/auth/guest-api-auth";
import { getActorCredentials } from "@/lib/hedera/client";
import {
  RecoveryMandateAuthorityBoundaryError,
  type RecoveryMandateAuthorityBoundaryStore,
} from "@/lib/ledger/recovery-mandate-authority-boundary";
import {
  RecoveryMandateBookingStateError,
  assertRecoveryMandateLiveBookingState,
} from "@/lib/ledger/recovery-mandate-booking-guard";
import {
  createRedisRecoveryMandateReplayStore,
  type RecoveryMandateAtomicSetStore,
} from "@/lib/ledger/recovery-mandate-replay";
import type { RecoveryMandate } from "@/lib/ledger/recovery-mandate";
import {
  activatePreparedRecoveryMandate,
  type RecoveryMandateStateStore,
} from "@/lib/ledger/recovery-mandate-state";
import { getRedis } from "@/lib/store/redis";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

const activateBodySchema = z.object({
  mandateId: z.string().uuid(),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/).min(132).max(132),
});

type LedgerMandateRedis = RecoveryMandateStateStore &
  RecoveryMandateAtomicSetStore &
  RecoveryMandateAuthorityBoundaryStore;

export async function POST(req: Request) {
  try {
    const network = process.env.HEDERA_NETWORK ?? "testnet";
    if (network !== "testnet") {
      return NextResponse.json(
        fail(
          "Ledger Recovery Mandate activation is locked to Hedera testnet for ETHOnline evidence.",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }

    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    if (!appUser.hederaPersona) {
      return NextResponse.json(
        fail(
          "This account no longer has the guest persona required to validate booking authority.",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }

    const parsed = activateBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }

    const expectedHolderAccountId = getActorCredentials(
      appUser.hederaPersona
    ).accountId.toString();

    const revalidateMutableAuthority = async (mandate: RecoveryMandate) => {
      if (mandate.bookingSerial > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RecoveryMandateBookingStateError(
          "Recovery mandate booking serial is outside the supported live-state range"
        );
      }
      const serial = Number(mandate.bookingSerial);
      const [slot, listing] = await Promise.all([
        bookingPort.getSlot(serial),
        bookingPort.getListing(serial),
      ]);
      assertRecoveryMandateLiveBookingState({
        mandate,
        live: {
          slot,
          listing,
          expectedHolderAccountId,
        },
      });
    };

    // This route deliberately does not mint or accept the legacy reusable
    // approval-grant bearer token. The prepared server-side mandate is the
    // complete expectation; its signature is consumed once through durable
    // Redis. Final active-authority creation is additionally conditional on
    // the exact serialized booking/listing state version observed around the
    // last live validation, closing the SEC-LEDGER-005 final-boundary race.
    const redis = getRedis() as unknown as LedgerMandateRedis;
    const replayStore = createRedisRecoveryMandateReplayStore(redis);
    const { verified, active } = await activatePreparedRecoveryMandate({
      store: redis,
      authorityBoundaryStore: redis,
      replayStore,
      mandateId: parsed.data.mandateId,
      ownerId: appUser.id,
      signature: parsed.data.signature,
      revalidateMutableAuthority,
    });

    return NextResponse.json({
      ok: true as const,
      network,
      evidenceLevel: "CONFIGURED" as const,
      mandateId: verified.mandate.mandateId,
      digest: verified.digest,
      signerAddress: verified.recoveredSignerAddress,
      state: active.state,
      activatedAt: active.activatedAt,
      expiresAt: active.mandate.expiresAt,
      authorityStateVersion: active.authorityStateVersion,
      authority: {
        agentId: active.mandate.agentId,
        bookingTokenId: active.mandate.bookingTokenId,
        bookingSerial: active.mandate.bookingSerial,
        allowedAction: active.mandate.allowedAction,
        minimumRecoveryAtomicUnits: active.mandate.minimumRecoveryAtomicUnits,
        settlementAsset: active.mandate.settlementAsset,
        cancellationAllowed: active.mandate.cancellationAllowed,
      },
      claimBoundary:
        "A cryptographically valid EIP-712 signature can activate the exact prepared mandate once only while live holder/status/provider-policy/listing predicates still permit it and the serialized booking authority version remains unchanged through the atomic active write. Hardware provenance remains unproven until the identical payload is signed on a Ledger through DMK.",
    });
  } catch (e) {
    if (
      e instanceof RecoveryMandateBookingStateError ||
      e instanceof RecoveryMandateAuthorityBoundaryError
    ) {
      return NextResponse.json(fail(e.message, "CONFLICT"), { status: 409 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    const isConflict =
      /already|not found|expired|does not belong|could not be stored/i.test(msg);
    return NextResponse.json(
      fail(msg, isConflict ? "CONFLICT" : "VALIDATION_ERROR"),
      { status: isConflict ? 409 : 400 }
    );
  }
}
