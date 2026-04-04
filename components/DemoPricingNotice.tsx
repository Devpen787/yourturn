import { DEMO_HBAR_EQUALS_USD_ONE_LINE } from "@/lib/demo/pricing";

/** Call out the 1 ℏ = US$1 demo rule wherever money is shown. */
export function DemoPricingNotice() {
  return (
    <div
      className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-snug text-sky-950"
      role="note"
    >
      <strong className="font-semibold">Demo pricing.</strong> {DEMO_HBAR_EQUALS_USD_ONE_LINE}
    </div>
  );
}
