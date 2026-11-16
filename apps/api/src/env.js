// Must be the first import: populates process.env before it is parsed below.
import "./load-env.js";
import { z } from "zod";

// Validate env once at startup so a missing var crashes immediately with a
// clear message instead of failing on the first request.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
