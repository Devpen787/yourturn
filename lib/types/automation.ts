export type ScheduleAutomationProof = {
  scheduleId: string;
  scheduledTransactionId?: string;
  createTxId: string;
  createHashscanUrl: string;
  scheduleHashscanUrl: string;
  executionTxId?: string;
  executionHashscanUrl?: string;
  executedAt?: string;
  memo: string;
  amountHbar: number;
  payerAccountId: string;
  recipientAccountId: string;
  executeAfter: string;
  waitForExpiry: boolean;
  status: "scheduled" | "executed" | "deleted" | "unknown";
};

export type AgentTraceStep = {
  label: string;
  status: "passed" | "selected" | "approved" | "executed" | "blocked";
  detail: string;
};

export type ConciergeAgentTrace = {
  traceId: string;
  agentName: "yourturn-concierge";
  mode: "hedera-agent-kit-guided";
  intent: string;
  selectedTool: string;
  selectedAction: string;
  humanApprovalRequired: true;
  approvalId?: string;
  steps: AgentTraceStep[];
  createdAt: string;
};
