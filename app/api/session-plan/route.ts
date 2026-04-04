import { NextResponse } from "next/server";
import { requireIssuerAppUser } from "@/lib/auth/guest-api-auth";
import { saveDemoPlan } from "@/lib/store/demo-plan";
import type { DemoSlotSeed } from "@/lib/types/demo-slot";
import { demoPlanBodySchema, fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const issuer = await requireIssuerAppUser();
    if (issuer instanceof NextResponse) return issuer;
    const parsed = demoPlanBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }

    const slots: DemoSlotSeed[] = parsed.data.slots.map((slot, index) => ({
      slotId: slot.slotId || `slot-${String(index + 1).padStart(3, "0")}`,
      title: slot.title,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      issuerName: parsed.data.issuerName,
      primaryPriceHbar: slot.primaryPriceHbar,
      resaleAllowed: slot.resaleAllowed,
    }));

    await saveDemoPlan(slots);

    return NextResponse.json({
      ok: true as const,
      issuerName: parsed.data.issuerName,
      slots,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
