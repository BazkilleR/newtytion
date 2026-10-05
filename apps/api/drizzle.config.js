import { defineConfig } from "drizzle-kit";

// Node 24 can load .env natively, no dotenv needed.
try {
  process.loadEnvFile("../../.env");
} catch {
  // In CI the variables come from the environment instead.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.js",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
