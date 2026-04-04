import { deriveSlotStatus } from "@/lib/domain/status";
import type { SlotStatus } from "@/lib/domain/guards";
import type { LifecycleEvent } from "@/lib/types/event";
import {
  getAccountTokenFreezeStatus,
  getNftBySerial,
  getTopicMessages,
} from "@/lib/hedera/mirror";
import { accountsEqual } from "@/lib/hedera/client";

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

export async function getLifecycleEventsForSerial(args: {
  topicId: string | null;
  tokenId: string;
  serial: number;
}): Promise<LifecycleEvent[]> {
  if (!args.topicId) return [];
  const messages = await getTopicMessages(args.topicId);
  return (
    messages.messages
      ?.flatMap((message) => {
        try {
          const decoded = JSON.parse(
            Buffer.from(message.message, "base64").toString("utf8")
          ) as LifecycleEvent;
          if (decoded.tokenId !== args.tokenId || decoded.serial !== args.serial) {
            return [];
          }
          return [decoded];
        } catch {
          return [];
        }
      })
      .reverse() ?? []
  );
}

export async function readSlotLiveState(args: {
  tokenId: string;
  serial: number;
  treasuryAccountId: string;
  topicId?: string | null;
}): Promise<{
  burned: boolean;
  holderAccountId: string | null;
  frozenForToken: boolean;
  status: SlotStatus;
}> {
  const chain = await readSlotChainState(args);
  const latest = (
    await getLifecycleEventsForSerial({
      topicId: args.topicId ?? null,
      tokenId: args.tokenId,
      serial: args.serial,
    })
  ).at(-1);

  if (!latest) return chain;

  if (latest.eventType === "USED") {
    return {
      burned: true,
      holderAccountId: null,
      frozenForToken: false,
      status: "USED",
    };
  }

  if (latest.eventType === "FROZEN") {
    return {
      burned: chain.burned,
      holderAccountId: latest.to ?? chain.holderAccountId,
      frozenForToken: true,
      status: "FROZEN",
    };
  }

  if (latest.eventType === "UNFROZEN") {
    const holderAccountId = latest.to ?? chain.holderAccountId;
    if (
      holderAccountId &&
      !accountsEqual(holderAccountId, args.treasuryAccountId) &&
      chain.status !== "USED"
    ) {
      return {
        burned: false,
        holderAccountId,
        frozenForToken: false,
        status: "HELD",
      };
    }
  }

  if (
    (latest.eventType === "BOOKED" || latest.eventType === "RESOLD") &&
    latest.to &&
    (chain.status === "AVAILABLE" || !chain.holderAccountId)
  ) {
    return {
      burned: false,
      holderAccountId: latest.to,
      frozenForToken: false,
      status: "HELD",
    };
  }

  return chain;
}
