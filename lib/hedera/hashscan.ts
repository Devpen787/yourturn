const base = () =>
  process.env.NEXT_PUBLIC_HASHSCAN_BASE || "https://hashscan.io/testnet";

export function getHashscanTxUrl(txId: string): string {
  const id = txId.includes("@") ? txId.replace("@", "-") : txId;
  return `${base()}/transaction/${id}`;
}

export function getHashscanTokenUrl(tokenId: string): string {
  return `${base()}/token/${tokenId}`;
}

export function getHashscanTopicUrl(topicId: string): string {
  return `${base()}/topic/${topicId}`;
}

export function getHashscanScheduleUrl(scheduleId: string): string {
  return `${base()}/schedule/${scheduleId}`;
}
