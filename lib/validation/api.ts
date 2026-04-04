import { z } from "zod";

export const actorGuestSchema = z.object({
  actor: z.enum(["guestA", "guestB"]),
});

export const initResponseSchema = z.object({
  ok: z.literal(true),
  tokenId: z.string(),
  topicId: z.string(),
  createdToken: z.boolean(),
  createdTopic: z.boolean(),
});

export const mintSlotsBodySchema = z.object({
  reseed: z.boolean().optional().default(false),
});

export const associateBodySchema = z.object({
  actor: z.enum(["guestA", "guestB"]),
});

export const bookBodySchema = z.object({
  actor: z.enum(["guestA", "guestB"]),
  serial: z.number().int().positive(),
});

export const resaleListBodySchema = z.object({
  actor: z.enum(["guestA", "guestB"]),
  serial: z.number().int().positive(),
  /** Resale list price in USD; testnet transfer uses the same number as ℏ (demo 1:1). */
  askUsd: z.number().positive(),
});

export const resaleBuyBodySchema = z.object({
  actor: z.enum(["guestA", "guestB"]),
  serial: z.number().int().positive(),
});

export const freezeBodySchema = z.object({
  serial: z.number().int().positive(),
  /** Omit to freeze whoever Mirror reports holds this serial (Guest A or B only). */
  holderActor: z.enum(["guestA", "guestB"]).optional(),
});

export const unfreezeBodySchema = freezeBodySchema;

export const markUsedBodySchema = z.object({
  serial: z.number().int().positive(),
});

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  code: z.string(),
});

export type ApiFailure = z.infer<typeof apiErrorSchema>;

export function fail(
  error: string,
  code:
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "HEDERA_TX_ERROR"
    | "INTERNAL_ERROR"
): ApiFailure {
  return { ok: false, error, code };
}
