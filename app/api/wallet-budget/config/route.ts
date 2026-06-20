import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    network: process.env.HEDERA_NETWORK || "testnet",
    usdcTokenId: process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274",
    spenderAccountId: process.env.HEDERA_TREASURY_ID ?? null,
    allowanceAtomicUnits: process.env.YOURTURN_POLICY_USDC_LIMIT_UNITS ?? "5000000",
    allowanceUsdc: "5",
    reownProjectConfigured: !!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
  });
}
