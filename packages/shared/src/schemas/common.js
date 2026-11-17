import { z } from "zod";

/** Calendar date in the user's local timezone, e.g. "2026-10-06". Never a timestamp. */
export const isoDateSchema = z.iso.date();

export const idSchema = z.uuid();

export const idParamsSchema = z.object({ id: idSchema });

/** Inclusive `from`..`to` range of local dates, as query params. */
export const dateRangeQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((q) => q.from <= q.to, { message: "`from` must be on or before `to`", path: ["from"] });

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
