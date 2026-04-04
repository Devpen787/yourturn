export type ImmutableSlotMetadata = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  issuerName: string;
};

export function buildNftMetadataBlob(meta: ImmutableSlotMetadata): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(meta));
}

export function parseNftMetadataBlob(bytes: string | undefined): ImmutableSlotMetadata | null {
  if (!bytes) return null;
  try {
    const raw = Buffer.from(bytes, "base64").toString("utf8");
    return JSON.parse(raw) as ImmutableSlotMetadata;
  } catch {
    return null;
  }
}
