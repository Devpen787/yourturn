import { NextResponse } from "next/server";

import {
  WORLD_ID_SANDBOX_ACTION,
  WORLD_ID_SANDBOX_ENVIRONMENT,
  WORLD_ID_SANDBOX_RP_ID,
} from "@/lib/world-id/sandbox-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function safeProviderCode(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;

  for (const key of ["code", "error_code", "errorCode"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length <= 96) {
      return candidate;
    }
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const record = asRecord(body);
  const idkitResponse = record?.idkitResponse;
  if (!asRecord(idkitResponse)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_IDKIT_RESPONSE" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const response = await fetch(
      `https://developer.world.org/api/v4/verify/${WORLD_ID_SANDBOX_RP_ID}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        // World explicitly documents forwarding the IDKit result payload as-is.
        body: JSON.stringify(idkitResponse),
        cache: "no-store",
      },
    );

    const raw = await response.text();
    let providerResult: unknown = null;
    if (raw) {
      try {
        providerResult = JSON.parse(raw);
      } catch {
        providerResult = null;
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          proofVerified: false,
          environment: WORLD_ID_SANDBOX_ENVIRONMENT,
          providerStatus: response.status,
          providerCode: safeProviderCode(providerResult),
        },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    // Deliberately do not return or log the proof, nullifier, raw World response,
    // or any human identifier. This endpoint is evidence plumbing, not identity
    // persistence. If nullifier-based product gating is added later it requires
    // its own durable replay/privacy review.
    return NextResponse.json(
      {
        ok: true,
        proofVerified: true,
        environment: WORLD_ID_SANDBOX_ENVIRONMENT,
        action: WORLD_ID_SANDBOX_ACTION,
        rp_id: WORLD_ID_SANDBOX_RP_ID,
        verifiedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        proofVerified: false,
        environment: WORLD_ID_SANDBOX_ENVIRONMENT,
        code: "WORLD_VERIFY_UNREACHABLE",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
