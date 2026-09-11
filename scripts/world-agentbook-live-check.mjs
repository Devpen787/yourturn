import { createAgentBookVerifier } from "@worldcoin/agentkit";
import { getAddress } from "ethers";

function readAgentAddress() {
  const flag = process.argv.find((arg) => arg.startsWith("--agent="));
  const raw = flag?.slice("--agent=".length) || process.env.WORLD_AGENT_ADDRESS;
  if (!raw) {
    throw new Error(
      "Missing agent address. Use --agent=0x... or set WORLD_AGENT_ADDRESS."
    );
  }
  return getAddress(raw);
}

const agentAddress = readAgentAddress();
const agentBook = createAgentBookVerifier();
const humanId = await agentBook.lookupHuman(agentAddress);

if (!humanId) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        evidenceLevel: "LIVE/AGENTBOOK",
        agentAddress,
        agentBookResolved: false,
        verifierNetwork: "worldchain",
        humanIdExposed: false,
        nextAction:
          "Register this exact agent address through the canonical AgentBook + World ID flow, then rerun this check.",
      },
      null,
      2
    )
  );
  process.exit(2);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "LIVE/AGENTBOOK",
      agentAddress,
      agentBookResolved: true,
      verifierNetwork: "worldchain",
      humanIdExposed: false,
      claimBoundary:
        "This proves the canonical AgentBook verifier resolves the agent to a World-ID-backed anonymous human record. It does not prove booking ownership or YourTurn recovery authority.",
    },
    null,
    2
  )
);
