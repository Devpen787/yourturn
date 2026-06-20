import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Redis } from "@upstash/redis";
import {
  assessBookingRightTokenRisk,
  buildBookingRightHip412Metadata,
  validateBookingRightHip412Metadata,
} from "../lib/nft-studio/booking-rights.ts";

function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // CI can provide env directly.
  }
}

async function redisGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token, retry: { retries: 1, backoff: () => 200 } });
  return redis.get(key);
}

async function mirrorFetch(path) {
  const base = (
    process.env.NEXT_PUBLIC_MIRROR_BASE ||
    "https://testnet.mirrornode.hedera.com/api/v1"
  ).replace(/\/$/, "");
  const res = await fetch(`${base}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mirror error ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalizeSlots(raw) {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

function fallbackSlots(tokenId) {
  return [
    {
      serial: 901,
      tokenId,
      slotId: "nft-studio-demo-901",
      title: "Agent Policy Recovery Session",
      startTime: "2026-06-21T14:00:00.000Z",
      location: "Studio A",
      issuerName: "YourTurn Demo Provider",
      resaleAllowed: true,
      status: "HELD",
      policySnapshot: {
        label: "Booked-time owner policy",
        resaleAllowed: true,
        releaseAllowed: true,
      },
    },
    {
      serial: 902,
      tokenId,
      slotId: "nft-studio-demo-902",
      title: "Refund Recovery Session",
      startTime: "2026-06-21T16:00:00.000Z",
      location: "Studio B",
      issuerName: "YourTurn Demo Provider",
      resaleAllowed: false,
      status: "HELD",
      policySnapshot: {
        label: "Release/refund policy",
        resaleAllowed: false,
        releaseAllowed: true,
      },
    },
  ];
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

loadEnvLocal();

const outDir = "output/nft-studio";
const metadataDir = join(outDir, "metadata");
mkdirSync(metadataDir, { recursive: true });

const storedTokenId = await redisGet("bookedrights:tokenId");
const tokenId =
  firstNonEmpty(process.env.BOOKED_RIGHTS_TOKEN_ID, storedTokenId) ?? "0.0.8505698";

const storedSlots = normalizeSlots(await redisGet("bookedrights:slots"));
const slots = storedSlots.length > 0 ? storedSlots : fallbackSlots(tokenId);
const token = await mirrorFetch(`/tokens/${tokenId}`);
const metadataItems = slots.slice(0, 12).map((slot) => {
  const metadata = buildBookingRightHip412Metadata(
    {
      serial: slot.serial,
      tokenId,
      slotId: slot.slotId,
      title: slot.title,
      startTime: slot.startTime,
      location: slot.location,
      issuerName: slot.issuerName,
      policyLabel: slot.policySnapshot?.label,
      resaleAllowed: slot.policySnapshot?.resaleAllowed ?? slot.resaleAllowed,
      releaseAllowed: slot.policySnapshot?.releaseAllowed,
    },
    process.env.NEXT_PUBLIC_APP_URL || "https://yourturn-sage.vercel.app"
  );
  const validation = validateBookingRightHip412Metadata(metadata);
  writeFileSync(
    join(metadataDir, `booking-right-${slot.serial}.json`),
    `${JSON.stringify(metadata, null, 2)}\n`
  );
  return { serial: slot.serial, metadata, validation };
});

const report = {
  ok: metadataItems.every((item) => item.validation.ok),
  generatedAt: new Date().toISOString(),
  source: "Hedera NFT Studio metadata/risk proof",
  sourceMode:
    firstNonEmpty(storedTokenId, process.env.BOOKED_RIGHTS_TOKEN_ID)
      ? "configured-token"
      : "fallback-demo-token",
  tokenId,
  metadataFiles: metadataItems.map(
    (item) => `metadata/booking-right-${item.serial}.json`
  ),
  validation: metadataItems.map((item) => ({
    serial: item.serial,
    ok: item.validation.ok,
    checks: item.validation.checks,
  })),
  risk: assessBookingRightTokenRisk(token),
  nftStudioTools: [
    "Metadata Validator",
    "NFT Risk Calculator",
  ],
};

writeFileSync(join(outDir, "nft-studio-proof.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
