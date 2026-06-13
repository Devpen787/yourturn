import type { OwnerPolicy } from "@/lib/policy/policy";

export type DemoSlotSeed = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  issuerName: string;
  primaryPriceHbar: number;
  resaleAllowed: boolean;
  policy?: OwnerPolicy;
};
