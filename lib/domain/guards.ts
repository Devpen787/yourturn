export type SlotStatus = "AVAILABLE" | "HELD" | "FROZEN" | "USED";

export function canBook(status: SlotStatus): boolean {
  return status === "AVAILABLE";
}

export function canResell(args: {
  status: SlotStatus;
  resaleAllowed: boolean;
}): boolean {
  return (
    args.status === "HELD" && args.resaleAllowed === true
  );
}

export function canFreeze(_status: SlotStatus): boolean {
  return true;
}

export function canBurn(status: SlotStatus): boolean {
  return status !== "USED";
}
