import { NextResponse } from "next/server";
import { buildAgentProtocolDescriptors } from "@/lib/agent-protocols/descriptors";
import { buildHcs14AgentIdentity } from "@/lib/hedera-agent-kit/identity";
import { YOURTURN_AGENT_TOOLS } from "@/lib/hedera-agent-kit/tool-manifest";

function baseUrlFromRequest(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const baseUrl = baseUrlFromRequest(req);
  return NextResponse.json({
    ok: true,
    identity: buildHcs14AgentIdentity(),
    tools: YOURTURN_AGENT_TOOLS,
    protocols: buildAgentProtocolDescriptors(baseUrl),
  });
}
