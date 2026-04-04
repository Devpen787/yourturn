import { NextResponse } from "next/server";
import { BookingPortError } from "@/lib/adapters/booking-port";
import {
  mintApprovalGrant,
  verifyApprovalGrantAdminSecret,
} from "@/lib/server/approval-grants";
import { approvalGrantBodySchema } from "@/lib/validation/agent";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    verifyApprovalGrantAdminSecret(req);
    const parsed = approvalGrantBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const result = mintApprovalGrant(parsed.data);
    return NextResponse.json({ ok: true as const, ...result });
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
