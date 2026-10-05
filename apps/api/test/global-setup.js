import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Bring the test database schema up to date once before the whole run. */
export async function setup() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
