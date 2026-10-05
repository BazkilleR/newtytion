import { z } from "zod";
import { isoDateSchema } from "./common.ts";

export const upsertBodyLogInputSchema = z.object({
  weightKg: z.number().min(20).max(400),
});
export type UpsertBodyLogInput = z.infer<typeof upsertBodyLogInputSchema>;

export const bodyLogDateParamsSchema = z.object({ date: isoDateSchema });

export const bodyLogRangeQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});
export type BodyLogRangeQuery = z.infer<typeof bodyLogRangeQuerySchema>;

export const bodyLogSchema = z.object({
  logDate: isoDateSchema,
  weightKg: z.number(),
});
export type BodyLog = z.infer<typeof bodyLogSchema>;
