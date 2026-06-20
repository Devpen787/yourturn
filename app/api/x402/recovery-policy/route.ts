import { NextResponse } from "next/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  HTTPFacilitatorClient,
} from "@x402/core/http";
import {
  buildHederaX402PaymentRequirements,
  buildHederaX402PaymentRequired,
  getHederaX402Facilitator,
} from "@/lib/x402/hedera";

export const runtime = "nodejs";

function baseUrlFromRequest(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function paymentRequired(req: Request) {
  const declaration = buildHederaX402PaymentRequired(
    baseUrlFromRequest(req),
    "PAYMENT-SIGNATURE header required"
  );
  return NextResponse.json(
    declaration,
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": encodePaymentRequiredHeader(declaration),
      },
    }
  );
}

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    status: "payment_required_endpoint_live",
    settlement:
      getHederaX402Facilitator().settlementStatus === "live"
        ? "facilitator_settlement_enabled"
        : "facilitator_configured_not_settling_in_this_deployment",
    accepts: buildHederaX402PaymentRequirements(baseUrlFromRequest(req)),
    facilitator: getHederaX402Facilitator(),
  });
}

export async function POST(req: Request) {
  const baseUrl = baseUrlFromRequest(req);
  const payment =
    req.headers.get("payment-signature") ?? req.headers.get("x-payment");
  if (!payment) return paymentRequired(req);

  if (getHederaX402Facilitator().settlementStatus !== "live") {
    return NextResponse.json(
      {
        ok: false,
        code: "X402_SETTLEMENT_NOT_ENABLED",
        message:
          "A payment payload was supplied, but live facilitator verification/settlement is not enabled in this deployment.",
        accepts: buildHederaX402PaymentRequirements(baseUrlFromRequest(req)),
      },
      { status: 501 }
    );
  }

  const paymentPayload = decodePaymentSignatureHeader(payment);
  const paymentRequirements =
    buildHederaX402PaymentRequirements(baseUrl).find(
      (requirement) =>
        requirement.scheme === paymentPayload.accepted.scheme &&
        requirement.network === paymentPayload.accepted.network &&
        requirement.asset === paymentPayload.accepted.asset &&
        requirement.amount === paymentPayload.accepted.amount &&
        requirement.payTo === paymentPayload.accepted.payTo
    ) ?? paymentPayload.accepted;
  const facilitatorClient = new HTTPFacilitatorClient({
    url: getHederaX402Facilitator().baseUrl,
  });
  const verify = await facilitatorClient.verify(
    paymentPayload,
    paymentRequirements
  );
  if (!verify.isValid) {
    return NextResponse.json(
      {
        ok: false,
        code: "X402_VERIFY_FAILED",
        verify,
        accepts: buildHederaX402PaymentRequirements(baseUrl),
      },
      { status: 402 }
    );
  }
  const settlement = await facilitatorClient.settle(
    paymentPayload,
    paymentRequirements
  );
  if (!settlement.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "X402_SETTLE_FAILED",
        settlement,
      },
      { status: 402 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "settled",
    settlement,
    policyQuote: {
      service: "YourTurn Concierge",
      decision:
        "Paid recovery-policy quote is available after Hedera x402 exact settlement.",
      allowedAutonomy:
        "Autonomous recovery remains bounded by holder, provider policy, allowance budget, and Agent Kit runtime policies.",
    },
  }, {
    headers: {
      "PAYMENT-RESPONSE": encodePaymentResponseHeader(settlement),
    },
  });
}
