import { NextResponse } from "next/server";
import {
  getAccountNfts,
  getNftBySerial,
  getToken,
  getTopicMessages,
  getTransactionById,
  getTransactionsForAccount,
} from "@/lib/hedera/mirror";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    if (!action) {
      return NextResponse.json(
        fail("Missing action", "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    if (action === "token") {
      const tokenId = searchParams.get("tokenId");
      if (!tokenId) {
        return NextResponse.json(
          fail("tokenId required", "VALIDATION_ERROR"),
          { status: 400 }
        );
      }
      const data = await getToken(tokenId);
      return NextResponse.json({ ok: true as const, data });
    }
    if (action === "nft") {
      const tokenId = searchParams.get("tokenId");
      const serial = searchParams.get("serial");
      if (!tokenId || serial == null) {
        return NextResponse.json(
          fail("tokenId and serial required", "VALIDATION_ERROR"),
          { status: 400 }
        );
      }
      const data = await getNftBySerial(tokenId, Number(serial));
      return NextResponse.json({ ok: true as const, data });
    }
    if (action === "accountNfts") {
      const accountId = searchParams.get("accountId");
      const tokenId = searchParams.get("tokenId");
      if (!accountId || !tokenId) {
        return NextResponse.json(
          fail("accountId and tokenId required", "VALIDATION_ERROR"),
          { status: 400 }
        );
      }
      const data = await getAccountNfts(accountId, tokenId);
      return NextResponse.json({ ok: true as const, data });
    }
    if (action === "topicMessages") {
      const topicId = searchParams.get("topicId");
      if (!topicId) {
        return NextResponse.json(
          fail("topicId required", "VALIDATION_ERROR"),
          { status: 400 }
        );
      }
      const data = await getTopicMessages(topicId);
      return NextResponse.json({ ok: true as const, data });
    }
    if (action === "transaction") {
      const txId = searchParams.get("txId");
      if (!txId) {
        return NextResponse.json(
          fail("txId required", "VALIDATION_ERROR"),
          { status: 400 }
        );
      }
      const data = await getTransactionById(txId);
      return NextResponse.json({ ok: true as const, data });
    }
    if (action === "transactions") {
      const accountId = searchParams.get("accountId");
      if (!accountId) {
        return NextResponse.json(
          fail("accountId required", "VALIDATION_ERROR"),
          { status: 400 }
        );
      }
      const limit = Number(searchParams.get("limit") || "20");
      const data = await getTransactionsForAccount(accountId, limit);
      return NextResponse.json({ ok: true as const, data });
    }
    return NextResponse.json(
      fail("Unknown action", "VALIDATION_ERROR"),
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
