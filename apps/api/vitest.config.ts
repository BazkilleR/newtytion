import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile("../../.env");
} catch {
  // CI provides env vars directly
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}

export default defineConfig({
  test: {
    // Point the app's db client at the test database.
    env: { NODE_ENV: "test", DATABASE_URL: process.env.TEST_DATABASE_URL },
    globalSetup: ["./test/global-setup.ts"],
    // Test files share one database and truncate it, so run them one at a time.
    fileParallelism: false,
  },
});
