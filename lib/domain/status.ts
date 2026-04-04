import type { SlotStatus } from "./guards";
import { accountsEqual } from "@/lib/hedera/client";

export type DeriveSlotStatusArgs = {
  burned: boolean;
  holderAccountId: string | null;
  treasuryAccountId: string;
  frozenForToken: boolean;
};

export function deriveSlotStatus(args: DeriveSlotStatusArgs): SlotStatus {
  if (args.burned) return "USED";
  if (
    !args.holderAccountId ||
    accountsEqual(args.holderAccountId, args.treasuryAccountId)
  )
    return "AVAILABLE";
  if (args.frozenForToken) return "FROZEN";
  return "HELD";
}
