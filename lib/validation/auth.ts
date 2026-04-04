import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export const loginBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export const demoLoginBodySchema = z.object({
  role: z.enum(["issuer", "guestA", "guestB"]),
});
