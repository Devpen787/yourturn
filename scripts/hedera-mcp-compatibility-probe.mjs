import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AgentMode, ToolDiscovery } from "@hashgraph/hedera-agent-kit";
import { HederaMCPToolkit } from "@hashgraph/hedera-agent-kit-mcp";
import { createYourTurnRecoveryMcpOptions } from "../lib/hedera-agent-kit/delegated-recovery-mcp-adapter.ts";
import { ETHONLINE_HEDERA_RECOVERY_PROOF } from "../lib/hedera-agent-kit/ethonline-recovery-proof.ts";

function packageVersion(path) {
  return JSON.parse(readFileSync(path, "utf8")).version;
}

assert.equal(process.env.HEDERA_OPERATOR_ID, undefined, "operator id must not be loaded");
assert.equal(process.env.HEDERA_OPERATOR_KEY, undefined, "operator key must not be loaded");

const options = createYourTurnRecoveryMcpOptions("0.0.8504405");
assert.equal(options.client.operatorAccountId, null, "testnet client must have no operator");
assert.equal(options.configuration.context.mode, AgentMode.RETURN_BYTES);
assert.equal(options.configuration.plugins.length, 1);
assert.equal(
  options.configuration.plugins[0].name,
  "yourturn-delegated-recovery-complete-plugin"
);

const discovery = ToolDiscovery.createFromConfiguration(options.configuration);
const discovered = discovery.getAllTools(
  options.configuration.context,
  options.configuration
);
const discoveredMethods = discovered.map((tool) => tool.method).sort();
const expectedMethods = [
  ...ETHONLINE_HEDERA_RECOVERY_PROOF.hakSurface.existingExecutionTools,
  ...ETHONLINE_HEDERA_RECOVERY_PROOF.hakSurface.additiveReviewerTools,
].sort();
for (const method of expectedMethods) {
  assert.ok(discoveredMethods.includes(method), `missing discovered tool:${method}`);
}

const server = new HederaMCPToolkit({
  client: options.client,
  configuration: options.configuration,
});
const registered = Object.keys(server._registeredTools ?? {}).sort();
for (const method of expectedMethods) {
  assert.ok(registered.includes(method), `missing MCP-registered tool:${method}`);
}

const result = {
  ok: true,
  classification: "MCP_RUNTIME_CONSTRUCTOR_AND_REGISTRATION_PASS",
  packageVersions: {
    mcp: packageVersion("node_modules/@hashgraph/hedera-agent-kit-mcp/package.json"),
    hak: packageVersion("node_modules/@hashgraph/hedera-agent-kit/package.json"),
    hieroSdk: packageVersion("node_modules/@hiero-ledger/sdk/package.json"),
  },
  context: {
    network: "testnet",
    mode: options.configuration.context.mode,
    accountId: options.configuration.context.accountId,
    operatorAccountId: options.client.operatorAccountId,
    operatorKeyLoaded: false,
    signed: false,
    submitted: false,
  },
  expectedMethods,
  discoveredMethods,
  registeredMethods: registered.filter((method) => expectedMethods.includes(method)),
};

console.log(JSON.stringify(result, null, 2));
options.client.close();
