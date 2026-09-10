import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

import {
  WORLD_ID_SANDBOX_ACTION,
  WORLD_ID_SANDBOX_APP_ID,
  WORLD_ID_SANDBOX_ENVIRONMENT,
  WORLD_ID_SANDBOX_RP_ID,
} from "@/lib/world-id/sandbox-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const signingKey = process.env.WORLD_ID_RP_SIGNING_KEY?.trim();

  if (!signingKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED",
        message:
          "World ID Sandbox proof is ready, but the local RP signing key is not configured.",
      },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }

  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: signingKey,
      action: WORLD_ID_SANDBOX_ACTION,
      ttl: 300,
    });

    return NextResponse.json(
      {
        ok: true,
        app_id: WORLD_ID_SANDBOX_APP_ID,
        action: WORLD_ID_SANDBOX_ACTION,
        environment: WORLD_ID_SANDBOX_ENVIRONMENT,
        rp_context: {
          rp_id: WORLD_ID_SANDBOX_RP_ID,
          nonce,
          created_at: createdAt,
          expires_at: expiresAt,
          signature: sig,
        },
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    // Never echo the signing key, signing input, or library error internals.
    return NextResponse.json(
      {
        ok: false,
        code: "WORLD_ID_RP_SIGNATURE_FAILED",
        message: "Could not create a World ID Sandbox proof request.",
      },
      {
        status: 500,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
