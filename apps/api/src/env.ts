import { z } from "zod";

// Validate env once at startup so a missing var crashes immediately with a
// clear message instead of failing on the first request.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

export const env = envSchema.parse(process.env);
