import type { OwnerPolicy, OwnerPolicySnapshot } from "@/lib/policy/policy";

export type SlotRecord = {
  tokenId: string;
  serial: number;
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  primaryPriceHbar: number;
  resaleAllowed: boolean;
  policy: OwnerPolicy;
  policySnapshot: OwnerPolicySnapshot;
  seeded: boolean;
  mintedAt: string;
  listingActive: boolean;
};
