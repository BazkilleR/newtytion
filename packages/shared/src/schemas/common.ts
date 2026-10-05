import { z } from "zod";

/** Calendar date in the user's local timezone, e.g. "2026-10-06". Never a timestamp. */
export const isoDateSchema = z.iso.date();
export type IsoDate = z.infer<typeof isoDateSchema>;

export const idSchema = z.uuid();

export const idParamsSchema = z.object({ id: idSchema });

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
