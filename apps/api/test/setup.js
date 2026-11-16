// Runs inside every test file (jest `setupFilesAfterEnv`).
import { afterAll, beforeEach } from "@jest/globals";
import { pool } from "../src/db/client.js";
import { resetDb } from "./db.js";

beforeEach(resetDb);

afterAll(async () => {
  await pool.end();
});
