import type { DemoActor } from "@/lib/hedera/client";
import type { YourTurnToolId } from "./tool-manifest.ts";

export type ConciergeBudget = {
  budgetId: string;
  actor: Exclude<DemoActor, "issuer">;
  source: "demo_server_enforced";
  window: "ethglobal_demo";
  limitHbar: number;
  spentHbar: number;
  remainingHbar: number;
  allowedTools: YourTurnToolId[];
};

export type BudgetCheck = {
  id: "budget_allows_payment";
  label: "Budget allows payment";
  status: "passed" | "blocked";
  detail: string;
  budget: ConciergeBudget;
  requestedHbar: number;
};

export function getDemoConciergeBudget(
  actor: Exclude<DemoActor, "issuer">
): ConciergeBudget {
  const limit = Number(process.env.YOURTURN_DEMO_AGENT_BUDGET_HBAR ?? "2");
  const spent = Number(process.env.YOURTURN_DEMO_AGENT_BUDGET_SPENT_HBAR ?? "0");
  return {
    budgetId: `budget_ethglobal_${actor}`,
    actor,
    source: "demo_server_enforced",
    window: "ethglobal_demo",
    limitHbar: limit,
    spentHbar: spent,
    remainingHbar: Math.max(0, limit - spent),
    allowedTools: [
      "yourturn.recovery.confirm_listing",
      "yourturn.recovery.confirm_refund_release",
    ],
  };
}

export function evaluateBudgetForAction(args: {
  budget: ConciergeBudget;
  toolId: YourTurnToolId;
  requestedHbar: number;
}): BudgetCheck {
  const toolAllowed = args.budget.allowedTools.includes(args.toolId);
  const amountAllowed = args.requestedHbar <= args.budget.remainingHbar;
  const passed = toolAllowed && amountAllowed;
  return {
    id: "budget_allows_payment",
    label: "Budget allows payment",
    status: passed ? "passed" : "blocked",
    detail: passed
      ? `Budget ${args.budget.budgetId} allows ${args.requestedHbar.toFixed(
          2
        )} HBAR for ${args.toolId}; ${args.budget.remainingHbar.toFixed(
          2
        )} HBAR remains.`
      : `Budget ${args.budget.budgetId} blocks ${args.toolId} for ${args.requestedHbar.toFixed(
          2
        )} HBAR; toolAllowed=${toolAllowed}, remaining=${args.budget.remainingHbar.toFixed(
          2
        )} HBAR.`,
    budget: args.budget,
    requestedHbar: args.requestedHbar,
  };
}
