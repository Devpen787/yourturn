import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import { YOURTURN_AGENT_NAME } from "@/lib/hedera-agent-kit/tool-manifest";
import { accountsEqual, getActorCredentials } from "@/lib/hedera/client";
import {
  RECOVERY_MANDATE_DOMAIN,
  RECOVERY_MANDATE_TYPES,
  buildRecoveryMandateTypedData,
  type RecoveryMandate,
} from "@/lib/ledger/recovery-mandate";
import {
  storePreparedRecoveryMandate,
  type RecoveryMandateStateStore,
} from "@/lib/ledger/recovery-mandate-state";
import { getRedis } from "@/lib/store/redis";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

const prepareBodySchema = z.object({
  actor: z.enum(["guestA", "guestB"]),
  serial: z.number().int().positive(),
  ledgerSignerAddress: z.string().min(1),
  minimumRecoveryAtomicUnits: z.string().regex(/^[1-9]\d*$/),
  expiresInSeconds: z.number().int().min(300).max(24 * 60 * 60),
});

const EIP712_DOMAIN_TYPES = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "salt", type: "bytes32" },
] as const;

function jsonSafeMandate(mandate: RecoveryMandate) {
  return {
    ...mandate,
    bookingSerial: mandate.bookingSerial.toString(),
    minimumRecoveryAtomicUnits: mandate.minimumRecoveryAtomicUnits.toString(),
    expiresAt: mandate.expiresAt.toString(),
    issuedAt: mandate.issuedAt.toString(),
  };
}

function formatUsdc(atomicUnits: bigint): string {
  const whole = atomicUnits / BigInt(1_000_000);
  const fraction = (atomicUnits % BigInt(1_000_000))
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export async function POST(req: Request) {
  try {
    const network = process.env.HEDERA_NETWORK ?? "testnet";
    if (network !== "testnet") {
      return NextResponse.json(
        fail(
          "Ledger Recovery Mandate preparation is locked to Hedera testnet for ETHOnline evidence.",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }

    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;

    const parsed = prepareBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }

    const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
    if (denied) return denied;

    const slot = await bookingPort.getSlot(parsed.data.serial);
    if (!slot) {
      return NextResponse.json(
        fail("This booking is not part of the current schedule.", "NOT_FOUND"),
        { status: 404 }
      );
    }
    if (slot.status !== "HELD") {
      return NextResponse.json(
        fail("Only a currently held booking can receive recovery authority.", "CONFLICT"),
        { status: 409 }
      );
    }
    if (!slot.policySnapshot.resaleAllowed) {
      return NextResponse.json(
        fail("The booked provider policy does not allow resale recovery.", "CONFLICT"),
        { status: 409 }
      );
    }
    const activeListing = await bookingPort.getListing(parsed.data.serial);
    if (activeListing?.active) {
      return NextResponse.json(
        fail("This booking already has an active resale listing.", "CONFLICT"),
        { status: 409 }
      );
    }

    const actorAccountId = getActorCredentials(parsed.data.actor).accountId.toString();
    if (!slot.holderAccountId || !accountsEqual(slot.holderAccountId, actorAccountId)) {
      return NextResponse.json(
        fail("Only the current booking holder can prepare recovery authority.", "FORBIDDEN"),
        { status: 403 }
      );
    }

    const nowUnixSeconds = BigInt(Math.floor(Date.now() / 1000));
    const minimumRecoveryAtomicUnits = BigInt(
      parsed.data.minimumRecoveryAtomicUnits
    );
    const settlementAsset = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";
    const mandate: RecoveryMandate = {
      mandateId: randomUUID(),
      ownerId: appUser.id,
      ledgerSignerAddress: parsed.data.ledgerSignerAddress,
      agentId: YOURTURN_AGENT_NAME,
      bookingTokenId: slot.tokenId,
      bookingSerial: BigInt(slot.serial),
      allowedAction: "resale",
      minimumRecoveryAtomicUnits,
      settlementAsset,
      expiresAt: nowUnixSeconds + BigInt(parsed.data.expiresInSeconds),
      nonce: randomUUID(),
      cancellationAllowed: false,
      issuedAt: nowUnixSeconds,
    };

    const typed = buildRecoveryMandateTypedData(mandate);
    const redis = getRedis() as unknown as RecoveryMandateStateStore;
    await storePreparedRecoveryMandate({
      store: redis,
      mandate: typed.value,
      ownerId: appUser.id,
      nowUnixSeconds,
    });

    const message = jsonSafeMandate(typed.value);
    const expiresAtIso = new Date(
      Number(typed.value.expiresAt) * 1000
    ).toISOString();
    const humanSummary = `Allow ${YOURTURN_AGENT_NAME} to resell booking #${slot.serial} for at least ${formatUsdc(
      minimumRecoveryAtomicUnits
    )} USDC until ${expiresAtIso}. Cancellation is not allowed.`;

    return NextResponse.json({
      ok: true as const,
      network,
      evidenceLevel: "CONFIGURED" as const,
      mandateId: typed.value.mandateId,
      humanSummary,
      mandate: message,
      ledger: {
        signerAddress: typed.value.ledgerSignerAddress,
        derivationPath: "44'/60'/0'/0/0",
        method: "@ledgerhq/device-signer-kit-ethereum signTypedData",
        typedData: {
          domain: typed.domain,
          types: {
            EIP712Domain: EIP712_DOMAIN_TYPES,
            ...typed.types,
          },
          primaryType: "RecoveryMandate",
          message,
        },
      },
      claimBoundary:
        "Prepared server-bound EIP-712 data only. No Ledger hardware approval is claimed until this exact payload is signed/rejected on a real device.",
    });
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
