import { defineConfig } from "drizzle-kit";

// Node 24 can load .env natively, no dotenv needed.
try {
  process.loadEnvFile("../../.env");
} catch {
  // In CI the variables come from the environment instead.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: validated by drizzle-kit at runtime
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
