import { AgentMode, type Plugin } from "@hashgraph/hedera-agent-kit";
import { AccountId, Client } from "@hiero-ledger/sdk";
import { yourTurnDelegatedRecoveryCompletePlugin } from "./delegated-recovery-review-plugin.ts";

export const YOURTURN_MCP_COMPATIBILITY = Object.freeze({
  evidenceLevel: "CONFIGURED" as const,
  runtimeActivated: false,
  rootDependencyChanged: false,
  package: "@hashgraph/hedera-agent-kit-mcp",
  currentOfficialPackageVersionObserved: "1.1.0",
  currentRepoHieroSdkRange: "^2.81.0",
  currentOfficialMcpHieroPeerRangeObserved: "^2.86.2",
  reason:
    "The official MCP package currently requires a newer Hiero SDK peer range than this qualified shared root. Keep the adapter dependency-injected until the shared-root compatibility gate selects one dependency graph.",
});

export type YourTurnRecoveryMcpToolkitOptions = {
  client: Client;
  configuration: {
    context: {
      mode: AgentMode;
      accountId: string;
    };
    plugins: Plugin[];
  };
};

export type YourTurnRecoveryMcpToolkitConstructor<T> = new (
  options: YourTurnRecoveryMcpToolkitOptions
) => T;

function canonicalAccountId(value: string): string {
  return AccountId.fromString(value).toString();
}

/**
 * Official-shape HAK MCP configuration without importing the MCP package.
 *
 * This deliberately creates a no-operator Hedera client and RETURN_BYTES
 * context. It can be passed to HederaMCPToolkit after the shared dependency
 * graph is independently qualified. Nothing here can sign or submit.
 */
export function createYourTurnRecoveryMcpOptions(
  callerAccountId: string
): YourTurnRecoveryMcpToolkitOptions {
  const accountId = canonicalAccountId(callerAccountId);
  const client = Client.forTestnet();
  return {
    client,
    configuration: {
      context: {
        mode: AgentMode.RETURN_BYTES,
        accountId,
      },
      plugins: [yourTurnDelegatedRecoveryCompletePlugin],
    },
  };
}

/**
 * Dependency-injected activation seam. The caller supplies the official
 * HederaMCPToolkit constructor only after its package/SDK compatibility is
 * accepted. This repo does not install or upgrade that package here.
 */
export function createYourTurnRecoveryMcpServer<T>(
  Toolkit: YourTurnRecoveryMcpToolkitConstructor<T>,
  callerAccountId: string
) {
  const options = createYourTurnRecoveryMcpOptions(callerAccountId);
  return {
    server: new Toolkit(options),
    client: options.client,
    accountId: options.configuration.context.accountId,
    mode: "RETURN_BYTES" as const,
    holdsSigningKey: false,
    submitsTransactions: false,
  };
}

export const YOURTURN_MCP_RESPONSE_CONVENTION = Object.freeze({
  network: "testnet",
  transactionBytesEncoding: "base64",
  safetyNote:
    "Prepared transaction bytes are unsigned and unsubmitted. Review the decoded transaction, then sign externally with the expected payer account.",
  perRequestAccountHeader: "x-hedera-account-id",
});
