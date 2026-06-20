export type HederaX402Asset = {
  symbol: "HBAR" | "USDC";
  asset: string;
  decimals: number;
  amountAtomicUnits: string;
};

export type HederaX402PaymentRequirement = {
  scheme: "exact";
  network: "hedera:testnet";
  asset: string;
  assetSymbol: HederaX402Asset["symbol"];
  assetDecimals: number;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: {
    feePayer: string;
    assetSymbol: HederaX402Asset["symbol"];
    assetDecimals: number;
  };
  feePayer: string;
  resource: string;
  facilitator: string;
  description: string;
};

export type HederaX402PaymentRequired = {
  x402Version: 2;
  error?: string;
  resource: {
    url: string;
    description: string;
    mimeType: "application/json";
    serviceName: "YourTurn Concierge";
    tags: string[];
  };
  accepts: HederaX402PaymentRequirement[];
};

const BLOCKY402_TESTNET_FACILITATOR = "https://api.testnet.blocky402.com";
const BLOCKY402_TESTNET_FEE_PAYER = "0.0.7162784";
const HEDERA_TESTNET_USDC = "0.0.429274";

export function getHederaX402Assets(): HederaX402Asset[] {
  return [
    {
      symbol: "HBAR",
      asset: "0.0.0",
      decimals: 8,
      amountAtomicUnits: process.env.YOURTURN_X402_HBAR_TINYBARS ?? "1000000",
    },
    {
      symbol: "USDC",
      asset: process.env.HEDERA_USDC_TOKEN_ID ?? HEDERA_TESTNET_USDC,
      decimals: 6,
      amountAtomicUnits: process.env.YOURTURN_X402_USDC_UNITS ?? "10000",
    },
  ];
}

export function getHederaX402Facilitator() {
  return {
    baseUrl:
      process.env.HEDERA_X402_FACILITATOR_URL ?? BLOCKY402_TESTNET_FACILITATOR,
    feePayer:
      process.env.HEDERA_X402_FEE_PAYER_ID ?? BLOCKY402_TESTNET_FEE_PAYER,
    settlementStatus: process.env.HEDERA_X402_SETTLEMENT_ENABLED === "true"
      ? "live"
      : "configured",
  } as const;
}

export function buildHederaX402PaymentRequirements(baseUrl: string) {
  const facilitator = getHederaX402Facilitator();
  const payTo =
    process.env.HEDERA_X402_PAY_TO_ID ??
    process.env.HEDERA_FEE_COLLECTOR_ID ??
    process.env.HEDERA_TREASURY_ID ??
    "0.0.8504300";
  const resource = `${baseUrl}/api/x402/recovery-policy`;
  return getHederaX402Assets().map(
    (asset): HederaX402PaymentRequirement => ({
      scheme: "exact",
      network: "hedera:testnet",
      asset: asset.asset,
      assetSymbol: asset.symbol,
      assetDecimals: asset.decimals,
      amount: asset.amountAtomicUnits,
      payTo,
      maxTimeoutSeconds: 120,
      extra: {
        feePayer: facilitator.feePayer,
        assetSymbol: asset.symbol,
        assetDecimals: asset.decimals,
      },
      feePayer: facilitator.feePayer,
      resource,
      facilitator: facilitator.baseUrl,
      description:
        asset.symbol === "HBAR"
          ? "Pay the policy-gated recovery quote in HBAR over Hedera x402 exact."
          : "Pay the policy-gated recovery quote in HTS USDC over Hedera x402 exact.",
    })
  );
}

export function buildHederaX402PaymentRequired(
  baseUrl: string,
  error = "Payment required"
): HederaX402PaymentRequired {
  return {
    x402Version: 2,
    error,
    resource: {
      url: `${baseUrl}/api/x402/recovery-policy`,
      description:
        "Paid policy-gated recovery quote for a YourTurn booked service slot.",
      mimeType: "application/json",
      serviceName: "YourTurn Concierge",
      tags: ["hedera", "policy-agent", "x402", "booked-rights"],
    },
    accepts: buildHederaX402PaymentRequirements(baseUrl),
  };
}
