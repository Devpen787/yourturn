function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MIRROR_BASE ||
    "https://testnet.mirrornode.hedera.com/api/v1"
  ).replace(/\/$/, "");
}

async function mirrorFetch<T>(path: string): Promise<T | null> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Mirror error ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type MirrorTokenInfo = {
  token_id: string;
  name?: string;
  symbol?: string;
  type?: string;
};

export type MirrorNftInfo = {
  account_id?: string;
  metadata?: string;
  serial_number: number;
  deleted?: boolean;
};

export type MirrorAccountNft = {
  token_id: string;
  serial_number: number;
};

export type MirrorTopicMessage = {
  consensus_timestamp: string;
  message: string;
  sequence_number: number;
};

export type MirrorScheduleInfo = {
  schedule_id: string;
  executed_timestamp?: string | null;
  deleted?: boolean;
  expiration_time?: string;
  memo?: string;
  wait_for_expiry?: boolean;
};

export type MirrorTransactionRow = {
  consensus_timestamp: string;
  name: string;
  result: string;
  scheduled?: boolean;
  transaction_id: string;
};

function mirrorTransactionId(txId: string): string {
  const clean = txId.replace(/\?scheduled$/, "");
  const [account, timestamp] = clean.split("@");
  if (account && timestamp) {
    return `${account}-${timestamp.replace(".", "-")}`;
  }
  return clean;
}

export async function getToken(
  tokenId: string
): Promise<MirrorTokenInfo | null> {
  return mirrorFetch<MirrorTokenInfo>(`/tokens/${tokenId}`);
}

export async function getNftBySerial(
  tokenId: string,
  serial: number
): Promise<MirrorNftInfo | null> {
  return mirrorFetch<MirrorNftInfo>(`/tokens/${tokenId}/nfts/${serial}`);
}

export async function getAccountNfts(
  accountId: string,
  tokenId: string
): Promise<MirrorAccountNft[]> {
  const data = await mirrorFetch<{
    nfts?: MirrorAccountNft[];
  }>(
    `/accounts/${accountId}/nfts?token.id=${encodeURIComponent(tokenId)}`
  );
  return data?.nfts ?? [];
}

export type AccountTokenBalanceRow = {
  token_id: string;
  freeze_status?: string;
};

export async function isTokenAssociatedWithAccount(
  accountId: string,
  tokenId: string
): Promise<boolean> {
  const data = await mirrorFetch<{
    tokens?: AccountTokenBalanceRow[];
  }>(`/accounts/${accountId}/tokens?token.id=${encodeURIComponent(tokenId)}`);
  return (data?.tokens?.length ?? 0) > 0;
}

export async function getAccountTokenFreezeStatus(
  accountId: string,
  tokenId: string
): Promise<boolean> {
  const data = await mirrorFetch<{
    tokens?: AccountTokenBalanceRow[];
  }>(`/accounts/${accountId}/tokens?token.id=${encodeURIComponent(tokenId)}`);
  const row = data?.tokens?.find((t) => t.token_id === tokenId);
  if (!row) return false;
  return row.freeze_status === "FROZEN";
}

export async function getTransactionsForAccount(
  accountId: string,
  limit = 20
): Promise<unknown> {
  return mirrorFetch(
    `/accounts/${accountId}/transactions?limit=${limit}&order=desc`
  );
}

export async function getTransactionById(txId: string): Promise<unknown> {
  const id = mirrorTransactionId(txId);
  return mirrorFetch(`/transactions/${id}`);
}

export async function getScheduleById(
  scheduleId: string
): Promise<MirrorScheduleInfo | null> {
  return mirrorFetch<MirrorScheduleInfo>(`/schedules/${scheduleId}`);
}

export async function getScheduledTransactionExecution(
  txId: string
): Promise<MirrorTransactionRow | null> {
  const data = await mirrorFetch<{ transactions?: MirrorTransactionRow[] }>(
    `/transactions/${mirrorTransactionId(txId)}?scheduled=true`
  );
  return data?.transactions?.find((tx) => tx.scheduled) ?? null;
}

export async function getTopicMessages(topicId: string): Promise<{
  messages?: MirrorTopicMessage[];
}> {
  const data = await mirrorFetch<{ messages?: MirrorTopicMessage[] }>(
    `/topics/${topicId}/messages?limit=100&order=desc`
  );
  return data ?? { messages: [] };
}
