import { NextResponse } from "next/server";
import { ETHONLINE_HEDERA_RECOVERY_PROOF } from "@/lib/hedera-agent-kit/ethonline-recovery-proof";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(ETHONLINE_HEDERA_RECOVERY_PROOF, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  });
}
