import { accountsEqual } from "../domain/account.ts";
import type { BookingSlotView, ResaleListingView } from "../types/booking-port";
import type { YourTurnToolId } from "./tool-manifest";

export type AgentPolicyCheckId =
  | "actor_is_current_holder"
  | "slot_is_held"
  | "resale_allowed"
  | "release_allowed"
  | "schedule_automation_allowed"
  | "no_duplicate_active_listing"
  | "refund_matches_booked_price"
  | "approval_present"
  | "schedule_references_serial"
  | "actor_can_view_schedule";

export type AgentPolicyCheckResult = {
  id: AgentPolicyCheckId;
  label: string;
  status: "passed" | "blocked";
  detail: string;
};

export type RecoveryPolicyInput = {
  toolId: YourTurnToolId;
  slot: Pick<
    BookingSlotView,
    | "serial"
    | "status"
    | "holderAccountId"
    | "primaryPriceHbar"
    | "policySnapshot"
    | "listingActive"
  >;
  actorAccountId?: string | null;
  activeListing?: Pick<ResaleListingView, "serial" | "active"> | null;
  askPriceHbar?: number;
  refundHbar?: number;
  approvalId?: string | null;
  scheduleSerial?: number;
};

function result(
  id: AgentPolicyCheckId,
  label: string,
  passed: boolean,
  detail: string
): AgentPolicyCheckResult {
  return {
    id,
    label,
    status: passed ? "passed" : "blocked",
    detail,
  };
}

function actorIsHolder(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed =
    !!input.actorAccountId &&
    !!input.slot.holderAccountId &&
    accountsEqual(input.actorAccountId, input.slot.holderAccountId);
  return result(
    "actor_is_current_holder",
    "Actor is current holder",
    passed,
    passed
      ? `Actor ${input.actorAccountId} matches live holder for ref #${input.slot.serial}.`
      : `Actor ${input.actorAccountId ?? "unknown"} does not match live holder ${input.slot.holderAccountId ?? "none"} for ref #${input.slot.serial}.`
  );
}

function slotIsHeld(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = input.slot.status === "HELD";
  return result(
    "slot_is_held",
    "Slot is held",
    passed,
    passed
      ? `Ref #${input.slot.serial} is held and eligible for recovery checks.`
      : `Ref #${input.slot.serial} is ${input.slot.status}; recovery mutation is blocked.`
  );
}

function resaleAllowed(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = input.slot.policySnapshot.resaleAllowed;
  return result(
    "resale_allowed",
    "Resale allowed",
    passed,
    `${input.slot.policySnapshot.label} resaleAllowed=${input.slot.policySnapshot.resaleAllowed}.`
  );
}

function releaseAllowed(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = input.slot.policySnapshot.releaseAllowed;
  return result(
    "release_allowed",
    "Release allowed",
    passed,
    `${input.slot.policySnapshot.label} releaseAllowed=${input.slot.policySnapshot.releaseAllowed}.`
  );
}

function scheduleAutomationAllowed(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = input.slot.policySnapshot.scheduleAutomationEnabled;
  return result(
    "schedule_automation_allowed",
    "Schedule automation allowed",
    passed,
    `${input.slot.policySnapshot.label} scheduleAutomationEnabled=${input.slot.policySnapshot.scheduleAutomationEnabled}.`
  );
}

function noDuplicateListing(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const active = input.slot.listingActive || input.activeListing?.active === true;
  return result(
    "no_duplicate_active_listing",
    "No duplicate listing",
    !active,
    active
      ? `Ref #${input.slot.serial} already has an active listing.`
      : `Ref #${input.slot.serial} has no active listing.`
  );
}

function refundMatchesBookedPrice(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const expected = input.slot.primaryPriceHbar;
  const refund = input.refundHbar ?? expected;
  const passed = Math.abs(refund - expected) < 0.000001;
  return result(
    "refund_matches_booked_price",
    "Refund matches booked price",
    passed,
    passed
      ? `Refund ${refund.toFixed(2)} HBAR matches booked price for ref #${input.slot.serial}.`
      : `Refund ${refund.toFixed(2)} HBAR does not match booked price ${expected.toFixed(2)} HBAR.`
  );
}

function approvalPresent(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = !!input.approvalId;
  return result(
    "approval_present",
    "Human approval present",
    passed,
    passed
      ? `Approval ${input.approvalId} is scoped to this action.`
      : "No scoped human approval id was provided."
  );
}

function scheduleReferencesSerial(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = input.scheduleSerial === input.slot.serial;
  return result(
    "schedule_references_serial",
    "Schedule references serial",
    passed,
    passed
      ? `Schedule proof references ref #${input.slot.serial}.`
      : `Schedule proof references ${input.scheduleSerial ?? "unknown"} instead of ref #${input.slot.serial}.`
  );
}

function actorCanViewSchedule(input: RecoveryPolicyInput): AgentPolicyCheckResult {
  const passed = !!input.actorAccountId;
  return result(
    "actor_can_view_schedule",
    "Actor can view schedule",
    passed,
    passed
      ? `Actor ${input.actorAccountId} can inspect non-secret schedule proof.`
      : "Schedule inspection actor is unknown."
  );
}

export function evaluateYourTurnAgentPolicies(
  input: RecoveryPolicyInput
): AgentPolicyCheckResult[] {
  const common = [actorIsHolder(input), slotIsHeld(input)];
  if (input.toolId === "yourturn.recovery.preview_listing") {
    return [...common, resaleAllowed(input), noDuplicateListing(input)];
  }
  if (input.toolId === "yourturn.recovery.confirm_listing") {
    return [
      ...common,
      resaleAllowed(input),
      scheduleAutomationAllowed(input),
      approvalPresent(input),
    ];
  }
  if (input.toolId === "yourturn.recovery.preview_refund_release") {
    return [...common, releaseAllowed(input), refundMatchesBookedPrice(input)];
  }
  if (input.toolId === "yourturn.recovery.confirm_refund_release") {
    return [
      ...common,
      releaseAllowed(input),
      refundMatchesBookedPrice(input),
      approvalPresent(input),
    ];
  }
  if (input.toolId === "yourturn.automation.inspect_schedule") {
    return [scheduleReferencesSerial(input), actorCanViewSchedule(input)];
  }
  return common;
}

export function policyChecksPassed(checks: AgentPolicyCheckResult[]): boolean {
  return checks.every((check) => check.status === "passed");
}
