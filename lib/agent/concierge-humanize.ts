export type HumanRecoveryAction = "create_listing" | "cancel_release_refund";

export type ConciergeHumanCopy = {
  customerIntent: string;
  actionLabel: string;
  shortLabel: string;
  buttonLabel: string;
  approvalLabel: string;
  previewLabel: string;
  previewingLabel: string;
  workingLabel: string;
  summary: string;
  previewSuccess: string;
  approvalWarning: string;
  proofPlainEnglish: string;
  checks: string[];
};

export function getConciergeHumanCopy(
  action: HumanRecoveryAction
): ConciergeHumanCopy {
  if (action === "cancel_release_refund") {
    return {
      customerIntent: "I want to give this booking back",
      actionLabel: "Release it for refund",
      shortLabel: "Refund",
      buttonLabel: "Check refund option",
      approvalLabel: "Approve refund",
      previewLabel: "Check options",
      previewingLabel: "Checking...",
      workingLabel: "Sending refund...",
      summary:
        "Concierge checks whether the provider allows release, then prepares a refund that closes the booking right.",
      previewSuccess:
        "Concierge found a release option. Nothing moves until you approve it.",
      approvalWarning:
        "This moves real testnet HBAR from the provider treasury to the holder and closes the booking right.",
      proofPlainEnglish:
        "Hedera proof will show the refund transaction, the pass return/close action, the approval, and the policy checks.",
      checks: [
        "Current holder matches your account",
        "Provider allows release for this booking",
        "Refund matches the booked price",
        "You approve before any value moves",
      ],
    };
  }

  return {
    customerIntent: "I want someone else to take my spot",
    actionLabel: "Sell my booking",
    shortLabel: "Resale",
    buttonLabel: "Check resale option",
    approvalLabel: "Approve resale",
    previewLabel: "Check options",
    previewingLabel: "Checking...",
    workingLabel: "Creating listing...",
    summary:
      "Concierge checks whether resale is allowed, estimates the provider share and your net, then prepares the listing.",
    previewSuccess:
      "Concierge found a resale option. Nothing is listed until you approve it.",
    approvalWarning:
      "Concierge cannot list anything until you approve this step.",
    proofPlainEnglish:
      "Hedera proof will show the listing approval, audit transaction, schedule proof, price math, and policy checks.",
    checks: [
      "Current holder matches your account",
      "Provider allows resale for this booking",
      "No duplicate active listing exists",
      "Budget and Agent Kit policies allow the recovery action",
    ],
  };
}

export function buildConciergeHelpMessages(appBaseUrl: string): string[] {
  return [
    "Tell YourTurn Concierge what happened in normal words.",
    "Examples:",
    "\"I can't make booking 123\"",
    "\"Sell booking 123\"",
    "\"Refund booking 123\"",
    "\"Show my bookings\"",
    "Concierge will check the booking, explain what is allowed, and ask before anything changes.",
    `Find booking numbers here: ${appBaseUrl}/my-bookings`,
  ];
}

export function buildMissingBookingMessages(
  actorLabel: string,
  appBaseUrl: string,
  example: string
): string[] {
  return [
    `Which booking should I help with for ${actorLabel}?`,
    "Use the number shown on the pass, like Booking #123.",
    `Open My bookings: ${appBaseUrl}/my-bookings`,
    `Example: ${example}`,
  ];
}

export function describeConciergeChecks(action: HumanRecoveryAction): string {
  const copy = getConciergeHumanCopy(action);
  return copy.checks.join(" / ");
}
