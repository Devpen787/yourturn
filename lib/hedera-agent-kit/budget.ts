import type { DemoActor } from "@/lib/hedera/client";
import type { YourTurnToolId } from "./tool-manifest.ts";

export type ConciergeBudgetAsset =
  | {
      kind: "HBAR";
      symbol: "HBAR";
      assetId: "0.0.0";
      decimals: 8;
    }
  | {
      kind: "HTS_USDC";
      symbol: "USDC";
      assetId: string;
      decimals: 6;
    };

export type ConciergeBudget = {
  budgetId: string;
  actor: Exclude<DemoActor, "issuer">;
  source: "demo_server_enforced" | "wallet_allowance_configured";
  window: "ethglobal_demo";
  asset: ConciergeBudgetAsset;
  limitHbar: number;
  spentHbar: number;
  remainingHbar: number;
  limitAtomicUnits?: string;
  spentAtomicUnits?: string;
  remainingAtomicUnits?: string;
  spenderAccountId?: string;
  ownerAccountId?: string;
  allowanceTxId?: string;
  status: "live" | "configured";
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
    asset: {
      kind: "HBAR",
      symbol: "HBAR",
      assetId: "0.0.0",
      decimals: 8,
    },
    limitHbar: limit,
    spentHbar: spent,
    remainingHbar: Math.max(0, limit - spent),
    status: "live",
    allowedTools: [
      "yourturn.recovery.confirm_listing",
      "yourturn.recovery.confirm_refund_release",
    ],
  };
}

export function getConfiguredUsdcAllowanceBudget(
  actor: Exclude<DemoActor, "issuer">
): ConciergeBudget {
  const limitAtomicUnits = process.env.YOURTURN_POLICY_USDC_LIMIT_UNITS ?? "5000000";
  const spentAtomicUnits = process.env.YOURTURN_POLICY_USDC_SPENT_UNITS ?? "0";
  const remainingAtomicUnits = String(
    Math.max(0, Number(limitAtomicUnits) - Number(spentAtomicUnits))
  );
  return {
    budgetId: `wallet_usdc_allowance_${actor}`,
    actor,
    source: "wallet_allowance_configured",
    window: "ethglobal_demo",
    asset: {
      kind: "HTS_USDC",
      symbol: "USDC",
      assetId: process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274",
      decimals: 6,
    },
    limitHbar: 0,
    spentHbar: 0,
    remainingHbar: 0,
    limitAtomicUnits,
    spentAtomicUnits,
    remainingAtomicUnits,
    spenderAccountId: process.env.HEDERA_TREASURY_ID,
    ownerAccountId: process.env.HEDERA_GUEST_A_ID,
    allowanceTxId: process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID,
    status: process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID ? "live" : "configured",
    allowedTools: [
      "yourturn.recovery.confirm_listing",
      "yourturn.recovery.confirm_refund_release",
      "yourturn.wallet_budget.inspect_allowance",
      "yourturn.x402.quote_recovery",
    ],
  };
}

export function evaluateBudgetForAction(args: {
  budget: ConciergeBudget;
  toolId: YourTurnToolId;
  requestedHbar: number;
  requestedAtomicUnits?: string;
}): BudgetCheck {
  const toolAllowed = args.budget.allowedTools.includes(args.toolId);
  const requestedAtomicUnits = Number(args.requestedAtomicUnits ?? "0");
  const remainingAtomicUnits = Number(args.budget.remainingAtomicUnits ?? "0");
  const amountAllowed =
    args.budget.asset.kind === "HBAR"
      ? args.requestedHbar <= args.budget.remainingHbar
      : requestedAtomicUnits <= remainingAtomicUnits;
  const passed = toolAllowed && amountAllowed;
  const requestedDisplay =
    args.budget.asset.kind === "HBAR"
      ? `${args.requestedHbar.toFixed(2)} HBAR`
      : `${(requestedAtomicUnits / 10 ** args.budget.asset.decimals).toFixed(
          2
        )} ${args.budget.asset.symbol}`;
  return {
    id: "budget_allows_payment",
    label: "Budget allows payment",
    status: passed ? "passed" : "blocked",
    detail: passed
      ? `Budget ${args.budget.budgetId} allows ${requestedDisplay} for ${args.toolId}; source=${args.budget.source}, status=${args.budget.status}.`
      : `Budget ${args.budget.budgetId} blocks ${args.toolId} for ${requestedDisplay}; toolAllowed=${toolAllowed}, source=${args.budget.source}, status=${args.budget.status}.`,
    budget: args.budget,
    requestedHbar: args.requestedHbar,
  };
}
