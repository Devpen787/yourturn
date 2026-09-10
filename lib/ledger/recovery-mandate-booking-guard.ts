import { accountsEqual } from "../hedera/client.ts";
import type { BookingSlotView, ResaleListingView } from "../types/booking-port.ts";
import type { RecoveryMandate } from "./recovery-mandate.ts";

const MAX_SAFE_SERIAL = BigInt(Number.MAX_SAFE_INTEGER);

export class RecoveryMandateBookingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryMandateBookingStateError";
  }
}

export type RecoveryMandateLiveBookingState = {
  slot: BookingSlotView | null;
  listing: ResaleListingView | null;
  expectedHolderAccountId: string;
};

function mandateSerialAsNumber(mandate: RecoveryMandate): number {
  if (mandate.bookingSerial <= BigInt(0) || mandate.bookingSerial > MAX_SAFE_SERIAL) {
    throw new RecoveryMandateBookingStateError(
      "Recovery mandate booking serial is outside the supported live-state range"
    );
  }
  return Number(mandate.bookingSerial);
}

/**
 * Fail-closed validation for the mutable product predicates that made a
 * Recovery Mandate eligible when it was prepared. A valid Ledger signature is
 * necessary but never sufficient if the booking has changed underneath it.
 */
export function assertRecoveryMandateLiveBookingState(input: {
  mandate: RecoveryMandate;
  live: RecoveryMandateLiveBookingState;
}): void {
  const serial = mandateSerialAsNumber(input.mandate);
  const { slot, listing, expectedHolderAccountId } = input.live;

  if (!slot) {
    throw new RecoveryMandateBookingStateError(
      "Recovery mandate booking no longer exists in the current schedule"
    );
  }
  if (slot.serial !== serial || slot.tokenId !== input.mandate.bookingTokenId) {
    throw new RecoveryMandateBookingStateError(
      "Recovery mandate booking identity changed after preparation"
    );
  }
  if (slot.status !== "HELD") {
    throw new RecoveryMandateBookingStateError(
      "Recovery mandate booking is no longer held and transferable"
    );
  }

  // Both the booked-time entitlement and the provider's current resale policy
  // must still permit the action. `resaleAllowed` is the normalized current
  // slot flag; `policy.resaleAllowed` is kept explicit so policy mutation
  // cannot be hidden by a stale snapshot.
  if (
    slot.policySnapshot.resaleAllowed !== true ||
    slot.resaleAllowed !== true ||
    slot.policy.resaleAllowed !== true
  ) {
    throw new RecoveryMandateBookingStateError(
      "Provider resale recovery policy no longer permits this mandate"
    );
  }

  if (slot.listingActive || listing?.active) {
    throw new RecoveryMandateBookingStateError(
      "Recovery mandate conflicts with an active resale listing"
    );
  }

  if (
    !slot.holderAccountId ||
    !accountsEqual(slot.holderAccountId, expectedHolderAccountId)
  ) {
    throw new RecoveryMandateBookingStateError(
      "Recovery mandate booking holder changed after preparation"
    );
  }
}
