import { getToken } from "@/lib/hedera/mirror";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { loadSlots } from "@/lib/store/slots";
import { IssuerPanel } from "./IssuerPanel";

export const dynamic = "force-dynamic";

export default async function IssuerPage() {
  let tokenId: string | null = null;
  let topicId: string | null = null;
  let slots: Awaited<ReturnType<typeof loadSlots>> = [];
  try {
    tokenId = await getStoredTokenId();
    topicId = await getStoredTopicId();
    slots = await loadSlots();
  } catch {
    /* Redis / env not configured */
  }
  const tokenMirror = tokenId ? await getToken(tokenId) : null;
  return (
    <IssuerPanel
      tokenId={tokenId}
      topicId={topicId}
      tokenExists={!!tokenMirror}
      slotsCount={slots.length}
    />
  );
}
