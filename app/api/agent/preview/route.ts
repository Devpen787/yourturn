import { NextResponse } from "next/server";
import { bookingPort, BookingPortError } from "@/lib/adapters/booking-port";
import { agentPreviewBodySchema } from "@/lib/validation/agent";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = agentPreviewBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }

    switch (parsed.data.action) {
      case "book":
        return NextResponse.json({
          ok: true as const,
          preview: await bookingPort.previewBook(parsed.data),
        });
      case "create_listing":
        return NextResponse.json({
          ok: true as const,
          preview: await bookingPort.previewCreateListing(parsed.data),
        });
      case "buy_listing":
        return NextResponse.json({
          ok: true as const,
          preview: await bookingPort.previewBuyListing(parsed.data),
        });
      case "freeze":
        return NextResponse.json({
          ok: true as const,
          preview: await bookingPort.previewFreeze(parsed.data),
        });
      case "unfreeze":
        return NextResponse.json({
          ok: true as const,
          preview: await bookingPort.previewUnfreeze(parsed.data),
        });
      case "mark_used":
        return NextResponse.json({
          ok: true as const,
          preview: await bookingPort.previewMarkUsed(parsed.data),
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
