import { getAddress } from "ethers";
import type { HederaPersona } from "@/lib/types/hedera-persona";

const ENROLLED_SIGNER_ENV: Record<HederaPersona, string> = {
  guestA: "LEDGER_GUEST_A_SIGNER_ADDRESS",
  guestB: "LEDGER_GUEST_B_SIGNER_ADDRESS",
};

export class LedgerSignerEnrollmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerSignerEnrollmentError";
  }
}

/**
 * Resolve the Ledger signer independently from the mandate-preparation request.
 *
 * For the ETHOnline demo accounts, enrollment is server-controlled configuration
 * keyed by the signed session's Hedera persona. The client cannot select or
 * override the signer address in the prepare request. The configured address is
 * public identity material, never a private key.
 *
 * A later real DMK enrollment ceremony may populate the same server-side
 * binding; until that exists, this is CONFIGURED evidence only and must not be
 * described as hardware provenance.
 */
export function resolveEnrolledLedgerSignerAddress(
  persona: HederaPersona,
  env: NodeJS.ProcessEnv = process.env
): string {
  const envKey = ENROLLED_SIGNER_ENV[persona];
  const raw = env[envKey]?.trim();
  if (!raw) {
    throw new LedgerSignerEnrollmentError(
      `Ledger signer enrollment is not configured for ${persona}.`
    );
  }

  try {
    return getAddress(raw);
  } catch {
    throw new LedgerSignerEnrollmentError(
      `Ledger signer enrollment is invalid for ${persona}.`
    );
  }
}
