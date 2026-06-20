export type Hip412Attribute = {
  trait_type: string;
  value: string | number | boolean;
};

export type BookingRightHip412Metadata = {
  name: string;
  description: string;
  image: string;
  type: string;
  creator: string;
  attributes: Hip412Attribute[];
};

export type BookingRightMetadataInput = {
  serial: number;
  tokenId: string;
  slotId: string;
  title?: string;
  startTime?: string;
  location?: string;
  issuerName?: string;
  policyLabel?: string;
  resaleAllowed?: boolean;
  releaseAllowed?: boolean;
};

type TokenRiskInput = {
  token_id?: string;
  name?: string;
  symbol?: string;
  type?: string;
  admin_key?: unknown;
  supply_key?: unknown;
  freeze_key?: unknown;
  wipe_key?: unknown;
  kyc_key?: unknown;
  pause_key?: unknown;
  fee_schedule_key?: unknown;
  custom_fees?: {
    royalty_fees?: unknown[];
    fixed_fees?: unknown[];
    fractional_fees?: unknown[];
  };
};

export function buildBookingRightHip412Metadata(
  input: BookingRightMetadataInput,
  baseUrl = "https://yourturn-sage.vercel.app"
): BookingRightHip412Metadata {
  const title = input.title?.trim() || `Booking right #${input.serial}`;
  return {
    name: `YourTurn Booking Right #${input.serial}`,
    description:
      `Transferable booked-service right for ${title}. ` +
      "Mutable lifecycle state is verified through Hedera Mirror Node and HCS, not stored in NFT metadata.",
    image: `${baseUrl.replace(/\/$/, "")}/api/nft-studio/booking-rights/${input.serial}/image`,
    type: "image/svg+xml",
    creator: "YourTurn Concierge",
    attributes: [
      { trait_type: "Token ID", value: input.tokenId },
      { trait_type: "Serial", value: input.serial },
      { trait_type: "Slot ID", value: input.slotId },
      { trait_type: "Right Type", value: "Booked service slot" },
      { trait_type: "Issuer", value: input.issuerName || "Provider" },
      { trait_type: "Policy", value: input.policyLabel || "Booked-time owner policy" },
      { trait_type: "Resale Allowed", value: input.resaleAllowed ?? false },
      { trait_type: "Release Allowed", value: input.releaseAllowed ?? false },
      ...(input.startTime ? [{ trait_type: "Start Time", value: input.startTime }] : []),
      ...(input.location ? [{ trait_type: "Location", value: input.location }] : []),
    ],
  };
}

export function validateBookingRightHip412Metadata(
  metadata: BookingRightHip412Metadata
) {
  const checks = [
    {
      id: "name",
      status: metadata.name.trim().length > 0 ? "passed" : "failed",
      detail: "Metadata includes a display name.",
    },
    {
      id: "description",
      status: metadata.description.trim().length > 0 ? "passed" : "failed",
      detail: "Metadata includes a human-readable description.",
    },
    {
      id: "image",
      status: /^https?:\/\//.test(metadata.image) ? "passed" : "failed",
      detail: "Metadata image points to a retrievable HTTP(S) URL.",
    },
    {
      id: "type",
      status: metadata.type === "image/svg+xml" ? "passed" : "failed",
      detail: "Metadata declares the media type used by the generated proof image.",
    },
    {
      id: "attributes",
      status: metadata.attributes.length >= 6 ? "passed" : "failed",
      detail: "Metadata includes structured HIP-412-style attributes.",
    },
  ] as const;
  return {
    ok: checks.every((check) => check.status === "passed"),
    standard: "HIP-412-style NFT metadata JSON",
    checks,
  };
}

function present(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "object" && "key" in value) {
    return Boolean((value as { key?: unknown }).key);
  }
  return true;
}

export function assessBookingRightTokenRisk(token: TokenRiskInput | null) {
  const royaltyCount = token?.custom_fees?.royalty_fees?.length ?? 0;
  const fixedFeeCount = token?.custom_fees?.fixed_fees?.length ?? 0;
  const controls = [
    {
      id: "admin_key",
      status: present(token?.admin_key) ? "intentional" : "absent",
      rationale: "Provider can administer the demo token configuration.",
    },
    {
      id: "supply_key",
      status: present(token?.supply_key) ? "intentional" : "absent",
      rationale: "Provider can mint booking-right serials for planned sessions.",
    },
    {
      id: "freeze_key",
      status: present(token?.freeze_key) ? "intentional" : "absent",
      rationale: "Provider can pause movement when a pass needs intervention.",
    },
    {
      id: "wipe_key",
      status: present(token?.wipe_key) ? "review" : "absent",
      rationale: "Wipe is not required for the current recovery flow.",
    },
    {
      id: "kyc_key",
      status: present(token?.kyc_key) ? "review" : "absent",
      rationale: "KYC is not used in the current demo accounts.",
    },
    {
      id: "pause_key",
      status: present(token?.pause_key) ? "review" : "absent",
      rationale: "Account-level freeze is enough for this demo.",
    },
    {
      id: "royalty_fee",
      status: royaltyCount > 0 ? "intentional" : "absent",
      rationale: "Royalty fee proves provider economics on secondary movement.",
    },
    {
      id: "fixed_fee",
      status: fixedFeeCount > 0 ? "review" : "absent",
      rationale: "No fixed fallback fee is needed for the demo resale path.",
    },
  ];
  return {
    ok: Boolean(token?.token_id),
    tokenId: token?.token_id ?? null,
    tokenName: token?.name ?? null,
    tokenSymbol: token?.symbol ?? null,
    tokenType: token?.type ?? null,
    riskLevel: controls.some((control) => control.status === "review")
      ? "review-controls"
      : "expected-controls",
    summary:
      "Booking-right token controls are intentional for issuer lifecycle management; mutable booking state remains in Mirror/HCS/app records rather than mutable NFT metadata.",
    controls,
  };
}
