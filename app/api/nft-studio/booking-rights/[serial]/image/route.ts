import { NextResponse } from "next/server";
import { loadSlots } from "@/lib/store/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  { params }: { params: { serial: string } }
) {
  const serial = Number(params.serial);
  const slots = await loadSlots();
  const slot = Number.isFinite(serial)
    ? slots.find((candidate) => candidate.serial === serial)
    : undefined;
  const title = slot?.title || "YourTurn booking right";
  const location = slot?.location || "Verified service slot";
  const status = "Metadata proof";
  const token = slot?.tokenId || "HTS NFT";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="YourTurn Booking Right ${escapeXml(serial)}">
  <rect width="1200" height="630" fill="#f8fafc"/>
  <rect x="72" y="64" width="1056" height="502" rx="24" fill="#ffffff" stroke="#bae6fd" stroke-width="3"/>
  <text x="112" y="142" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">YourTurn Booking Right</text>
  <text x="112" y="206" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="800" fill="#0f172a">#${escapeXml(serial)}</text>
  <text x="112" y="284" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700" fill="#0e7490">${escapeXml(title)}</text>
  <text x="112" y="340" font-family="Inter, Arial, sans-serif" font-size="26" fill="#475569">${escapeXml(location)}</text>
  <text x="112" y="454" font-family="Inter, Arial, sans-serif" font-size="24" fill="#64748b">Token</text>
  <text x="112" y="492" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">${escapeXml(token)}</text>
  <text x="792" y="454" font-family="Inter, Arial, sans-serif" font-size="24" fill="#64748b">State</text>
  <text x="792" y="492" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">${escapeXml(status)}</text>
  <rect x="792" y="112" width="272" height="72" rx="36" fill="#ecfeff" stroke="#67e8f9" stroke-width="2"/>
  <text x="828" y="158" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#155e75">Hedera HTS</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
