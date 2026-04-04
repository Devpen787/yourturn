import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import { agentReadBodySchema } from "@/lib/validation/agent";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = agentReadBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }

    switch (parsed.data.action) {
      case "listSlots":
        return NextResponse.json({
          ok: true as const,
          action: parsed.data.action,
          data: await bookingPort.listSlots(),
        });
      case "getSlot":
        return NextResponse.json({
          ok: true as const,
          action: parsed.data.action,
          data: await bookingPort.getSlot(parsed.data.serial),
        });
      case "listHoldings":
        return NextResponse.json({
          ok: true as const,
          action: parsed.data.action,
          data: await bookingPort.listHoldings(parsed.data.holder),
        });
      case "getListing":
        return NextResponse.json({
          ok: true as const,
          action: parsed.data.action,
          data: await bookingPort.getListing(parsed.data.serial),
        });
      case "getLifecycle":
        return NextResponse.json({
          ok: true as const,
          action: parsed.data.action,
          data: await bookingPort.getLifecycle(parsed.data.serial),
        });
    }
  } catch (e) {
    if (e instanceof BookingPortError) {
      return NextResponse.json(fail(e.message, e.code), { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
