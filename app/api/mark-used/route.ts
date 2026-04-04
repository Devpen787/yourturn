import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import { fail, markUsedBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = markUsedBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const preview = await bookingPort.previewMarkUsed({
      issuer: { kind: "demoActor", id: "issuer" },
      serial: parsed.data.serial,
    });
    const result = await bookingPort.confirmMarkUsed({
      previewId: preview.previewId,
      approval: {
        approvedBy: "issuer",
        approvedAt: new Date().toISOString(),
        source: "ui_click",
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
