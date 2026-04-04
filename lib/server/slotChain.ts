import { deriveSlotStatus } from "@/lib/domain/status";
import type { SlotStatus } from "@/lib/domain/guards";
import {
  getAccountTokenFreezeStatus,
  getNftBySerial,
} from "@/lib/hedera/mirror";

export async function readSlotChainState(args: {
  tokenId: string;
  serial: number;
  treasuryAccountId: string;
}): Promise<{
  burned: boolean;
  holderAccountId: string | null;
  frozenForToken: boolean;
  status: SlotStatus;
}> {
  const nft = await getNftBySerial(args.tokenId, args.serial);
  const burned = nft?.deleted === true;
  const holderAccountId =
    burned || !nft?.account_id ? null : nft.account_id;
  const frozenForToken =
    holderAccountId != null
      ? await getAccountTokenFreezeStatus(holderAccountId, args.tokenId)
      : false;
  const status = deriveSlotStatus({
    burned,
    holderAccountId,
    treasuryAccountId: args.treasuryAccountId,
    frozenForToken,
  });
  return { burned, holderAccountId, frozenForToken, status };
}
