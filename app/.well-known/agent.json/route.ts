import { NextResponse } from "next/server";
import { buildA2AAgentCard } from "@/lib/agent-protocols/descriptors";

function baseUrlFromRequest(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  return NextResponse.json(buildA2AAgentCard(baseUrlFromRequest(req)));
}
