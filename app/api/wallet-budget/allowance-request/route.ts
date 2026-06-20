import { AccountAllowanceApproveTransaction } from "@hiero-ledger/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEDERA_ACCOUNT_ID_RE = /^\d+\.\d+\.\d+$/;

function readAllowanceConfig() {
  return {
    network: process.env.HEDERA_NETWORK || "testnet",
    usdcTokenId: process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274",
    spenderAccountId: process.env.HEDERA_TREASURY_ID ?? null,
    allowanceAtomicUnits: process.env.YOURTURN_POLICY_USDC_LIMIT_UNITS ?? "5000000",
  };
}

export async function POST(req: Request) {
  const config = readAllowanceConfig();
  if (!config.spenderAccountId) {
    return NextResponse.json(
      { ok: false, error: "HEDERA_TREASURY_ID is not configured." },
      { status: 409 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    ownerAccountId?: unknown;
  } | null;
  const ownerAccountId =
    typeof body?.ownerAccountId === "string" ? body.ownerAccountId.trim() : "";

  if (!HEDERA_ACCOUNT_ID_RE.test(ownerAccountId)) {
    return NextResponse.json(
      { ok: false, error: "A valid Hedera owner account id is required." },
      { status: 400 }
    );
  }

  const allowance = Number(config.allowanceAtomicUnits);
  if (!Number.isSafeInteger(allowance) || allowance <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid YOURTURN_POLICY_USDC_LIMIT_UNITS value." },
      { status: 409 }
    );
  }

  const transaction = new AccountAllowanceApproveTransaction()
    .approveTokenAllowance(
      config.usdcTokenId,
      ownerAccountId,
      config.spenderAccountId,
      allowance
    )
    .setTransactionMemo("YourTurn policy agent USDC budget");

  return NextResponse.json({
    ok: true,
    network: config.network,
    usdcTokenId: config.usdcTokenId,
    ownerAccountId,
    spenderAccountId: config.spenderAccountId,
    allowanceAtomicUnits: config.allowanceAtomicUnits,
    transactionList: Buffer.from(transaction.toBytes()).toString("base64"),
  });
}
