import "./src/load-env.js";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}

// Point the app's db client at the test database. Set before any test file
// loads src/env.js; dotenv never overrides it, and test workers inherit it.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

export default {
  // Native ES modules, no Babel (the test script runs Node with --experimental-vm-modules).
  transform: {},
  globalSetup: "./test/global-setup.js",
  setupFilesAfterEnv: ["./test/setup.js"],
  // Test files share one database and truncate it, so run them one at a time.
  maxWorkers: 1,
};
