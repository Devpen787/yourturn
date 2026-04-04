export type ImmutableSlotMetadata = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  issuerName: string;
};

/** Hedera NFT metadata is capped at 100 bytes per serial. */
export const HEDERA_NFT_METADATA_MAX_BYTES = 100;

export function buildNftMetadataBlob(meta: ImmutableSlotMetadata): Uint8Array {
  const payload = { slotId: meta.slotId };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.length > HEDERA_NFT_METADATA_MAX_BYTES) {
    throw new Error(
      `NFT metadata exceeds Hedera limit (${bytes.length} > ${HEDERA_NFT_METADATA_MAX_BYTES} bytes); shorten slotId`
    );
  }
  return bytes;
}

export function parseNftMetadataBlob(bytes: string | undefined): ImmutableSlotMetadata | null {
  if (!bytes) return null;
  try {
    const raw = Buffer.from(bytes, "base64").toString("utf8");
    const parsed = JSON.parse(raw) as Partial<ImmutableSlotMetadata>;
    if (!parsed.slotId || typeof parsed.slotId !== "string") return null;
    return {
      slotId: parsed.slotId,
      title: typeof parsed.title === "string" ? parsed.title : "",
      startTime: typeof parsed.startTime === "string" ? parsed.startTime : "",
      endTime: typeof parsed.endTime === "string" ? parsed.endTime : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      issuerName: typeof parsed.issuerName === "string" ? parsed.issuerName : "",
    };
  } catch {
    return null;
  }
}
