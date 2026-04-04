import { TopicCreateTransaction, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import type { LifecycleEvent } from "@/lib/types/event";
import { getClient, getActorCredentials } from "./client";

export async function createTopic(): Promise<string> {
  const client = getClient();
  const issuer = getActorCredentials("issuer");
  const tx = await new TopicCreateTransaction()
    .setTopicMemo("Booked Rights v1 lifecycle events")
    .setSubmitKey(issuer.privateKey.publicKey)
    .freezeWith(client);
  const signed = await tx.sign(issuer.privateKey);
  const receipt = (await (await signed.execute(client)).getReceipt(client));
  const id = receipt.topicId;
  if (!id) throw new Error("Topic creation missing topicId");
  return id.toString();
}

export async function submitLifecycleEvent(
  topicId: string,
  event: LifecycleEvent
): Promise<void> {
  const client = getClient();
  const issuer = getActorCredentials("issuer");
  const payload = JSON.stringify(event);
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(payload)
    .freezeWith(client);
  const signed = await tx.sign(issuer.privateKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}
