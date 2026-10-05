import { z } from "zod";
import { isoDateSchema } from "./common.js";

export const upsertBodyLogInputSchema = z.object({
  weightKg: z
    .number({ error: "Enter a number" })
    .min(20, "At least 20 kg")
    .max(400, "At most 400 kg"),
});

export const bodyLogDateParamsSchema = z.object({ date: isoDateSchema });

export const bodyLogRangeQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((q) => q.from <= q.to, { message: "`from` must be on or before `to`", path: ["from"] });

export const bodyLogSchema = z.object({
  logDate: isoDateSchema,
  weightKg: z.number(),
  /** 7-day trailing moving average (calendar window) */
  avgKg: z.number(),
});
