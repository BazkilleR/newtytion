import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// One .env at the monorepo root, shared by the api, drizzle-kit and tests.
// Variables already in the environment (CI, the test DB url set in jest.config.js) take
// precedence: dotenv never overrides them. A missing file is fine (CI).
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
