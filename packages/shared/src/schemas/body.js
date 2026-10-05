import { z } from "zod";
import { isoDateSchema } from "./common.js";

export const upsertBodyLogInputSchema = z.object({
  weightKg: z.number().min(20).max(400),
});

export const bodyLogDateParamsSchema = z.object({ date: isoDateSchema });

export const bodyLogRangeQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

export const bodyLogSchema = z.object({
  logDate: isoDateSchema,
  weightKg: z.number(),
});
