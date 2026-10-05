// Runs inside every test file (vitest `setupFiles`).
import { afterAll, beforeEach } from "vitest";
import { pool } from "../src/db/client.js";
import { resetDb } from "./db.js";

beforeEach(resetDb);

afterAll(async () => {
  await pool.end();
});
