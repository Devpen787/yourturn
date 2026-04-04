import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import { bookBodySchema, fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = bookBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const preview = await bookingPort.previewBook({
      buyer: { kind: "demoActor", id: parsed.data.actor },
      serial: parsed.data.serial,
    });
    const result = await bookingPort.confirmBook({
      previewId: preview.previewId,
      approval: {
        approvedBy: parsed.data.actor,
        approvedAt: new Date().toISOString(),
        source: "ui_click",
      },
    });
    return NextResponse.json({ ok: true as const, ...result });
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
