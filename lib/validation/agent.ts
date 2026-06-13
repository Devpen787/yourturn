import { z } from "zod";

export const bookingActorRefSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("demoActor"),
    id: z.enum(["guestA", "guestB", "issuer"]),
  }),
  z.object({
    kind: z.literal("hederaAccount"),
    accountId: z.string().min(1),
  }),
]);

export const agentReadBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("listSlots") }),
  z.object({
    action: z.literal("getSlot"),
    serial: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("listHoldings"),
    holder: bookingActorRefSchema,
  }),
  z.object({
    action: z.literal("getListing"),
    serial: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("getLifecycle"),
    serial: z.number().int().positive(),
  }),
]);

export const agentPreviewBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("book"),
    buyer: bookingActorRefSchema,
    serial: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("create_listing"),
    seller: bookingActorRefSchema,
    serial: z.number().int().positive(),
    askPriceHbar: z.number().positive(),
  }),
  z.object({
    action: z.literal("buy_listing"),
    buyer: bookingActorRefSchema,
    serial: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("freeze"),
    issuer: bookingActorRefSchema,
    serial: z.number().int().positive(),
    holder: bookingActorRefSchema,
  }),
  z.object({
    action: z.literal("unfreeze"),
    issuer: bookingActorRefSchema,
    serial: z.number().int().positive(),
    holder: bookingActorRefSchema,
  }),
  z.object({
    action: z.literal("mark_used"),
    issuer: bookingActorRefSchema,
    serial: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("cancel_release"),
    holder: bookingActorRefSchema,
    serial: z.number().int().positive(),
  }),
]);

export const agentConfirmBodySchema = z.object({
  previewId: z.string().min(1),
  approvalGrant: z.string().min(1),
});

export const approvalGrantBodySchema = z.object({
  action: z.enum([
    "book",
    "create_listing",
    "buy_listing",
    "freeze",
    "unfreeze",
    "mark_used",
    "cancel_release",
    "any",
  ]),
  actor: bookingActorRefSchema.optional(),
  serial: z.number().int().positive().optional(),
  approvedBy: z.string().min(1),
  ttlSeconds: z.number().int().positive().max(3600).optional(),
  source: z.enum(["agent_handoff", "api_client"]).optional(),
});
