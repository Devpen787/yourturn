export type ImmutableSlotMetadata = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  issuerName: string;
};

/** Hedera TokenMint NFT metadata is capped at 100 bytes per serial (METADATA_TOO_LONG otherwise). */
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
    const j = JSON.parse(raw) as Partial<ImmutableSlotMetadata>;
    if (!j.slotId || typeof j.slotId !== "string") return null;
    return {
      slotId: j.slotId,
      title: typeof j.title === "string" ? j.title : "",
      startTime: typeof j.startTime === "string" ? j.startTime : "",
      endTime: typeof j.endTime === "string" ? j.endTime : "",
      location: typeof j.location === "string" ? j.location : "",
      issuerName: typeof j.issuerName === "string" ? j.issuerName : "",
    };
  } catch {
    return null;
  }
}
