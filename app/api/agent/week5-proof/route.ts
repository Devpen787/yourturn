import { NextResponse } from "next/server";
import { buildWeek5PolicyProof } from "@/lib/hedera-agent-kit/week5-proof";

export const runtime = "nodejs";

function baseUrlFromRequest(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  return NextResponse.json(await buildWeek5PolicyProof(baseUrlFromRequest(req)));
}
