import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type {
  ApprovalProof,
  BookingActorRef,
  BookingPortAction,
} from "@/lib/types/booking-port";
import { BookingPortError } from "@/lib/adapters/booking-port";

export type ApprovalGrantClaims = {
  kind: "booked-rights-approval-grant";
  grantId: string;
  action: BookingPortAction | "any";
  actor?: BookingActorRef;
  serial?: number;
  /**
   * Optional delegated EVM agent binding. World-protected recovery writes make
   * this mandatory and exact-scoped before AgentKit verification can proceed.
   */
  delegatedAgentAddress?: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  source: Exclude<ApprovalProof["source"], "ui_click">;
};

function approvalSecret(): string {
  return (
    process.env.BOOKED_RIGHTS_APPROVAL_SECRET ||
    process.env.BOOKED_RIGHTS_PREVIEW_SECRET ||
    process.env.HEDERA_OPERATOR_KEY ||
    "booked-rights-approval-secret"
  );
}

function adminSecret(): string {
  return (
    process.env.BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET ||
    approvalSecret()
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", approvalSecret()).update(payload).digest("base64url");
}

function encodeGrant(claims: ApprovalGrantClaims): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function decodeGrant(token: string): ApprovalGrantClaims {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new BookingPortError("Invalid approval grant", "VALIDATION_ERROR", 400);
  }
  const expected = signPayload(payload);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new BookingPortError(
      "Approval grant failed verification",
      "VALIDATION_ERROR",
      400
    );
  }
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  ) as ApprovalGrantClaims;
  if (Date.parse(claims.expiresAt) < Date.now()) {
    throw new BookingPortError("Approval grant has expired", "CONFLICT", 409);
  }
  return claims;
}

export function mintApprovalGrant(input: {
  action: ApprovalGrantClaims["action"];
  actor?: BookingActorRef;
  serial?: number;
  delegatedAgentAddress?: string;
  approvedBy: string;
  ttlSeconds?: number;
  source?: ApprovalGrantClaims["source"];
}): { grantToken: string; claims: ApprovalGrantClaims } {
  if (!input.approvedBy.trim()) {
    throw new BookingPortError("approvedBy is required", "VALIDATION_ERROR", 400);
  }
  const ttlSeconds = input.ttlSeconds ?? 15 * 60;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 60 * 60) {
    throw new BookingPortError(
      "ttlSeconds must be between 1 and 3600",
      "VALIDATION_ERROR",
      400
    );
  }
  const claims: ApprovalGrantClaims = {
    kind: "booked-rights-approval-grant",
    grantId: randomUUID(),
    action: input.action,
    actor: input.actor,
    serial: input.serial,
    ...(input.delegatedAgentAddress
      ? { delegatedAgentAddress: input.delegatedAgentAddress.trim() }
      : {}),
    approvedBy: input.approvedBy,
    approvedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    source: input.source ?? "agent_handoff",
  };
  return { grantToken: encodeGrant(claims), claims };
}

export function verifyApprovalGrant(token: string): ApprovalGrantClaims {
  return decodeGrant(token);
}

export function verifyApprovalGrantAdminSecret(req: Request): void {
  const header = req.headers.get("x-booked-rights-approval-secret");
  if (!header) {
    throw new BookingPortError(
      "Missing x-booked-rights-approval-secret",
      "VALIDATION_ERROR",
      400
    );
  }
  const expected = adminSecret();
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(header);
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new BookingPortError("Approval admin secret is invalid", "CONFLICT", 403);
  }
}
